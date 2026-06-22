import { useMemo, useState } from 'react';

/**
 * Compara um PCA global contra um modelo por regime ao longo dos estados da
 * máquina (parada → subtransitória → transitória → permanente), com uma única
 * falha real no regime permanente. Expõe o custo de ignorar os regimes.
 */

const N = 300;
// fronteiras das fases (frações do eixo de tempo)
const B = { sub: 0.18, trans: 0.3, perm: 0.55 };
const ANOM = 0.85; // centro da falha real (dentro do permanente)
const THR = 0.3;

const PHASES = [
  { id: 'parada', label: 'parada', from: 0, to: B.sub, tint: 'fill-muted/10' },
  { id: 'sub', label: 'subtransitória', from: B.sub, to: B.trans, tint: 'fill-sky-500/10' },
  { id: 'trans', label: 'transitória', from: B.trans, to: B.perm, tint: 'fill-amber-500/10' },
  { id: 'perm', label: 'regime permanente', from: B.perm, to: 1, tint: 'fill-emerald-500/10' },
];

// distância ao regime permanente: alta quando a máquina ainda não estabilizou
function distFromSteady(f: number): number {
  if (f < B.sub) return 1.0; // parada: nada parecido com o permanente
  if (f < B.trans) return 1.0 - ((f - B.sub) / (B.trans - B.sub)) * 0.6; // subida (1.0 → 0.4)
  if (f < B.perm) return 0.4 - ((f - B.trans) / (B.perm - B.trans)) * 0.32; // acomoda (0.4 → 0.08)
  return 0.05;
}

function buildResiduals() {
  const single: number[] = [];
  const perRegime: number[] = [];
  for (let i = 0; i < N; i++) {
    const f = i / (N - 1);
    const noise = (Math.abs((Math.sin(i * 9.7) * 1000) % 1)) * 0.06;
    const anomaly = 0.55 * Math.exp(-(((f - ANOM) / 0.03) ** 2)); // falha real, localizada
    single.push(distFromSteady(f) + noise + anomaly);
    perRegime.push(0.06 + noise + anomaly); // cada fase comparada ao seu próprio modelo
  }
  return { single, perRegime };
}

export default function RegimeStates() {
  const { single, perRegime } = useMemo(buildResiduals, []);
  const [perModel, setPerModel] = useState(false);
  const resid = perModel ? perRegime : single;

  const inAnom = (i: number) => Math.abs(i / (N - 1) - ANOM) < 0.05;
  const flags = resid.map((v) => v > THR);
  const falseAlarms = flags.filter((f, i) => f && !inAnom(i)).length;
  const realDetected = flags.some((f, i) => f && inAnom(i));

  const W = 640;
  const H = 250;
  const pad = { l: 40, r: 12, t: 30, b: 24 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;
  const maxV = 1.25;
  const x = (i: number) => pad.l + (i / (N - 1)) * plotW;
  const xf = (f: number) => pad.l + f * plotW;
  const y = (v: number) => pad.t + (1 - v / maxV) * plotH;
  const line = resid.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');

  return (
    <div className="not-prose my-6 rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Estratégia de modelagem">
        {[
          { v: false, label: 'Modelo único (regime permanente)' },
          { v: true, label: 'Modelo por regime' },
        ].map((opt) => (
          <button
            key={String(opt.v)}
            type="button"
            onClick={() => setPerModel(opt.v)}
            aria-pressed={perModel === opt.v}
            className={`rounded-md border px-2.5 py-1 text-sm transition-colors ${
              perModel === opt.v ? 'border-accent text-accent' : 'border-border text-muted hover:border-accent/50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Resíduo do PCA pelas fases da máquina. Estratégia: ${perModel ? 'um modelo por regime' : 'modelo único'}. ${falseAlarms} alarmes falsos; falha real ${realDetected ? 'detectada' : 'não detectada'}.`} className="rounded-lg bg-bg">
        {PHASES.map((ph) => (
          <g key={ph.id}>
            <rect x={xf(ph.from)} y={pad.t} width={xf(ph.to) - xf(ph.from)} height={plotH} className={ph.tint} />
            <text x={(xf(ph.from) + xf(ph.to)) / 2} y={pad.t - 8} textAnchor="middle" className="fill-muted" fontSize="9.5">
              {ph.label}
            </text>
          </g>
        ))}

        {/* limiar */}
        <line x1={pad.l} y1={y(THR)} x2={W - pad.r} y2={y(THR)} className="stroke-muted" strokeWidth={1.25} strokeDasharray="5 4" />
        <text x={W - pad.r} y={y(THR) - 4} textAnchor="end" className="fill-muted" fontSize="9">
          limiar
        </text>

        {/* falha real */}
        <line x1={xf(ANOM)} y1={pad.t} x2={xf(ANOM)} y2={pad.t + plotH} className="stroke-red-500/60" strokeWidth={1} />
        <text x={xf(ANOM)} y={pad.t + plotH + 16} textAnchor="middle" className="fill-red-500" fontSize="9">
          falha real
        </text>

        {/* resíduo */}
        <path d={line} fill="none" className="stroke-accent" strokeWidth={1.75} />
        {resid.map((v, i) => (flags[i] ? <circle key={i} cx={x(i)} cy={y(v)} r={2.2} className={inAnom(i) ? 'fill-red-500' : 'fill-amber-500'} /> : null))}

        <text x={10} y={pad.t + plotH / 2} transform={`rotate(-90 10 ${pad.t + plotH / 2})`} textAnchor="middle" className="fill-muted" fontSize="9">
          resíduo do PCA
        </text>
      </svg>

      <div className="mt-4 grid grid-cols-2 gap-2 text-center text-sm">
        <div className={`rounded-lg border px-3 py-2 ${falseAlarms ? 'border-amber-500/40 text-amber-500' : 'border-border text-muted'}`}>
          <div className="font-mono text-lg">{falseAlarms}</div>
          <div className="text-xs">alarmes falsos (transientes)</div>
        </div>
        <div className={`rounded-lg border px-3 py-2 ${realDetected ? 'border-emerald-500/40 text-emerald-500' : 'border-red-500/40 text-red-500'}`}>
          <div className="font-mono text-lg">{realDetected ? '✓' : '✗'}</div>
          <div className="text-xs">falha real detectada</div>
        </div>
      </div>

      <p className="mt-3 text-xs text-muted">
        Com <strong>um modelo só</strong> (treinado no permanente), parada, partida e transição parecem anômalas,
        <span className="text-amber-500"> dezenas de alarmes falsos</span>. Com <strong>um modelo por regime</strong>,
        cada fase é julgada contra o seu próprio normal: os transientes silenciam e só a
        <span className="text-red-500"> falha real</span> permanece.
      </p>
    </div>
  );
}
