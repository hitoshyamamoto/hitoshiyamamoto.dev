import { getCollection, type CollectionEntry } from 'astro:content';
import { defaultLocale, localeMeta, locales, path, type Locale } from '../i18n/ui';
import type { PostLanguage } from './content';

/**
 * Resolve, em tempo de build, o grafo bidirecional entre projeto, lab e writeup.
 * Projetos são identificados pela `translationKey` (idioma-neutra); cada relação é
 * resolvida para a tradução do idioma corrente.
 */

export interface ProjectRelations {
  lab?: CollectionEntry<'labs'>;
  writeup?: CollectionEntry<'posts'>;
}

/** Para um projeto, encontra o lab e o writeup relacionados no idioma pedido. */
export async function getProjectRelations(
  project: CollectionEntry<'projects'>,
  locale: Locale = defaultLocale,
): Promise<ProjectRelations> {
  const [labs, posts] = await Promise.all([getCollection('labs'), getCollection('posts')]);
  const key = project.data.translationKey;

  // Lab apontado pelo projeto (demo = slug do lab), resolvido para o idioma corrente.
  const demoLab =
    (project.data.demo ? labs.find((l) => l.id === project.data.demo) : undefined) ??
    labs.find((l) => l.data.relatedProject === key);
  const lab = demoLab?.data.translationKey
    ? (labs.find((l) => l.data.translationKey === demoLab.data.translationKey && l.data.lang === locale) ?? demoLab)
    : demoLab;

  // Writeup: post cujo `project` aponta para esta translationKey, no idioma pedido.
  const writeups = posts.filter((p) => p.id === project.data.writeup || p.data.project === key);
  const writeup = writeups.find((p) => p.data.lang === locale) ?? writeups[0];

  return { lab, writeup };
}

/** Idiomas em que um projeto existe: o próprio mais as traduções que compartilham a translationKey. */
export async function getProjectLanguages(
  project: CollectionEntry<'projects'>,
  current: Locale,
): Promise<PostLanguage[]> {
  const projects = await getCollection('projects');
  const group = projects.filter((p) => p.data.translationKey === project.data.translationKey);
  return group
    .map((p) => ({
      lang: p.data.lang,
      label: localeMeta[p.data.lang].short,
      href: path(p.data.lang, 'projects', p.data.translationKey),
      current: p.data.lang === current,
    }))
    .sort((a, b) => locales.indexOf(a.lang) - locales.indexOf(b.lang));
}

/** Para um writeup (post com `project`), devolve o projeto descrito, no idioma do post. */
export async function getWriteupProject(
  post: CollectionEntry<'posts'>,
): Promise<CollectionEntry<'projects'> | undefined> {
  if (!post.data.project) return undefined;
  const projects = await getCollection('projects');
  const matches = projects.filter((p) => p.data.translationKey === post.data.project);
  return matches.find((p) => p.data.lang === post.data.lang) ?? matches[0];
}

/** Para um lab, devolve o projeto relacionado (se houver), no idioma do lab. */
export async function getLabProject(
  lab: CollectionEntry<'labs'>,
): Promise<CollectionEntry<'projects'> | undefined> {
  const key = lab.data.relatedProject;
  if (!key) return undefined;
  const projects = await getCollection('projects');
  const matches = projects.filter((p) => p.data.translationKey === key);
  return matches.find((p) => p.data.lang === lab.data.lang) ?? matches[0];
}
