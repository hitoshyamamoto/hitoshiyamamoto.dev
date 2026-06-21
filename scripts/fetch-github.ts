/**
 * Enriquece os repositórios da allowlist com metadados vivos do GitHub.
 *
 * A pasta src/content/projects/ é a fonte da verdade: lemos o campo `repo` de
 * cada projeto e consultamos a API só desses — controle total, poucas chamadas.
 * GITHUB_TOKEN eleva o rate limit para 5.000 req/h no Actions.
 *
 * Repo inacessível (404, rate limit) mantém o metadado anterior do JSON.
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECTS_DIR = resolve(__dirname, '../src/content/projects');
const DATA_FILE = resolve(__dirname, '../src/data/github-projects.json');

const OWNER = process.env.GITHUB_OWNER ?? 'hitoshyamamoto';
const TOKEN = process.env.GITHUB_TOKEN ?? '';

interface GithubProject {
  id: string;
  repo: string;
  url: string;
  language: string | null;
  stars: number;
  lastCommit: string | null;
  license: string | null;
}

/** Lê o frontmatter dos arquivos de projeto e extrai o campo `repo`. */
async function readCuratedRepos(): Promise<string[]> {
  if (!existsSync(PROJECTS_DIR)) return [];
  const files = (await readdir(PROJECTS_DIR)).filter((f) => /\.mdx?$/.test(f));
  const repos = new Set<string>();
  for (const f of files) {
    const raw = await readFile(join(PROJECTS_DIR, f), 'utf-8');
    const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fm) continue;
    const m = fm[1].match(/^\s*repo:\s*["']?([^"'\n]+)["']?\s*$/m);
    if (m) repos.add(m[1].trim());
  }
  return [...repos];
}

async function loadExisting(): Promise<GithubProject[]> {
  if (!existsSync(DATA_FILE)) return [];
  try {
    return JSON.parse(await readFile(DATA_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

async function gh(path: string): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'hitoshiyamamoto.dev-fetcher/1.0',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  return fetch(`https://api.github.com${path}`, { headers });
}

async function enrich(repo: string): Promise<GithubProject | null> {
  try {
    const res = await gh(`/repos/${OWNER}/${repo}`);
    if (!res.ok) {
      console.warn(`[fetch-github] ${repo}: HTTP ${res.status}`);
      return null;
    }
    const data: any = await res.json();

    // último commit do branch default
    let lastCommit: string | null = data.pushed_at?.slice(0, 10) ?? null;
    try {
      const commits = await gh(`/repos/${OWNER}/${repo}/commits?per_page=1`);
      if (commits.ok) {
        const arr: any = await commits.json();
        const date = arr?.[0]?.commit?.committer?.date ?? arr?.[0]?.commit?.author?.date;
        if (date) lastCommit = String(date).slice(0, 10);
      }
    } catch {
      /* mantém pushed_at */
    }

    return {
      id: repo,
      repo,
      url: data.html_url ?? `https://github.com/${OWNER}/${repo}`,
      language: data.language ?? null,
      stars: data.stargazers_count ?? 0,
      lastCommit,
      license: data.license?.spdx_id ?? data.license?.key ?? null,
    };
  } catch (err) {
    console.warn(`[fetch-github] ${repo}: erro`, err);
    return null;
  }
}

async function main() {
  const repos = await readCuratedRepos();
  if (repos.length === 0) {
    console.log('[fetch-github] nenhum projeto curado encontrado. Nada a fazer.');
    return;
  }
  console.log(`[fetch-github] repos curados: ${repos.join(', ')}`);
  if (!TOKEN) console.warn('[fetch-github] sem GITHUB_TOKEN: sujeito a rate limit baixo.');

  const existing = await loadExisting();
  const byRepo = new Map(existing.map((p) => [p.repo, p]));

  for (const repo of repos) {
    const fresh = await enrich(repo);
    if (fresh) {
      byRepo.set(repo, fresh);
      console.log(`  ✓ ${repo}  ${fresh.language ?? '-'}  ★${fresh.stars}  ${fresh.lastCommit ?? '-'}`);
    } else if (byRepo.has(repo)) {
      console.log(`  ↺ ${repo}: mantendo metadados anteriores`);
    }
  }

  // Mantém apenas os repos que ainda estão na allowlist.
  const out = repos.map((r) => byRepo.get(r)).filter(Boolean) as GithubProject[];
  await writeFile(DATA_FILE, JSON.stringify(out, null, 2) + '\n', 'utf-8');
  console.log(`[fetch-github] gravado: ${out.length} repo(s).`);
}

main().catch((err) => {
  console.error('[fetch-github] erro inesperado:', err);
  process.exit(1);
});
