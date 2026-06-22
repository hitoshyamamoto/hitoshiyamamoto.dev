import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Compara algoritmos de busca sobre um mesmo labirinto, inteiramente no cliente.
 *
 * Três geradores (recursive backtracker, Prim, Kruskal) e cinco solvers (BFS, DFS,
 * Dijkstra, A* com heurística de Manhattan e greedy best-first). O solver escolhido
 * é animado no canvas; a tabela abaixo roda todos no mesmo labirinto e mede nós
 * explorados, tamanho do caminho e eficiência. Cores vindas dos tokens do tema.
 */

type Cell = { walls: [boolean, boolean, boolean, boolean] }; // N,E,S,W
type Grid = { cols: number; rows: number; cells: Cell[] };
type Solver = 'bfs' | 'dfs' | 'dijkstra' | 'astar' | 'greedy';
type GenAlgo = 'backtracker' | 'prim' | 'kruskal';

const SOLVERS: { id: Solver; label: string }[] = [
  { id: 'bfs', label: 'BFS' },
  { id: 'dfs', label: 'DFS' },
  { id: 'dijkstra', label: 'Dijkstra' },
  { id: 'astar', label: 'A*' },
  { id: 'greedy', label: 'Greedy' },
];

const GENS: { id: GenAlgo; label: string }[] = [
  { id: 'backtracker', label: 'Backtracker' },
  { id: 'prim', label: 'Prim' },
  { id: 'kruskal', label: 'Kruskal' },
];

const idx = (g: Grid, x: number, y: number) => y * g.cols + x;

const DIRS: [number, number, number, number][] = [
  [0, -1, 0, 2], // N (remove parede 0 aqui, 2 no vizinho)
  [1, 0, 1, 3], // E
  [0, 1, 2, 0], // S
  [-1, 0, 3, 1], // W
];

// Gerador congruente linear (determinístico por seed).
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function emptyGrid(cols: number, rows: number): Grid {
  return { cols, rows, cells: Array.from({ length: cols * rows }, () => ({ walls: [true, true, true, true] })) };
}

// ---- Geradores: cada um produz um labirinto perfeito (uma única solução) ------
function generateBacktracker(cols: number, rows: number, seed: number): Grid {
  const g = emptyGrid(cols, rows);
  const rng = makeRng(seed);
  const visited = new Array(cols * rows).fill(false);
  const stack: number[] = [0];
  visited[0] = true;

  while (stack.length) {
    const cur = stack[stack.length - 1];
    const cx = cur % cols;
    const cy = Math.floor(cur / cols);
    const options = DIRS.filter(([dx, dy]) => {
      const nx = cx + dx;
      const ny = cy + dy;
      return nx >= 0 && nx < cols && ny >= 0 && ny < rows && !visited[idx(g, nx, ny)];
    });
    if (options.length === 0) {
      stack.pop();
      continue;
    }
    const [dx, dy, w, nw] = options[Math.floor(rng() * options.length)];
    const next = idx(g, cx + dx, cy + dy);
    g.cells[cur].walls[w] = false;
    g.cells[next].walls[nw] = false;
    visited[next] = true;
    stack.push(next);
  }
  return g;
}

function generatePrim(cols: number, rows: number, seed: number): Grid {
  const g = emptyGrid(cols, rows);
  const rng = makeRng(seed);
  const visited = new Array(cols * rows).fill(false);
  const frontier: { a: number; b: number; w: number; nw: number }[] = [];

  const addEdges = (cell: number) => {
    const cx = cell % cols;
    const cy = Math.floor(cell / cols);
    for (const [dx, dy, w, nw] of DIRS) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
        const b = idx(g, nx, ny);
        if (!visited[b]) frontier.push({ a: cell, b, w, nw });
      }
    }
  };

  visited[0] = true;
  addEdges(0);
  while (frontier.length) {
    const { a, b, w, nw } = frontier.splice(Math.floor(rng() * frontier.length), 1)[0];
    if (visited[b]) continue;
    g.cells[a].walls[w] = false;
    g.cells[b].walls[nw] = false;
    visited[b] = true;
    addEdges(b);
  }
  return g;
}

function generateKruskal(cols: number, rows: number, seed: number): Grid {
  const g = emptyGrid(cols, rows);
  const rng = makeRng(seed);
  const parent = Array.from({ length: cols * rows }, (_, i) => i);
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };

  const edges: { a: number; b: number; w: number; nw: number }[] = [];
  for (let i = 0; i < cols * rows; i++) {
    const x = i % cols;
    const y = Math.floor(i / cols);
    if (x < cols - 1) edges.push({ a: i, b: i + 1, w: 1, nw: 3 }); // leste
    if (y < rows - 1) edges.push({ a: i, b: i + cols, w: 2, nw: 0 }); // sul
  }
  for (let i = edges.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [edges[i], edges[j]] = [edges[j], edges[i]];
  }
  for (const { a, b, w, nw } of edges) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) {
      g.cells[a].walls[w] = false;
      g.cells[b].walls[nw] = false;
      parent[ra] = rb;
    }
  }
  return g;
}

