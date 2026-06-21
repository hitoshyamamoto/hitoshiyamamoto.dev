/**
 * Normalização para o schema unificado dos artefatos JSON.
 */

/** Converte um título em slug estável e seguro para URL. */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove acentos (combining marks)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Remove HTML e normaliza espaços; corta para um resumo curto. */
export function toSummary(html: string, max = 200): string {
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= max) return text;
  return text.slice(0, max).replace(/\s+\S*$/, '') + '…';
}

/** Normaliza uma data para YYYY-MM-DD. */
export function toDateString(input: string | number | Date): string {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export interface MediumItem {
  id: string;
  source: 'medium';
  title: string;
  slug: string;
  url: string;
  publishedAt: string;
  summary: string;
  tags: string[];
}

export interface RawRssItem {
  title: string;
  link: string;
  pubDate: string;
  description?: string;
  contentEncoded?: string;
  categories?: string[];
}

/** Normaliza um item bruto de RSS para o schema do medium-posts.json. */
export function normalizeMediumItem(raw: RawRssItem): MediumItem {
  const slug = slugify(raw.title);
  // O RSS do Medium costuma deixar `description` vazio e o corpo em
  // `content:encoded`. Usa o que tiver conteúdo, nessa ordem.
  const body = firstNonEmpty(raw.description, raw.contentEncoded);
  return {
    id: slug,
    source: 'medium',
    title: raw.title.trim(),
    slug,
    url: cleanMediumUrl(raw.link),
    publishedAt: toDateString(raw.pubDate),
    summary: toSummary(body),
    tags: (raw.categories ?? []).map((t) => t.toLowerCase().trim()).filter(Boolean),
  };
}

function firstNonEmpty(...vals: (string | undefined)[]): string {
  for (const v of vals) {
    if (v && v.trim()) return v;
  }
  return '';
}

/** Remove parâmetros de tracking da URL do Medium para deduplicar melhor. */
export function cleanMediumUrl(url: string): string {
  try {
    const u = new URL(url);
    u.search = '';
    u.hash = '';
    return u.toString();
  } catch {
    return url.split('?')[0];
  }
}
