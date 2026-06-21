import { useMemo, useState } from 'react';

/**
 * Modelo didático de detecção de anomalia por PCA, para embutir num artigo.
 *
 * O regime normal é uma nuvem 2D ao longo de um eixo principal. O erro de
 * reconstrução é a distância do ponto de operação a esse eixo; acima do limiar,
 * vira anomalia. Determinístico e sem estado contínuo (nada a animar).
 */
export default function PcaSimulator() {
  const [variance, setVariance] = useState(1.0); // variância injetada
  const [angle, setAngle] = useState(25); // desvio do ponto de operação (graus)
  const [threshold, setThreshold] = useState(1.5);

  const W = 360;
  const H = 220;
  const cx = W / 2;
  const cy = H / 2;

  // Eixo principal aprendido (componente 1): 30° na tela.
  const pcAngle = (30 * Math.PI) / 180;
  const ux = Math.cos(pcAngle);
  const uy = Math.sin(pcAngle);

  // Ponto de operação atual, deslocado do eixo pela combinação ângulo+variância.
  const op = useMemo(() => {
    const rad = (angle * Math.PI) / 180;
    const r = 70;
    const px = Math.cos(rad) * r * variance;
    const py = Math.sin(rad) * r * variance;
    // projeção no eixo principal -> erro de reconstrução = componente ortogonal
    const proj = px * ux + py * uy;
    const rx = proj * ux;
    const ry = proj * uy;
    const error = Math.hypot(px - rx, py - ry) / 40; // normalizado
    return { px, py, rx, ry, error };
  }, [angle, variance, ux, uy]);

  const anomaly = op.error > threshold;

  // pontos de treino (nuvem ao longo do eixo) — gerados de forma estável
  const cloud = useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < 60; i++) {
      const t = (i / 59 - 0.5) * 160;
      const jitter = ((i * 37) % 17) - 8; // pseudo-ruído determinístico
      pts.push({ x: t * ux - jitter * uy * 0.25, y: t * uy + jitter * ux * 0.25 });
    }
    return pts;
  }, [ux, uy]);

  return (
    <div className="not-prose my-6 rounded-xl border border-border bg-surface p-4">
      <div className="grid gap-4 sm:grid-cols-[auto,1fr]">
        <svg
          width={W}
          height={H}
          role="img"
          aria-label={`Diagrama PCA. Erro de reconstrução ${op.error.toFixed(2)}, ${anomaly ? 'anômalo' : 'normal'}.`}
          className="rounded-lg bg-bg"
        >
          {/* eixo principal */}
          <line
            x1={cx - ux * 150}
            y1={cy - uy * 150}
            x2={cx + ux * 150}
            y2={cy + uy * 150}
            stroke="currentColor"
            className="text-accent/50"
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />
          {/* nuvem de treino */}
          {cloud.map((p, i) => (
            <circle key={i} cx={cx + p.x} cy={cy + p.y} r={2} className="fill-muted/50" />
          ))}
          {/* projeção (erro de reconstrução) */}
          <line
            x1={cx + op.px}
            y1={cy + op.py}
            x2={cx + op.rx}
            y2={cy + op.ry}
            stroke="currentColor"
            className={anomaly ? 'text-red-500' : 'text-emerald-500'}
            strokeWidth={2}
          />
          {/* ponto de operação */}
          <circle
            cx={cx + op.px}
            cy={cy + op.py}
            r={6}
            className={anomaly ? 'fill-red-500' : 'fill-emerald-500'}
          />
        </svg>

        <div className="flex flex-col justify-center gap-4 text-sm">
          <Slider label="Variância injetada" value={variance} min={0.2} max={2.5} step={0.1} onChange={setVariance} />
          <Slider label="Desvio do regime (°)" value={angle} min={0} max={90} step={1} onChange={setAngle} />
          <Slider label="Limiar de anomalia" value={threshold} min={0.3} max={3} step={0.1} onChange={setThreshold} />

          <div
            className={`rounded-lg border px-3 py-2 font-mono text-sm ${
              anomaly ? 'border-red-500/40 text-red-500' : 'border-emerald-500/40 text-emerald-500'
            }`}
          >
            erro = {op.error.toFixed(2)} {anomaly ? '> ' : '≤ '} {threshold.toFixed(1)} →{' '}
            <strong>{anomaly ? 'ANÔMALO' : 'normal'}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

function Slider(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex justify-between text-muted">
        <span>{props.label}</span>
        <span className="font-mono">{props.value.toFixed(1)}</span>
      </span>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(e) => props.onChange(parseFloat(e.target.value))}
        className="w-full accent-teal-500"
      />
    </label>
  );
}
