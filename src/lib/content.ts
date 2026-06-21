import { getCollection, type CollectionEntry } from 'astro:content';

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
    };

const isPublished = (e: CollectionEntry<'posts'>) =>
  import.meta.env.DEV || !e.data.draft;

/** Posts nativos publicados, ordenados por data desc. */
export async function getNativePosts(): Promise<CollectionEntry<'posts'>[]> {
  const posts = await getCollection('posts', isPublished);
  return posts.sort((a, b) => +b.data.publishedAt - +a.data.publishedAt);
}

/** Funde posts nativos e o agregado do Medium num feed único por data. */
export async function getUnifiedFeed(): Promise<FeedItem[]> {
  const [native, medium] = await Promise.all([
    getNativePosts(),
    getCollection('mediumPosts'),
  ]);

  const nativeItems: FeedItem[] = native.map((e) => ({
    source: 'native',
    slug: e.id,
    title: e.data.title,
    summary: e.data.summary,
    publishedAt: e.data.publishedAt,
    tags: e.data.tags,
    kind: e.data.kind,
    href: `/escritos/${e.id}`,
    external: false,
  }));

  const mediumItems: FeedItem[] = medium.map((e) => ({
    source: 'medium',
    slug: e.data.slug,
    title: e.data.title,
    summary: e.data.summary,
    publishedAt: e.data.publishedAt,
    tags: e.data.tags,
    href: e.data.url,
    external: true,
  }));

  return [...nativeItems, ...mediumItems].sort(
    (a, b) => +b.publishedAt - +a.publishedAt,
  );
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
  // Import direto do artefato versionado — sempre o último estado válido.
  const data = (await import('../data/github-projects.json')).default as GithubMeta[];
  _githubCache = new Map(data.map((d) => [d.repo, d]));
  return _githubCache;
}
