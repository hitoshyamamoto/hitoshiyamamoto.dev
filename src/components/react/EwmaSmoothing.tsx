import { useMemo, useState } from 'react';

/**
 * EWMA sobre um stream ruidoso de SPE com uma falha no fim. Evidencia o efeito do
 * fator de esquecimento λ: ruído atenuado em troca de atraso na detecção.
 */

const N = 240;
const FAULT = 168; // início da rampa de falha
const THR = 0.6;

function buildRaw(): number[] {
  const out: number[] = [];
  for (let i = 0; i < N; i++) {
    const frac = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    const noise = (Math.abs(frac) * 2 - 1) * 0.13; // ruído centrado ±0.13
    const ramp = i >= FAULT ? ((i - FAULT) / (N - 1 - FAULT)) * 0.75 : 0;
    out.push(0.32 + noise + ramp);
  }
  return out;
}

export default function EwmaSmoothing() {
  const raw = useMemo(buildRaw, []);
  const [lambda, setLambda] = useState(0.15);

  const ewma = useMemo(() => {
    const s: number[] = [raw[0]];
    for (let i = 1; i < N; i++) s.push(lambda * raw[i] + (1 - lambda) * s[i - 1]);
    return s;
  }, [raw, lambda]);

  const wEff = (2 - lambda) / lambda; // janela efetiva em amostras
  const falseRaw = raw.slice(0, FAULT).filter((v) => v > THR).length;
  const falseEwma = ewma.slice(0, FAULT).filter((v) => v > THR).length;
  const detRaw = raw.findIndex((v, i) => i >= FAULT && v > THR);
  const detEwma = ewma.findIndex((v, i) => i >= FAULT && v > THR);
  const lag = detRaw >= 0 && detEwma >= 0 ? detEwma - detRaw : 0;

  const W = 640;
  const H = 230;
  const pad = { l: 12, r: 12, t: 28, b: 22 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;
  const maxV = 1.2;
  const x = (i: number) => pad.l + (i / (N - 1)) * plotW;
  const y = (v: number) => pad.t + (1 - v / maxV) * plotH;
  const toPath = (arr: number[]) => arr.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');

  return (
    <div className="not-prose my-6 rounded-xl border border-border bg-surface p-4">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`EWMA com lambda ${lambda.toFixed(2)}: janela efetiva ${wEff.toFixed(0)} amostras, ${falseEwma} alarmes falsos contra ${falseRaw} do sinal bruto, atraso de ${lag} amostras.`} className="rounded-lg bg-bg">
        {/* região de falha */}
        <rect x={x(FAULT)} y={pad.t} width={x(N - 1) - x(FAULT)} height={plotH} className="fill-red-500/10" />
        <text x={(x(FAULT) + x(N - 1)) / 2} y={pad.t - 8} textAnchor="middle" className="fill-red-500" fontSize="10">
          falha
        </text>
        <text x={x(FAULT / 2)} y={pad.t - 8} textAnchor="middle" className="fill-muted" fontSize="10">
          regime normal (ruído)
        </text>

        {/* limiar */}
        <line x1={pad.l} y1={y(THR)} x2={W - pad.r} y2={y(THR)} className="stroke-muted" strokeWidth={1.25} strokeDasharray="5 4" />
        <text x={W - pad.r} y={y(THR) - 4} textAnchor="end" className="fill-muted" fontSize="9">
          limiar
        </text>

        {/* sinal bruto e EWMA */}
        <path d={toPath(raw)} fill="none" className="stroke-muted/40" strokeWidth={1} />
        <path d={toPath(ewma)} fill="none" className="stroke-accent" strokeWidth={2} />

        <g fontSize="9">
          <text x={pad.l + 4} y={pad.t + 12} className="fill-muted">SPE bruto</text>
          <text x={pad.l + 4} y={pad.t + 24} className="fill-accent">EWMA(λ)</text>
        </g>
      </svg>

      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <label className="block text-sm">
          <span className="mb-1 flex justify-between text-muted">
            <span>Fator de esquecimento λ</span>
            <span className="font-mono text-fg">{lambda.toFixed(2)}</span>
          </span>
          <input type="range" min={0.02} max={0.6} step={0.01} value={lambda} onChange={(e) => setLambda(parseFloat(e.target.value))} className="h-2 w-full cursor-pointer appearance-none rounded-full bg-border accent-teal-500" />
        </label>
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded-lg border border-border px-2 py-2 text-fg">
            <div className="font-mono text-base">{wEff.toFixed(0)}</div>
            <div className="text-xs text-muted">janela efetiva</div>
          </div>
          <div className={`rounded-lg border px-2 py-2 ${falseEwma ? 'border-red-500/40 text-red-500' : 'border-emerald-500/40 text-emerald-500'}`}>
            <div className="font-mono text-base">{falseEwma}</div>
            <div className="text-xs">falsos (era {falseRaw})</div>
          </div>
          <div className={`rounded-lg border px-2 py-2 ${lag > 8 ? 'border-amber-500/40 text-amber-500' : 'border-border text-muted'}`}>
            <div className="font-mono text-base">{lag}</div>
            <div className="text-xs">atraso (amostras)</div>
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs text-muted">
        λ alto → EWMA cola no sinal bruto: reativo, mas o ruído ainda fura o limiar. λ baixo → janela efetiva longa:
        o ruído some (zero alarmes falsos), mas a falha demora mais a cruzar o limiar. Mesmo trade-off da janela,
        agora num filtro recursivo de memória $O(1)$.
      </p>
    </div>
  );
}
