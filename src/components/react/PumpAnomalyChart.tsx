import { useMemo, useState } from 'react';

/**
 * Série temporal do SPE com limiar e persistência ajustáveis. A série é
 * ilustrativa: reproduz a dinâmica de uma falha (normal → degradação → BROKEN →
 * recuperação), não os dados reais do pump-sensor-data.
 */

const N = 320; // amostras de uma janela ilustrativa (o dataset real é 1 leitura/min)
const STEP_MIN = 30; // cadência ilustrativa, só para expressar a antecedência em horas
const RAMP_START = 196; // início da degradação incipiente
const BROKEN = 232; // minuto rotulado como BROKEN no dataset
const RECOVER_END = 272; // fim do período RECOVERING

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
  // O limiar é calibrado SÓ no regime normal: o detector nunca "vê" a falha.
  const baseline = useMemo(() => series.slice(0, RAMP_START), [series]);
  const [p, setP] = useState(99);
  const [persist, setPersist] = useState(1); // exige N leituras seguidas acima do limiar
  const thr = useMemo(() => percentile(baseline, p), [baseline, p]);

  const exceed = series.map((v) => v > thr);
  // alarme só dispara quando as últimas `persist` leituras cruzam o limiar
  const flags = exceed.map((_, i) => i >= persist - 1 && exceed.slice(i - persist + 1, i + 1).every(Boolean));
  const firstDetect = flags.findIndex((f, i) => f && i >= RAMP_START);
  const detected = firstDetect >= 0 && firstDetect <= BROKEN;
  const leadHours = detected ? ((BROKEN - firstDetect) * STEP_MIN) / 60 : 0;
  const falseAlarms = flags.slice(0, RAMP_START).filter(Boolean).length;

  const W = 640;
  const H = 260;
  const pad = { l: 44, r: 12, t: 28, b: 28 };
  const maxV = Math.max(...series) * 1.08;
  const x = (i: number) => pad.l + (i / (N - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => H - pad.b - (v / maxV) * (H - pad.t - pad.b);

  const linePath = series.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const plotBottom = H - pad.b;
  const plotTop = pad.t;

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
        {/* faixas de regime */}
        <rect x={x(RAMP_START)} y={plotTop} width={x(BROKEN) - x(RAMP_START)} height={plotBottom - plotTop} className="fill-amber-500/10" />
        <rect x={x(BROKEN)} y={plotTop} width={x(RECOVER_END) - x(BROKEN)} height={plotBottom - plotTop} className="fill-red-500/10" />

        {/* rótulos das regiões */}
        <text x={x(RAMP_START / 2)} y={plotTop - 10} textAnchor="middle" className="fill-muted" fontSize="11">
          regime normal
        </text>
        <text x={(x(RAMP_START) + x(BROKEN)) / 2} y={plotTop - 10} textAnchor="middle" className="fill-amber-500" fontSize="11">
          degradação
        </text>
        <text x={x(BROKEN) + 6} y={plotTop - 10} className="fill-red-500" fontSize="11">
          falha → recuperação
        </text>

        {/* eixos */}
        <line x1={pad.l} y1={plotTop} x2={pad.l} y2={plotBottom} className="stroke-border" strokeWidth={1} />
        <line x1={pad.l} y1={plotBottom} x2={W - pad.r} y2={plotBottom} className="stroke-border" strokeWidth={1} />
        <text x={10} y={(plotTop + plotBottom) / 2} className="fill-muted" fontSize="10" transform={`rotate(-90 10 ${(plotTop + plotBottom) / 2})`} textAnchor="middle">
          erro de reconstrução (SPE)
        </text>
        <text x={(pad.l + W - pad.r) / 2} y={H - 6} textAnchor="middle" className="fill-muted" fontSize="10">
          tempo →
        </text>

        {/* linha do limiar */}
        <line x1={pad.l} y1={y(thr)} x2={W - pad.r} y2={y(thr)} className="stroke-muted" strokeWidth={1.25} strokeDasharray="5 4" />
        <text x={W - pad.r} y={y(thr) - 5} textAnchor="end" className="fill-muted" fontSize="10">
          limiar p{p}
        </text>

        {/* marca do BROKEN */}
        <line x1={x(BROKEN)} y1={plotTop} x2={x(BROKEN)} y2={plotBottom} className="stroke-red-500" strokeWidth={1.5} />

        {/* série de erro */}
        <path d={linePath} fill="none" className="stroke-accent" strokeWidth={1.75} />

        {/* pontos sinalizados como anomalia */}
        {series.map((v, i) => (flags[i] ? <circle key={i} cx={x(i)} cy={y(v)} r={2.4} className="fill-red-500" /> : null))}

        {/* primeira detecção (antecipação) */}
        {detected && (
          <>
            <circle cx={x(firstDetect)} cy={y(series[firstDetect])} r={5.5} className="fill-none stroke-emerald-500" strokeWidth={2} />
            <line x1={x(firstDetect)} y1={y(series[firstDetect])} x2={x(firstDetect)} y2={plotBottom} className="stroke-emerald-500/50" strokeWidth={1} strokeDasharray="2 3" />
            <text x={x(firstDetect)} y={plotBottom + 18} textAnchor="middle" className="fill-emerald-500" fontSize="10">
              1ª detecção
            </text>
          </>
        )}
      </svg>

      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 flex justify-between text-muted">
              <span>Limiar: percentil calibrado no regime normal</span>
              <span className="font-mono text-fg">p{p}</span>
            </span>
            <input
              type="range"
              min={90}
              max={99.9}
              step={0.1}
              value={p}
              onChange={(e) => setP(parseFloat(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-border accent-teal-500"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 flex justify-between text-muted">
              <span>Persistência: leituras seguidas para confirmar o alarme</span>
              <span className="font-mono text-fg">{persist}×</span>
            </span>
            <input
              type="range"
              min={1}
              max={8}
              step={1}
              value={persist}
              onChange={(e) => setPersist(parseInt(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-border accent-teal-500"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2 text-center text-sm">
          <div className={`rounded-lg border px-3 py-2 ${detected ? 'border-emerald-500/40 text-emerald-500' : 'border-border text-muted'}`}>
            <div className="font-mono text-lg">{detected ? `${leadHours.toFixed(1)} h` : 'n/d'}</div>
            <div className="text-xs">antecedência</div>
          </div>
          <div className={`rounded-lg border px-3 py-2 ${falseAlarms ? 'border-red-500/40 text-red-500' : 'border-border text-muted'}`}>
            <div className="font-mono text-lg">{falseAlarms}</div>
            <div className="text-xs">alarmes falsos</div>
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs text-muted">
        Baixe o limiar (p) e a detecção vem mais cedo, ao custo de mais
        <span className="text-red-500"> alarmes falsos</span>. Agora aumente a <strong>persistência</strong>:
        exigir N leituras seguidas acima do limiar elimina os picos isolados do ruído: os falsos alarmes caem,
        normalmente sem sacrificar muita antecedência. É a combinação dos dois que se calibra na operação.
      </p>
    </div>
  );
}
