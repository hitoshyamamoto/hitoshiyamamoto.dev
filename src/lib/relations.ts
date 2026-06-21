import { getCollection, type CollectionEntry } from 'astro:content';

/**
 * Resolve, em tempo de build, o grafo bidirecional entre projeto, lab e writeup.
 * As arestas são declaradas por slug no frontmatter e cruzadas aqui.
 */

export interface ProjectRelations {
  /** Lab vinculado (via project.demo OU lab.relatedProject). */
  lab?: CollectionEntry<'labs'>;
  /** Escrito nativo que descreve o projeto (writeup). */
  writeup?: CollectionEntry<'posts'>;
}

/** Para um projeto, encontra o lab e o writeup relacionados. */
export async function getProjectRelations(
  project: CollectionEntry<'projects'>,
): Promise<ProjectRelations> {
  const [labs, posts] = await Promise.all([
    getCollection('labs'),
    getCollection('posts'),
  ]);

  // Lab: pelo campo explícito demo, ou por relatedProject apontando de volta.
  const lab =
    (project.data.demo ? labs.find((l) => l.id === project.data.demo) : undefined) ??
    labs.find((l) => l.data.relatedProject === project.id);

  // Writeup: campo explícito writeup, ou um post com project: <slug>.
  const writeup =
    (project.data.writeup
      ? posts.find((p) => p.id === project.data.writeup)
      : undefined) ?? posts.find((p) => p.data.project === project.id);

  return { lab, writeup };
}

/** Para um writeup (post com `project`), devolve o projeto descrito. */
export async function getWriteupProject(
  post: CollectionEntry<'posts'>,
): Promise<CollectionEntry<'projects'> | undefined> {
  if (!post.data.project) return undefined;
  const projects = await getCollection('projects');
  return projects.find((p) => p.id === post.data.project);
}

/** Para um lab, devolve o projeto relacionado (se houver). */
export async function getLabProject(
  lab: CollectionEntry<'labs'>,
): Promise<CollectionEntry<'projects'> | undefined> {
  const slug = lab.data.relatedProject ?? lab.data.repo;
  if (!slug) return undefined;
  const projects = await getCollection('projects');
  return (
    projects.find((p) => p.id === slug) ??
    projects.find((p) => p.data.repo === lab.data.repo)
  );
}
