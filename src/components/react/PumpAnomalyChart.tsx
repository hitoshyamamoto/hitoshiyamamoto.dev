import { useMemo, useState } from 'react';

/**
 * Monitor de erro de reconstrução (estatística SPE/Q do PCA) ao longo do tempo,
 * no espírito do dataset pump-sensor-data: um regime normal estável, uma rampa
 * de degradação incipiente e a falha rotulada (BROKEN) seguida de recuperação.
 *
 * O leitor move o limiar e vê o trade-off entre antecipar a falha e disparar
 * alarmes falsos no regime normal. A série é determinística (mesma forma a cada
 * render) e não anima nada — nada a pausar sob prefers-reduced-motion.
 */

const N = 320; // amostras (≈ 1 ponto a cada 30 min)
const STEP_MIN = 30;
const RAMP_START = 196; // início da degradação incipiente
const BROKEN = 232; // minuto rotulado como BROKEN no dataset
const RECOVER_END = 272; // fim do período RECOVERING

// Erro de reconstrução sintético, mas com a dinâmica típica de uma falha real.
function buildSeries(): number[] {
  const out: number[] = [];
  for (let i = 0; i < N; i++) {
    const frac = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    let v = 0.6 + Math.abs(frac) * 0.5; // regime normal: baixo, com ruído
    if (i >= RAMP_START && i < BROKEN) {
      const t = (i - RAMP_START) / (BROKEN - RAMP_START);
      v += t * t * 6; // rampa acelerando até a falha
    } else if (i >= BROKEN && i <= RECOVER_END) {
      const t = (i - BROKEN) / (RECOVER_END - BROKEN);
      v += 9 * (1 - t) + 1.5; // pico no BROKEN, caindo na recuperação
    }
    out.push(v);
  }
  return out;
}

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

export default function PumpAnomalyChart() {
  const series = useMemo(buildSeries, []);
  // O limiar é calibrado SÓ no regime normal — o detector nunca "vê" a falha.
  const baseline = useMemo(() => series.slice(0, RAMP_START), [series]);
  const [p, setP] = useState(99);
  const thr = useMemo(() => percentile(baseline, p), [baseline, p]);

  const flags = series.map((v) => v > thr);
  const firstDetect = flags.findIndex((f, i) => f && i >= RAMP_START);
  const detected = firstDetect >= 0 && firstDetect <= BROKEN;
  const leadHours = detected ? ((BROKEN - firstDetect) * STEP_MIN) / 60 : 0;
  const falseAlarms = flags.slice(0, RAMP_START).filter(Boolean).length;

  const W = 640;
  const H = 240;
  const pad = { l: 8, r: 8, t: 12, b: 12 };
  const maxV = Math.max(...series) * 1.05;
  const x = (i: number) => pad.l + (i / (N - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => H - pad.b - (v / maxV) * (H - pad.t - pad.b);

  const linePath = series.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');

  return (
    <div className="not-prose my-6 rounded-xl border border-border bg-surface p-4">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={`Erro de reconstrução ao longo do tempo. Com o limiar no percentil ${p}, ${
          detected ? `a falha é antecipada em ${leadHours.toFixed(1)} horas` : 'a falha não é antecipada'
        } e há ${falseAlarms} alarme(s) falso(s) no regime normal.`}
        className="rounded-lg bg-bg"
      >
        {/* faixa de degradação (rampa) e de recuperação */}
        <rect x={x(RAMP_START)} y={pad.t} width={x(BROKEN) - x(RAMP_START)} height={H - pad.t - pad.b} className="fill-amber-500/10" />
        <rect x={x(BROKEN)} y={pad.t} width={x(RECOVER_END) - x(BROKEN)} height={H - pad.t - pad.b} className="fill-red-500/10" />

        {/* linha do limiar */}
        <line x1={pad.l} y1={y(thr)} x2={W - pad.r} y2={y(thr)} className="stroke-muted" strokeWidth={1} strokeDasharray="5 4" />
        <text x={pad.l + 4} y={y(thr) - 4} className="fill-muted" fontSize="10">
          limiar (p{p})
        </text>

        {/* marca do BROKEN */}
        <line x1={x(BROKEN)} y1={pad.t} x2={x(BROKEN)} y2={H - pad.b} className="stroke-red-500" strokeWidth={1.5} />

        {/* série de erro */}
        <path d={linePath} fill="none" className="stroke-accent" strokeWidth={1.75} />

        {/* pontos sinalizados como anomalia */}
        {series.map((v, i) =>
          flags[i] ? <circle key={i} cx={x(i)} cy={y(v)} r={2.2} className="fill-red-500" /> : null,
        )}

        {/* primeira detecção (antecipação) */}
        {detected && <circle cx={x(firstDetect)} cy={y(series[firstDetect])} r={5} className="fill-none stroke-emerald-500" strokeWidth={2} />}
      </svg>

      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <label className="block text-sm">
          <span className="mb-1 flex justify-between text-muted">
            <span>Limiar — percentil do regime normal</span>
            <span className="font-mono">p{p}</span>
          </span>
          <input
            type="range"
            min={90}
            max={99.9}
            step={0.1}
            value={p}
            onChange={(e) => setP(parseFloat(e.target.value))}
            className="w-full accent-teal-500"
          />
        </label>

        <div className="grid grid-cols-2 gap-2 text-center text-sm">
          <div className={`rounded-lg border px-3 py-2 ${detected ? 'border-emerald-500/40 text-emerald-500' : 'border-border text-muted'}`}>
            <div className="font-mono text-lg">{detected ? `${leadHours.toFixed(1)} h` : '—'}</div>
            <div className="text-xs">antecedência</div>
          </div>
          <div className={`rounded-lg border px-3 py-2 ${falseAlarms ? 'border-red-500/40 text-red-500' : 'border-border text-muted'}`}>
            <div className="font-mono text-lg">{falseAlarms}</div>
            <div className="text-xs">alarmes falsos</div>
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs text-muted">
        Faixa âmbar: degradação incipiente · linha vermelha: falha rotulada (BROKEN) · faixa vermelha: recuperação.
        Baixe o limiar e a falha é antecipada com mais folga, ao custo de alarmes falsos no regime normal.
      </p>
    </div>
  );
}