function generate(cols: number, rows: number, seed: number, algo: GenAlgo): Grid {
  if (algo === 'prim') return generatePrim(cols, rows, seed);
  if (algo === 'kruskal') return generateKruskal(cols, rows, seed);
  return generateBacktracker(cols, rows, seed);
}

function neighbors(g: Grid, n: number): number[] {
  const x = n % g.cols;
  const y = Math.floor(n / g.cols);
  const w = g.cells[n].walls;
  const out: number[] = [];
  if (!w[0] && y > 0) out.push(idx(g, x, y - 1));
  if (!w[1] && x < g.cols - 1) out.push(idx(g, x + 1, y));
  if (!w[2] && y < g.rows - 1) out.push(idx(g, x, y + 1));
  if (!w[3] && x > 0) out.push(idx(g, x - 1, y));
  return out;
}

// ---- Solvers: devolvem ordem de exploração + caminho final -------------------
interface SolveResult {
  order: number[];
  path: number[];
}

function manhattan(g: Grid, a: number, b: number) {
  return Math.abs((a % g.cols) - (b % g.cols)) + Math.abs(Math.floor(a / g.cols) - Math.floor(b / g.cols));
}

function reconstruct(prev: Map<number, number>, goal: number): number[] {
  const path = [goal];
  let c = goal;
  while (prev.has(c)) {
    c = prev.get(c)!;
    path.push(c);
  }
  return path.reverse();
}

function solve(g: Grid, kind: Solver, start: number, goal: number): SolveResult {
  const order: number[] = [];
  const prev = new Map<number, number>();
  const seen = new Set<number>([start]);

  if (kind === 'bfs' || kind === 'dfs') {
    const frontier: number[] = [start];
    while (frontier.length) {
      const cur = kind === 'bfs' ? frontier.shift()! : frontier.pop()!;
      order.push(cur);
      if (cur === goal) break;
      for (const nb of neighbors(g, cur)) {
        if (!seen.has(nb)) {
          seen.add(nb);
          prev.set(nb, cur);
          frontier.push(nb);
        }
      }
    }
    return { order, path: reconstruct(prev, goal) };
  }

  const gCost = new Map<number, number>([[start, 0]]);
  const pq: { n: number; f: number }[] = [{ n: start, f: 0 }];
  const h = (n: number) => (kind === 'dijkstra' ? 0 : manhattan(g, n, goal));

  while (pq.length) {
    pq.sort((a, b) => a.f - b.f);
    const { n: cur } = pq.shift()!;
    order.push(cur);
    if (cur === goal) break;
    for (const nb of neighbors(g, cur)) {
      const tentative = (gCost.get(cur) ?? Infinity) + 1;
      if (tentative < (gCost.get(nb) ?? Infinity)) {
        prev.set(nb, cur);
        gCost.set(nb, tentative);
        pq.push({ n: nb, f: kind === 'greedy' ? h(nb) : tentative + h(nb) });
      }
    }
  }
  return { order, path: reconstruct(prev, goal) };
}

// ---- Componente --------------------------------------------------------------
const COLS = 20;
const ROWS = 14;
const SIZE = 22;

const STR = {
  pt: { gen: 'Geração', algo: 'Algoritmo', newMaze: '↻ Novo labirinto', th: 'Algoritmo', explored: 'Explorados', path: 'Caminho', eff: 'Eficiência', legStart: 'início', legGoal: 'saída', legExplored: 'explorado', legPath: 'caminho' },
  en: { gen: 'Generation', algo: 'Algorithm', newMaze: '↻ New maze', th: 'Algorithm', explored: 'Explored', path: 'Path', eff: 'Efficiency', legStart: 'start', legGoal: 'goal', legExplored: 'explored', legPath: 'path' },
};

