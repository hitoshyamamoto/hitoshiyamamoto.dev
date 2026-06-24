/** Metadata, Open Graph e formatação compartilhadas pelos layouts. */

export const SITE = {
  name: 'Hitoshi Yamamoto',
  title: 'Hitoshi Yamamoto: escritos, projetos e labs',
  description:
    'Hub pessoal de Hitoshi Yamamoto: artigos, projetos de engenharia e demos interativos.',
  url: 'https://hitoshyamamoto.github.io',
  locale: 'pt_BR',
  author: '@hitoshyamamoto',
  defaultOg: '/og/default.svg', // substituir por geração de OG por página
} as const;

export interface SeoInput {
  title?: string;
  description?: string;
  image?: string;
  type?: 'website' | 'article';
  publishedAt?: Date;
  canonical?: string;
}

export interface SeoTags {
  title: string;
  description: string;
  image: string;
  type: 'website' | 'article';
  canonical: string;
  publishedAt?: string;
}

/** Resolve uma URL absoluta a partir de um caminho relativo. */
export function absoluteUrl(path: string, base: string = SITE.url): string {
  try {
    return new URL(path, base).toString();
  } catch {
    return path;
  }
}

/** Constrói as tags de SEO para um <head>. */
export function buildSeo(input: SeoInput = {}): SeoTags {
  const title = input.title ? `${input.title}: ${SITE.name}` : SITE.title;
  return {
    title,
    description: input.description ?? SITE.description,
    image: absoluteUrl(input.image ?? SITE.defaultOg),
    type: input.type ?? 'website',
    canonical: input.canonical ?? SITE.url,
    publishedAt: input.publishedAt?.toISOString(),
  };
}

/** Formata uma data para exibição em pt-BR (ex.: "18 jun 2026"). */
export function formatDate(date: Date, lang: 'pt' | 'en' = 'pt'): string {
  return new Intl.DateTimeFormat(lang === 'pt' ? 'pt-BR' : 'en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}
