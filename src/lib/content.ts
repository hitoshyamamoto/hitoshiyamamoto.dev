import { getCollection, type CollectionEntry } from 'astro:content';
import { defaultLocale, localeMeta, locales, path, type Locale } from '../i18n/ui';

/** Idiomas em que um post está disponível (para as tags do card). */
export interface PostLanguage {
  lang: Locale;
  label: string;
  href: string;
  current: boolean;
}

/** Item unificado do feed de Escritos (Medium + nativo). */
export type FeedItem =
  | {
      source: 'native';
      slug: string;
      title: string;
      summary: string;
      publishedAt: Date;
      tags: string[];
      kind: 'article' | 'interactive';
      href: string;
      external: false;
      languages: PostLanguage[];
    }
  | {
      source: 'medium';
      slug: string;
      title: string;
      summary: string;
      publishedAt: Date;
      tags: string[];
      href: string;
      external: true;
      languages: PostLanguage[];
    };

const isPublished = (e: CollectionEntry<'posts'>) => import.meta.env.DEV || !e.data.draft;

/** Posts nativos publicados de um idioma, ordenados por data desc. */
export async function getNativePosts(locale?: Locale): Promise<CollectionEntry<'posts'>[]> {
  const posts = await getCollection('posts', isPublished);
  return posts
    .filter((e) => !locale || e.data.lang === locale)
    .sort((a, b) => +b.data.publishedAt - +a.data.publishedAt);
}

/** Mapa translationKey → posts que a compartilham (todas as traduções). */
async function translationGroups(): Promise<Map<string, CollectionEntry<'posts'>[]>> {
  const posts = await getCollection('posts', isPublished);
  const groups = new Map<string, CollectionEntry<'posts'>[]>();
  for (const p of posts) {
    if (!p.data.translationKey) continue;
    const list = groups.get(p.data.translationKey) ?? [];
    list.push(p);
    groups.set(p.data.translationKey, list);
  }
  return groups;
}

/** Idiomas em que um post existe: sempre ao menos o próprio, mais as traduções. */
export async function getPostLanguages(
  post: CollectionEntry<'posts'>,
  current: Locale,
): Promise<PostLanguage[]> {
  const key = post.data.translationKey;
  const group = key ? ((await translationGroups()).get(key) ?? [post]) : [post];
  return group
    .map((p) => ({
      lang: p.data.lang,
      label: localeMeta[p.data.lang].short,
      href: path(p.data.lang, 'writing', p.id),
      current: p.data.lang === current,
    }))
    .sort((a, b) => locales.indexOf(a.lang) - locales.indexOf(b.lang));
}

/** Para o hreflang: idioma → caminho da tradução equivalente (inclui o próprio). */
export async function getPostAlternates(
  post: CollectionEntry<'posts'>,
): Promise<Partial<Record<Locale, string>>> {
  const self = { [post.data.lang]: path(post.data.lang, 'writing', post.id) };
  const key = post.data.translationKey;
  if (!key) return self;
  const group = (await translationGroups()).get(key) ?? [];
  return Object.fromEntries(group.map((p) => [p.data.lang, path(p.data.lang, 'writing', p.id)]));
}

/**
 * Funde posts nativos do idioma + agregado do Medium num feed único por data.
 * O Medium (em português) só entra no feed do idioma padrão.
 */
export async function getUnifiedFeed(locale: Locale = defaultLocale): Promise<FeedItem[]> {
  const native = await getNativePosts(locale);
  const groups = await translationGroups();

  const languagesOf = (e: CollectionEntry<'posts'>): PostLanguage[] => {
    const group = e.data.translationKey ? (groups.get(e.data.translationKey) ?? [e]) : [e];
    return group
      .map((p) => ({
        lang: p.data.lang,
        label: localeMeta[p.data.lang].short,
        href: path(p.data.lang, 'writing', p.id),
        current: p.data.lang === locale,
      }))
      .sort((a, b) => locales.indexOf(a.lang) - locales.indexOf(b.lang));
  };

  const nativeItems: FeedItem[] = native.map((e) => ({
    source: 'native',
    slug: e.id,
    title: e.data.title,
    summary: e.data.summary,
    publishedAt: e.data.publishedAt,
    tags: e.data.tags,
    kind: e.data.kind,
    href: path(locale, 'writing', e.id),
    external: false,
    languages: languagesOf(e),
  }));

  if (locale !== defaultLocale) return nativeItems;

  const medium = await getCollection('mediumPosts');
  const mediumItems: FeedItem[] = medium.map((e) => ({
    source: 'medium',
    slug: e.data.slug,
    title: e.data.title,
    summary: e.data.summary,
    publishedAt: e.data.publishedAt,
    tags: e.data.tags,
    href: e.data.url,
    external: true,
    languages: [{ lang: locale, label: localeMeta[locale].short, href: e.data.url, current: true }],
  }));

  return [...nativeItems, ...mediumItems].sort((a, b) => +b.publishedAt - +a.publishedAt);
}

/** Para o hreflang de um lab: idioma → caminho da tradução equivalente. */
export async function getLabAlternates(
  lab: CollectionEntry<'labs'>,
): Promise<Partial<Record<Locale, string>>> {
  const self = { [lab.data.lang]: path(lab.data.lang, 'labs', lab.id) };
  if (!lab.data.translationKey) return self;
  const labs = await getCollection('labs');
  const group = labs.filter((l) => l.data.translationKey === lab.data.translationKey);
  return Object.fromEntries(group.map((l) => [l.data.lang, path(l.data.lang, 'labs', l.id)]));
}

/** Metadados vivos do GitHub, indexados por slug de repo. */
export interface GithubMeta {
  repo: string;
  url: string;
  language: string | null;
  stars: number;
  lastCommit: string | null;
  license: string | null;
}

let _githubCache: Map<string, GithubMeta> | null = null;

/** Lê github-projects.json (artefato do fetcher) e indexa por repo. */
export async function getGithubMeta(): Promise<Map<string, GithubMeta>> {
  if (_githubCache) return _githubCache;
  const data = (await import('../data/github-projects.json')).default as GithubMeta[];
  _githubCache = new Map(data.map((d) => [d.repo, d]));
  return _githubCache;
}