export default function MazeVisualizer({ lang = 'pt' }: { lang?: 'pt' | 'en' }) {
  const t = STR[lang];
  const [seed, setSeed] = useState(7);
  const [solver, setSolver] = useState<Solver>('astar');
  const [gen, setGen] = useState<GenAlgo>('backtracker');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const reduced = usePrefersReducedMotion();

  const grid = useMemo(() => generate(COLS, ROWS, seed, gen), [seed, gen]);
  const start = 0;
  const goal = COLS * ROWS - 1;
  const result = useMemo(() => solve(grid, solver, start, goal), [grid, solver]);

  // Roda todos os solvers no MESMO labirinto para a tabela comparativa.
  const comparison = useMemo(
    () =>
      SOLVERS.map((s) => {
        const r = solve(grid, s.id, start, goal);
        return {
          id: s.id,
          label: s.label,
          explored: r.order.length,
          pathLen: r.path.length,
          eff: Math.round((r.path.length / r.order.length) * 100),
        };
      }),
    [grid],
  );

  const draw = useCallback(
    (exploredUpTo: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      // Cores lidas dos tokens do tema atual (light, dark e coffee).
      const css = getComputedStyle(document.documentElement);
      const triplet = (name: string, fb: string) => css.getPropertyValue(name).trim() || fb;
      const rgb = (name: string, fb: string) => `rgb(${triplet(name, fb)})`;
      const bg = rgb('--bg', '250 250 249');
      const wall = rgb('--muted', '120 113 108');
      const accent = rgb('--accent', '13 148 136');
      const [ar, ag, ab] = triplet('--accent', '13 148 136').split(/\s+/);

      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = `rgba(${ar},${ag},${ab},0.16)`;
      for (let i = 0; i < exploredUpTo && i < result.order.length; i++) {
        const n = result.order[i];
        ctx.fillRect((n % COLS) * SIZE, Math.floor(n / COLS) * SIZE, SIZE, SIZE);
      }

      if (exploredUpTo >= result.order.length) {
        ctx.fillStyle = accent;
        for (const n of result.path) {
          ctx.fillRect((n % COLS) * SIZE + SIZE * 0.3, Math.floor(n / COLS) * SIZE + SIZE * 0.3, SIZE * 0.4, SIZE * 0.4);
        }
      }

      ctx.fillStyle = '#10b981';
      ctx.fillRect(2, 2, SIZE - 4, SIZE - 4);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect((goal % COLS) * SIZE + 2, Math.floor(goal / COLS) * SIZE + 2, SIZE - 4, SIZE - 4);

      ctx.strokeStyle = wall;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < grid.cells.length; i++) {
        const x = (i % COLS) * SIZE;
        const y = Math.floor(i / COLS) * SIZE;
        const w = grid.cells[i].walls;
        if (w[0]) line(ctx, x, y, x + SIZE, y);
        if (w[1]) line(ctx, x + SIZE, y, x + SIZE, y + SIZE);
        if (w[2]) line(ctx, x, y + SIZE, x + SIZE, y + SIZE);
        if (w[3]) line(ctx, x, y, x, y + SIZE);
      }
      ctx.stroke();
    },
    [grid, result, goal],
  );

  // Animação da exploração (ou desenho instantâneo se reduced-motion).
  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (reduced) {
      draw(result.order.length);
      return;
    }
    let step = 0;
    const total = result.order.length;
    const tick = () => {
      step += Math.max(1, Math.floor(total / 90));
      draw(step);
      if (step < total) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        draw(total);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [draw, result, reduced]);

  // Recolore o canvas quando o tema muda (as cores vêm dos tokens CSS).
  useEffect(() => {
    const obs = new MutationObserver(() => draw(result.order.length));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, [draw, result]);

  return (
    <div className="not-prose rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">{t.gen}:</span>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={t.gen}>
          {GENS.map((gn) => (
            <button
              key={gn.id}
              type="button"
              onClick={() => setGen(gn.id)}
              aria-pressed={gen === gn.id}
              className={`rounded-md border px-2.5 py-1 text-sm transition-colors ${
                gen === gn.id ? 'border-accent text-accent' : 'border-border text-muted hover:border-accent/50'
              }`}
            >
              {gn.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setSeed((s) => s + 1)} className="btn ml-auto">
          {t.newMaze}
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label={t.algo}>
        {SOLVERS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSolver(s.id)}
            aria-pressed={solver === s.id}
            className={`rounded-md border px-2.5 py-1 text-sm transition-colors ${
              solver === s.id ? 'border-accent text-accent' : 'border-border text-muted hover:border-accent/50'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <canvas
        ref={canvasRef}
        width={COLS * SIZE}
        height={ROWS * SIZE}
        className="mx-auto block max-w-full rounded-lg"
        aria-label={`${solver}: ${result.order.length} ${t.explored}, ${result.path.length} ${t.path}.`}
      />

      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted">
        <Legend swatch="bg-emerald-500" label={t.legStart} />
        <Legend swatch="bg-red-500" label={t.legGoal} />
        <Legend swatch="bg-accent/30" label={t.legExplored} />
        <Legend swatch="bg-accent" label={t.legPath} />
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted">
              <th className="py-1 text-left font-medium">{t.th}</th>
              <th className="py-1 text-right font-medium">{t.explored}</th>
              <th className="py-1 text-right font-medium">{t.path}</th>
              <th className="py-1 text-right font-medium">{t.eff}</th>
            </tr>
          </thead>
          <tbody>
            {comparison.map((c) => {
              const active = c.id === solver;
              return (
                <tr
                  key={c.id}
                  onClick={() => setSolver(c.id)}
                  className={`cursor-pointer border-t border-border transition-colors ${
                    active ? 'text-accent' : 'text-fg hover:text-accent'
                  }`}
                >
                  <td className="py-1.5">{c.label}</td>
                  <td className="py-1.5 text-right font-mono">{c.explored}</td>
                  <td className="py-1.5 text-right font-mono">{c.pathLen}</td>
                  <td className="py-1.5 text-right font-mono">{c.eff}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-3 w-3 rounded-sm ${swatch}`} aria-hidden="true" />
      {label}
    </span>
  );
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = () => setReduced(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}
