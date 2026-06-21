import { XMLParser } from 'fast-xml-parser';
import type { RawRssItem } from './normalize.js';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  cdataPropName: '__cdata',
  textNodeName: '#text',
  trimValues: true,
});

/** Extrai o valor textual de um nó que pode vir como string, CDATA ou objeto. */
function textOf(node: unknown): string {
  if (node == null) return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (typeof node === 'object') {
    const o = node as Record<string, unknown>;
    if (typeof o.__cdata === 'string') return o.__cdata;
    if (typeof o['#text'] === 'string') return o['#text'];
  }
  return '';
}

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

/**
 * Faz parsing de um documento RSS 2.0 (formato do Medium) e devolve os itens
 * brutos prontos para normalização.
 */
export function parseRss(xml: string): RawRssItem[] {
  const doc = parser.parse(xml);
  const channel = doc?.rss?.channel;
  if (!channel) return [];

  return asArray(channel.item).map((item: Record<string, unknown>) => {
    const categories = asArray(item.category).map(textOf).filter(Boolean);
    return {
      title: textOf(item.title),
      link: textOf(item.link),
      pubDate: textOf(item.pubDate),
      description: textOf(item.description),
      contentEncoded: textOf(item['content:encoded']),
      categories,
    } satisfies RawRssItem;
  });
}
