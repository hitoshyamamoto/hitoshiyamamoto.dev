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
    repo: z.string(),
    title: z.string(),
    summary: z.string(),
    highlight: z.boolean().default(false),
    demo: z.string().optional(),
    writeup: z.string().optional(),
    tags: z.array(z.string()).default([]),
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
  }),
});

export const collections = { posts, mediumPosts, projects, labs };
