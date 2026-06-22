import { useMemo, useState } from 'react';

/**
 * Curva normal padrão com a regra 68-95-99,7. Relaciona o percentil do limiar ao
 * múltiplo de σ (p99 ≈ 2,33σ) e à taxa de alarme falso sob hipótese gaussiana.
 */

const phi = (x: number) => Math.exp(-(x * x) / 2) / Math.sqrt(2 * Math.PI);

// Inverso da CDF normal (algoritmo de Acklam): devolve z tal que Φ(z) = p.
function invNorm(p: number): number {
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239e0];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0, -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0, 3.754408661907416e0];
  const plow = 0.02425;
  const phigh = 1 - plow;
  if (p < plow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p <= phigh) {
    const q = p - 0.5;
    const r = q * q;
    return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  const q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
}

export default function NormalTail() {
  const [p, setP] = useState(99);
  const z = useMemo(() => invNorm(p / 100), [p]);
  const tail = 1 - p / 100; // prob. de alarme falso por amostra
  const oneIn = Math.round(1 / tail);

  const W = 640;
  const H = 250;
  const pad = { l: 12, r: 12, t: 16, b: 28 };
  const X0 = -3.9;
  const X1 = 3.9;
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;
  const maxPhi = phi(0);
  const x = (v: number) => pad.l + ((v - X0) / (X1 - X0)) * plotW;
  const y = (v: number) => pad.t + (1 - v / (maxPhi * 1.1)) * plotH;
  const base = pad.t + plotH;

  const samples = useMemo(() => {
    const out: { x: number; y: number }[] = [];
    for (let i = 0; i <= 200; i++) {
      const v = X0 + (i / 200) * (X1 - X0);
      out.push({ x: v, y: phi(v) });
    }
    return out;
  }, []);

  const curve = samples.map((s, i) => `${i === 0 ? 'M' : 'L'}${x(s.x).toFixed(1)},${y(s.y).toFixed(1)}`).join(' ');
  const tailFill =
    `M${x(z).toFixed(1)},${base.toFixed(1)} ` +
    samples.filter((s) => s.x >= z).map((s) => `L${x(s.x).toFixed(1)},${y(s.y).toFixed(1)}`).join(' ') +
    ` L${x(X1).toFixed(1)},${base.toFixed(1)} Z`;

  return (
    <div className="not-prose my-6 rounded-xl border border-border bg-surface p-4">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Curva normal. O percentil ${p} fica a ${z.toFixed(2)} desvios-padrão; a cauda além dele tem probabilidade ${(tail * 100).toFixed(2)}%: um alarme falso a cada ${oneIn} amostras.`} className="rounded-lg bg-bg">
        {/* eixo base */}
        <line x1={pad.l} y1={base} x2={W - pad.r} y2={base} className="stroke-border" strokeWidth={1} />

        {/* marcas de ±1,2,3 σ com a regra empírica */}
        {[
          { s: 1, lbl: '68%' },
          { s: 2, lbl: '95%' },
          { s: 3, lbl: '99,7%' },
        ].map(({ s, lbl }) => (
          <g key={s}>
            <line x1={x(-s)} y1={y(phi(-s))} x2={x(-s)} y2={base} className="stroke-border" strokeWidth={0.75} strokeDasharray="2 3" />
            <line x1={x(s)} y1={y(phi(s))} x2={x(s)} y2={base} className="stroke-border" strokeWidth={0.75} strokeDasharray="2 3" />
            <text x={x(0)} y={base - 6 - (s - 1) * 13} textAnchor="middle" className="fill-muted" fontSize="9">
              ±{s}σ → {lbl}
            </text>
          </g>
        ))}

        {/* cauda além do limiar */}
        <path d={tailFill} className="fill-red-500/30" />
        {/* curva */}
        <path d={curve} fill="none" className="stroke-accent" strokeWidth={2} />
        {/* limiar */}
        <line x1={x(z)} y1={pad.t} x2={x(z)} y2={base} className="stroke-red-500" strokeWidth={1.5} />
        <text x={x(z)} y={pad.t + 10} textAnchor="middle" className="fill-red-500" fontSize="10">
          {z.toFixed(2)}σ
        </text>
      </svg>

      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <label className="block text-sm">
          <span className="mb-1 flex justify-between text-muted">
            <span>Percentil do limiar</span>
            <span className="font-mono text-fg">p{p.toFixed(1)}</span>
          </span>
          <input type="range" min={90} max={99.9} step={0.1} value={p} onChange={(e) => setP(parseFloat(e.target.value))} className="h-2 w-full cursor-pointer appearance-none rounded-full bg-border accent-teal-500" />
        </label>
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded-lg border border-border px-2 py-2">
            <div className="font-mono text-base text-fg">{z.toFixed(2)}σ</div>
            <div className="text-xs text-muted">distância</div>
          </div>
          <div className="rounded-lg border border-border px-2 py-2">
            <div className="font-mono text-base text-fg">{(tail * 100).toFixed(2)}%</div>
            <div className="text-xs text-muted">cauda (falso/amostra)</div>
          </div>
          <div className="rounded-lg border border-border px-2 py-2">
            <div className="font-mono text-base text-fg">1/{oneIn}</div>
            <div className="text-xs text-muted">taxa de alarme</div>
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs text-muted">
        Subir o percentil empurra o limiar para a cauda (mais σ), encolhendo a área vermelha, a probabilidade de
        um ruído normal cruzá-lo. É a tradução estatística do trade-off do limiar: p99 ≈ 2,33σ deixa ~1% de
        alarmes falsos por amostra sob hipótese gaussiana.
      </p>
    </div>
  );
}
