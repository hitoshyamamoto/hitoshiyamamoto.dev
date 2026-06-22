import { useMemo, useState } from 'react';

/**
 * Decomposição do SPE por sensor (contribution plot). Os maiores contribuintes
 * de uma leitura anômala são os prováveis responsáveis pela falha.
 */

const S = 16; // sensores exibidos
const SCENARIOS = [
  { id: 'normal', label: 'Leitura normal', spikes: [] as number[] },
  { id: 'A', label: 'Falha A (mancal)', spikes: [4, 9, 12] },
  { id: 'B', label: 'Falha B (vedação)', spikes: [1, 7, 14] },
] as const;

type ScenarioId = (typeof SCENARIOS)[number]['id'];

function contributions(spikes: readonly number[]): number[] {
  return Array.from({ length: S }, (_, i) => {
    const noise = Math.abs((Math.sin(i * 7.13) * 1000) % 1) * 0.25; // ruído baixo, estável
    const spike = spikes.includes(i) ? 0.7 + Math.abs((Math.sin(i * 3.1) * 100) % 1) * 0.6 : 0;
    return noise + spike;
  });
}

export default function ContributionPlot() {
  const [scenario, setScenario] = useState<ScenarioId>('A');
  const spikes = SCENARIOS.find((s) => s.id === scenario)!.spikes;
  const values = useMemo(() => contributions(spikes), [scenario]);

  // maiores contribuintes destacados como prováveis responsáveis
  const top = useMemo(() => {
    return [...values.keys()].sort((a, b) => values[b] - values[a]).slice(0, 3);
  }, [values]);
  const topSet = new Set(scenario === 'normal' ? [] : top);

  const maxV = Math.max(...values, 1);
  const W = 640;
  const H = 240;
  const pad = { l: 36, r: 12, t: 14, b: 30 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;
  const x = (i: number) => pad.l + (i + 0.5) * (plotW / S);
  const barW = (plotW / S) * 0.62;
  const y = (v: number) => pad.t + (1 - v / maxV) * plotH;

  return (
    <div className="not-prose my-6 rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Cenário">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setScenario(s.id)}
            aria-pressed={scenario === s.id}
            className={`rounded-md border px-2.5 py-1 text-sm transition-colors ${
              scenario === s.id ? 'border-accent text-accent' : 'border-border text-muted hover:border-accent/50'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Contribuição por sensor no cenário ${scenario}.`} className="rounded-lg bg-bg">
        {/* eixo base */}
        <line x1={pad.l} y1={pad.t + plotH} x2={W - pad.r} y2={pad.t + plotH} className="stroke-border" strokeWidth={1} />
        <text x={10} y={(pad.t + plotH) / 2} transform={`rotate(-90 10 ${(pad.t + plotH) / 2})`} textAnchor="middle" className="fill-muted" fontSize="9">
          contribuição cⱼ
        </text>

        {values.map((v, i) => (
          <g key={i}>
            <rect x={x(i) - barW / 2} y={y(v)} width={barW} height={pad.t + plotH - y(v)} className={topSet.has(i) ? 'fill-red-500' : 'fill-accent/60'} />
            <text x={x(i)} y={H - 16} textAnchor="middle" className={topSet.has(i) ? 'fill-red-500' : 'fill-muted'} fontSize="8">
              {i.toString().padStart(2, '0')}
            </text>
          </g>
        ))}
        <text x={(pad.l + W - pad.r) / 2} y={H - 4} textAnchor="middle" className="fill-muted" fontSize="9">
          sensor →
        </text>
      </svg>

      <p className="mt-3 text-xs text-muted">
        {scenario === 'normal' ? (
          <>Regime normal: nenhum sensor se destaca; o erro se espalha em ruído baixo, abaixo do limiar.</>
        ) : (
          <>
            Os sensores <span className="font-mono text-red-500">{top.map((i) => i.toString().padStart(2, '0')).join(', ')}</span>{' '}
            concentram a contribuição: são o endereço da anomalia. Note como o cenário muda os culpados:
            assinaturas de falha diferentes acendem sensores diferentes.
          </>
        )}
      </p>
    </div>
  );
}
