import { useMemo, useState } from 'react';

/**
 * Custo do tamanho da janela W: a latência de detecção cresce com W enquanto a
 * taxa de alarme falso cai. O mínimo da curva combinada é o W justificável.
 */

const WMIN = 1;
const WMAX = 240; // minutos

const latency = (W: number) => W / 2; // atraso de detecção (min) ~ cresce com W
const falseRate = (W: number) => 8 / Math.sqrt(W); // alarmes falsos/dia ~ cai com W
const cost = (W: number) => W / 240 + 1.2 / Math.sqrt(W); // U: mínimo interior

export default function WindowTradeoff() {
  const [W, setW] = useState(28);

  const { samples, lMax, fMax, cMax, wOpt } = useMemo(() => {
    const samples: { W: number; l: number; f: number; c: number }[] = [];
    for (let i = 0; i <= 160; i++) {
      const w = WMIN * Math.pow(WMAX / WMIN, i / 160); // espaçamento log
      samples.push({ W: w, l: latency(w), f: falseRate(w), c: cost(w) });
    }
    const lMax = Math.max(...samples.map((s) => s.l));
    const fMax = Math.max(...samples.map((s) => s.f));
    const cMax = Math.max(...samples.map((s) => s.c));
    const wOpt = samples.reduce((a, b) => (b.c < a.c ? b : a)).W;
    return { samples, lMax, fMax, cMax, wOpt };
  }, []);

  const Wd = 640;
  const H = 240;
  const pad = { l: 12, r: 12, t: 16, b: 34 };
  const plotW = Wd - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;
  const lx = Math.log(WMAX / WMIN);
  const x = (w: number) => pad.l + (Math.log(w / WMIN) / lx) * plotW;
  const y = (v: number) => pad.t + (1 - v) * plotH; // v normalizado 0..1

  const path = (key: 'l' | 'f' | 'c', max: number) =>
    samples.map((s, i) => `${i === 0 ? 'M' : 'L'}${x(s.W).toFixed(1)},${y(s[key] / max).toFixed(1)}`).join(' ');

  const ticks = [1, 10, 60, 240];
  const fmt = (w: number) => (w >= 60 ? `${(w / 60).toFixed(w % 60 ? 1 : 0)}h` : `${Math.round(w)}min`);

  return (
    <div className="not-prose my-6 rounded-xl border border-border bg-surface p-4">
      <svg viewBox={`0 0 ${Wd} ${H}`} width="100%" role="img" aria-label={`Trade-off da janela. Em W=${fmt(W)}, atraso ${latency(W).toFixed(0)} min e ${falseRate(W).toFixed(1)} alarmes falsos por dia. Ótimo em ${fmt(wOpt)}.`} className="rounded-lg bg-bg">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} y1={pad.t} x2={x(t)} y2={pad.t + plotH} className="stroke-border" strokeWidth={0.5} strokeDasharray="2 3" />
            <text x={x(t)} y={H - 6} textAnchor="middle" className="fill-muted" fontSize="9">
              {fmt(t)}
            </text>
          </g>
        ))}

        {/* curvas */}
        <path d={path('f', fMax)} fill="none" className="stroke-sky-500" strokeWidth={1.5} />
        <path d={path('l', lMax)} fill="none" className="stroke-amber-500" strokeWidth={1.5} />
        <path d={path('c', cMax)} fill="none" className="stroke-accent" strokeWidth={2.25} />

        {/* ótimo */}
        <line x1={x(wOpt)} y1={pad.t} x2={x(wOpt)} y2={pad.t + plotH} className="stroke-emerald-500" strokeWidth={1} strokeDasharray="4 3" />
        <text x={x(wOpt)} y={pad.t + 10} textAnchor="middle" className="fill-emerald-500" fontSize="9">
          ótimo {fmt(wOpt)}
        </text>

        {/* W atual */}
        <line x1={x(W)} y1={pad.t} x2={x(W)} y2={pad.t + plotH} className="stroke-fg" strokeWidth={1.25} />

        {/* legenda */}
        <g fontSize="9">
          <text x={pad.l + 4} y={pad.t + 12} className="fill-amber-500">atraso de detecção</text>
          <text x={pad.l + 4} y={pad.t + 24} className="fill-sky-500">alarmes falsos</text>
          <text x={pad.l + 4} y={pad.t + 36} className="fill-accent">custo combinado</text>
        </g>
      </svg>

      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <label className="block text-sm">
          <span className="mb-1 flex justify-between text-muted">
            <span>Tamanho da janela W</span>
            <span className="font-mono text-fg">{fmt(W)}</span>
          </span>
          <input type="range" min={WMIN} max={WMAX} step={1} value={W} onChange={(e) => setW(parseInt(e.target.value))} className="h-2 w-full cursor-pointer appearance-none rounded-full bg-border accent-teal-500" />
        </label>
        <div className="grid grid-cols-2 gap-2 text-center text-sm">
          <div className="rounded-lg border border-amber-500/40 px-3 py-2 text-amber-500">
            <div className="font-mono text-lg">{latency(W) >= 60 ? `${(latency(W) / 60).toFixed(1)} h` : `${latency(W).toFixed(0)} min`}</div>
            <div className="text-xs">atraso</div>
          </div>
          <div className="rounded-lg border border-sky-500/40 px-3 py-2 text-sky-500">
            <div className="font-mono text-lg">{falseRate(W).toFixed(1)}</div>
            <div className="text-xs">alarmes falsos/dia</div>
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs text-muted">
        Janela curta (esquerda): detecção quase imediata, mas o ruído dispara muitos alarmes falsos. Janela longa
        (direita): silêncio, mas a falha só aparece tarde. O <span className="text-accent">custo combinado</span> tem
        um mínimo: esse é o W que você justifica com dados, varrendo-o contra as falhas históricas.
      </p>
    </div>
  );
}
