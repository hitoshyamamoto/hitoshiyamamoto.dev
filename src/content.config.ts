import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

// Escritos nativos em MDX. `kind: interactive` habilita islands embutidas no
// corpo; `project` aponta para o projeto que o post documenta (writeup).
const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    publishedAt: z.coerce.date(),
    summary: z.string(),
    tags: z.array(z.string()).default([]),
    kind: z.enum(['article', 'interactive']).default('article'),
    project: z.string().optional(),
    draft: z.boolean().default(false),
    lang: z.enum(['pt', 'en']).default('pt'),
    // Chave compartilhada entre traduções do mesmo post (liga PT ↔ EN).
    translationKey: z.string().optional(),
  }),
});

// Artefato append-only gerado por scripts/fetch-medium.ts. O build lê este JSON;
// nunca chama a API do Medium.
const mediumPosts = defineCollection({
  loader: file('src/data/medium-posts.json'),
  schema: z.object({
    source: z.literal('medium'),
    title: z.string(),
    slug: z.string(),
    url: z.string().url(),
    publishedAt: z.coerce.date(),
    summary: z.string(),
    tags: z.array(z.string()).default([]),
  }),
});

// Allowlist curada à mão. `repo` é a chave que cruza com github-projects.json.
const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: z.object({
    // `repo` opcional: um projeto pode existir sem repositório público (sem
    // metadados do GitHub e sem botão "Ver código").
    repo: z.string().optional(),
    title: z.string(),
    summary: z.string(),
    highlight: z.boolean().default(false),
    demo: z.string().optional(),
    writeup: z.string().optional(),
    tags: z.array(z.string()).default([]),
    lang: z.enum(['pt', 'en']).default('pt'),
    // Chave estável e idioma-neutra; é o slug público (/projetos/<translationKey>)
    // e liga as traduções PT ↔ EN. Referenciada por posts (project) e labs.
    translationKey: z.string(),
  }),
});

// Manifestos dos demos. Sem `embedUrl` o demo é uma island local (ver
// LOCAL_ISLANDS em pages/labs/[slug].astro).
const labs = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/labs' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    kind: z.enum(['static', 'wasm', 'hosted', 'realtime']),
    embedUrl: z.string().url().optional(),
    poster: z.string(),
    repo: z.string().optional(),
    relatedProject: z.string().optional(),
    status: z.enum(['live', 'wip']).default('live'),
    lang: z.enum(['pt', 'en']).default('pt'),
    // Chave estável compartilhada entre traduções (liga PT ↔ EN e seleciona a island).
    translationKey: z.string().optional(),
  }),
});

export const collections = { posts, mediumPosts, projects, labs };
