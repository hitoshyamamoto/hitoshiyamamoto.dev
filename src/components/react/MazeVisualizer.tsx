import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Compara algoritmos de busca sobre um mesmo labirinto, inteiramente no cliente.
 *
 * Geração por recursive backtracker; solvers BFS, DFS, Dijkstra, A* (Manhattan)
 * e greedy best-first compartilham o grid e expõem nós explorados vs. caminho.
 * A exploração é animada, ou desenhada de uma vez sob prefers-reduced-motion.
 */

type Cell = { walls: [boolean, boolean, boolean, boolean] }; // N,E,S,W
type Grid = { cols: number; rows: number; cells: Cell[] };
type Solver = 'bfs' | 'dfs' | 'dijkstra' | 'astar' | 'greedy';

const SOLVERS: { id: Solver; label: string }[] = [
  { id: 'bfs', label: 'BFS' },
  { id: 'dfs', label: 'DFS' },
  { id: 'dijkstra', label: 'Dijkstra' },
  { id: 'astar', label: 'A*' },
  { id: 'greedy', label: 'Greedy' },
];

const idx = (g: Grid, x: number, y: number) => y * g.cols + x;

// ---- Geração: recursive backtracker (determinística por seed) ----------------
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function generate(cols: number, rows: number, seed: number): Grid {
  const cells: Cell[] = Array.from({ length: cols * rows }, () => ({
    walls: [true, true, true, true],
  }));
  const g: Grid = { cols, rows, cells };
  const rng = makeRng(seed);
  const visited = new Array(cols * rows).fill(false);
  const stack: number[] = [0];
  visited[0] = true;

  const dirs: [number, number, number, number][] = [
    [0, -1, 0, 2], // N -> remove wall 0 here, wall 2 neighbor
    [1, 0, 1, 3], // E
    [0, 1, 2, 0], // S
    [-1, 0, 3, 1], // W
  ];

  while (stack.length) {
    const cur = stack[stack.length - 1];
    const cx = cur % cols;
    const cy = Math.floor(cur / cols);
    const options = dirs.filter(([dx, dy]) => {
      const nx = cx + dx;
      const ny = cy + dy;
      return nx >= 0 && nx < cols && ny >= 0 && ny < rows && !visited[idx(g, nx, ny)];
    });
    if (options.length === 0) {
      stack.pop();
      continue;
    }
    const [dx, dy, w, nw] = options[Math.floor(rng() * options.length)];
    const nx = cx + dx;
    const ny = cy + dy;
    const next = idx(g, nx, ny);
    cells[cur].walls[w] = false;
    cells[next].walls[nw] = false;
    visited[next] = true;
    stack.push(next);
  }
  return g;
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
  order: number[]; // nós na ordem em que foram expandidos
  path: number[]; // caminho start->goal
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

  // Dijkstra / A* / Greedy: fila de prioridade simples (array + sort).
  const g_cost = new Map<number, number>([[start, 0]]);
  const pq: { n: number; f: number }[] = [{ n: start, f: 0 }];
  const h = (n: number) => (kind === 'dijkstra' ? 0 : manhattan(g, n, goal));

  while (pq.length) {
    pq.sort((a, b) => a.f - b.f);
    const { n: cur } = pq.shift()!;
    order.push(cur);
    if (cur === goal) break;
    for (const nb of neighbors(g, cur)) {
      const tentative = (g_cost.get(cur) ?? Infinity) + 1;
      if (tentative < (g_cost.get(nb) ?? Infinity)) {
        prev.set(nb, cur);
        g_cost.set(nb, tentative);
        const priority = kind === 'greedy' ? h(nb) : tentative + h(nb);
        pq.push({ n: nb, f: priority });
      }
    }
  }
  return { order, path: reconstruct(prev, goal) };
}

// ---- Componente --------------------------------------------------------------
const COLS = 20;
const ROWS = 14;
const SIZE = 22;

export default function MazeVisualizer() {
  const [seed, setSeed] = useState(7);
  const [solver, setSolver] = useState<Solver>('astar');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>();
  const reduced = usePrefersReducedMotion();

  const grid = useMemo(() => generate(COLS, ROWS, seed), [seed]);
  const start = 0;
  const goal = COLS * ROWS - 1;
  const result = useMemo(() => solve(grid, solver, start, goal), [grid, solver]);

  const metrics = {
    explored: result.order.length,
    pathLen: result.path.length,
  };

  const draw = useCallback(
    (exploredUpTo: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const css = getComputedStyle(document.documentElement);
      const isDark = document.documentElement.classList.contains('dark');
      const wall = isDark ? '#a8a29e' : '#44403c';
      const bg = isDark ? '#0c0a09' : '#fafaf9';
      const accent = `rgb(${css.getPropertyValue('--accent') || '13 148 136'})`;

      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // células exploradas
      ctx.fillStyle = isDark ? 'rgba(45,212,191,0.18)' : 'rgba(13,148,136,0.14)';
      for (let i = 0; i < exploredUpTo && i < result.order.length; i++) {
        const n = result.order[i];
        ctx.fillRect((n % COLS) * SIZE, Math.floor(n / COLS) * SIZE, SIZE, SIZE);
      }

      // caminho final (só quando a exploração termina)
      if (exploredUpTo >= result.order.length) {
        ctx.fillStyle = accent;
        for (const n of result.path) {
          ctx.fillRect((n % COLS) * SIZE + SIZE * 0.3, Math.floor(n / COLS) * SIZE + SIZE * 0.3, SIZE * 0.4, SIZE * 0.4);
        }
      }

      // start / goal
      ctx.fillStyle = '#10b981';
      ctx.fillRect(2, 2, SIZE - 4, SIZE - 4);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect((goal % COLS) * SIZE + 2, Math.floor(goal / COLS) * SIZE + 2, SIZE - 4, SIZE - 4);

      // paredes
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

  return (
    <div className="not-prose rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Algoritmo">
          {SOLVERS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSolver(s.id)}
              aria-pressed={solver === s.id}
              className={`rounded-md border px-2.5 py-1 text-sm transition-colors ${
                solver === s.id
                  ? 'border-accent text-accent'
                  : 'border-border text-muted hover:border-accent/50'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setSeed((s) => s + 1)} className="btn ml-auto">
          ↻ Novo labirinto
        </button>
      </div>

      <canvas
        ref={canvasRef}
        width={COLS * SIZE}
        height={ROWS * SIZE}
        className="mx-auto block max-w-full rounded-lg"
        aria-label={`Labirinto resolvido por ${solver}. ${metrics.explored} nós explorados, caminho de ${metrics.pathLen}.`}
      />

      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
        <Metric label="Nós explorados" value={metrics.explored} />
        <Metric label="Tamanho do caminho" value={metrics.pathLen} />
        <Metric label="Eficiência" value={`${Math.round((metrics.pathLen / metrics.explored) * 100)}%`} />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border bg-bg p-2">
      <div className="font-mono text-lg text-fg">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
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
