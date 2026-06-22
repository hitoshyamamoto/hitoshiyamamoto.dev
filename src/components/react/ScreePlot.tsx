import { useMemo, useState } from 'react';

/**
 * Variância por componente (barras) e acumulada (linha). Apoia a decisão de
 * quantos componentes reter para um dado alvo de variância.
 */

const M = 20; // número de componentes mostrados

function buildVariance() {
  const raw = Array.from({ length: M }, (_, i) => Math.exp(-0.32 * i));
  const sum = raw.reduce((a, b) => a + b, 0);
  const ratio = raw.map((r) => r / sum);
  const cum: number[] = [];
  let acc = 0;
  for (const r of ratio) {
    acc += r;
    cum.push(acc);
  }
  return { ratio, cum };
}

export default function ScreePlot() {
  const { ratio, cum } = useMemo(buildVariance, []);
  const [target, setTarget] = useState(95);
  const k = cum.findIndex((c) => c >= target / 100) + 1; // componentes necessários

  const W = 640;
  const H = 260;
  const pad = { l: 44, r: 12, t: 16, b: 34 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;
  const x = (i: number) => pad.l + (i + 0.5) * (plotW / M);
  const y = (v: number) => pad.t + (1 - v) * plotH;
  const barW = (plotW / M) * 0.6;

  const cumPath = cum.map((c, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(c).toFixed(1)}`).join(' ');

  return (
    <div className="not-prose my-6 rounded-xl border border-border bg-surface p-4">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Scree plot. Para reter ${target}% da variância são necessários ${k} componentes.`} className="rounded-lg bg-bg">
        {/* grades de referência 50% / 100% */}
        {[0.5, 1].map((g) => (
          <g key={g}>
            <line x1={pad.l} y1={y(g)} x2={W - pad.r} y2={y(g)} className="stroke-border" strokeWidth={0.75} strokeDasharray="2 3" />
            <text x={pad.l - 6} y={y(g) + 3} textAnchor="end" className="fill-muted" fontSize="9">
              {g * 100}%
            </text>
          </g>
        ))}

        {/* barras: variância individual */}
        {ratio.map((r, i) => (
          <rect
            key={i}
            x={x(i) - barW / 2}
            y={y(r)}
            width={barW}
            height={pad.t + plotH - y(r)}
            className={i < k ? 'fill-accent/70' : 'fill-muted/30'}
          />
        ))}

        {/* linha da variância acumulada */}
        <path d={cumPath} fill="none" className="stroke-accent" strokeWidth={1.75} />

        {/* alvo + componentes necessários */}
        <line x1={pad.l} y1={y(target / 100)} x2={W - pad.r} y2={y(target / 100)} className="stroke-emerald-500" strokeWidth={1.25} strokeDasharray="5 4" />
        <text x={W - pad.r} y={y(target / 100) - 5} textAnchor="end" className="fill-emerald-500" fontSize="10">
          alvo {target}%
        </text>
        <line x1={x(k - 1)} y1={pad.t} x2={x(k - 1)} y2={pad.t + plotH} className="stroke-emerald-500/50" strokeWidth={1} strokeDasharray="2 3" />

        <text x={(pad.l + W - pad.r) / 2} y={H - 6} textAnchor="middle" className="fill-muted" fontSize="10">
          componentes principais (ordenados por variância) →
        </text>
      </svg>

      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <label className="block text-sm">
          <span className="mb-1 flex justify-between text-muted">
            <span>Variância a reter</span>
            <span className="font-mono text-fg">{target}%</span>
          </span>
          <input type="range" min={70} max={99} step={1} value={target} onChange={(e) => setTarget(parseInt(e.target.value))} className="h-2 w-full cursor-pointer appearance-none rounded-full bg-border accent-teal-500" />
        </label>
        <div className="rounded-lg border border-accent/40 px-4 py-2 text-center text-accent">
          <div className="font-mono text-lg">
            {k} de {M}
          </div>
          <div className="text-xs">componentes retidos</div>
        </div>
      </div>

      <p className="mt-3 text-xs text-muted">
        As primeiras direções concentram quase toda a variância; a cauda é quase só ruído. Pedir 95% costuma
        descartar a maioria das dimensões: é a compressão que torna o erro de reconstrução sensível à falha.
      </p>
    </div>
  );
}
