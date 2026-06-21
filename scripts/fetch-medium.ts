/**
 * Agrega o RSS do Medium em src/data/medium-posts.json.
 *
 * O RSS expõe só os ~10 posts mais recentes, então o catálogo histórico vem do
 * export oficial do Medium e este job apenas faz append dos itens novos,
 * deduplicando por URL — o arquivo é append-only.
 *
 * Falha de rede não derruba o build: preserva o JSON atual e sai com status 0.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { parseRss } from './lib/rss.js';
import { normalizeMediumItem, cleanMediumUrl, type MediumItem } from './lib/normalize.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = resolve(__dirname, '../src/data/medium-posts.json');

const MEDIUM_USER = process.env.MEDIUM_USER ?? 'hitoshyamamoto';
const FEED_URL = process.env.MEDIUM_FEED_URL ?? `https://medium.com/feed/@${MEDIUM_USER}`;

async function loadExisting(): Promise<MediumItem[]> {
  if (!existsSync(DATA_FILE)) return [];
  try {
    const raw = await readFile(DATA_FILE, 'utf-8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('[fetch-medium] JSON existente ilegível, começando vazio:', err);
    return [];
  }
}

async function main() {
  const existing = await loadExisting();
  const seen = new Set(existing.map((p) => cleanMediumUrl(p.url)));

  let fetched: MediumItem[] = [];
  try {
    console.log(`[fetch-medium] buscando feed: ${FEED_URL}`);
    const res = await fetch(FEED_URL, {
      headers: { 'User-Agent': 'hitoshiyamamoto.dev-fetcher/1.0' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const xml = await res.text();
    fetched = parseRss(xml).map(normalizeMediumItem).filter((p) => p.url && p.title);
  } catch (err) {
    console.warn('[fetch-medium] falha no fetch, preservando JSON atual:', err);
    process.exit(0); // último estado válido continua versionado
  }

  const novos = fetched.filter((p) => !seen.has(cleanMediumUrl(p.url)));
  if (novos.length === 0) {
    console.log('[fetch-medium] nenhum post novo. Nada a fazer.');
    return;
  }

  const merged = [...novos, ...existing].sort(
    (a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt),
  );

  await writeFile(DATA_FILE, JSON.stringify(merged, null, 2) + '\n', 'utf-8');
  console.log(`[fetch-medium] +${novos.length} post(s). Total: ${merged.length}.`);
  for (const p of novos) console.log(`  + ${p.publishedAt}  ${p.title}`);
}

main().catch((err) => {
  console.error('[fetch-medium] erro inesperado:', err);
  process.exit(1);
});
