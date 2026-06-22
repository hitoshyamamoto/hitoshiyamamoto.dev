import { useMemo, useState } from 'react';

/**
 * Visualização 2D do mecanismo do PCA: projeta a leitura sobre o eixo principal
 * e mede a distância residual (o erro de reconstrução). Modelo ilustrativo.
 */
export default function PcaSimulator() {
  const [variance, setVariance] = useState(1.0);
  const [angle, setAngle] = useState(25);
  const [threshold, setThreshold] = useState(1.5);

  const W = 360;
  const H = 240;
  const cx = W / 2;
  const cy = H / 2;

  // Eixo principal aprendido (componente 1): inclinado 30° na tela.
  const pcAngle = (30 * Math.PI) / 180;
  const ux = Math.cos(pcAngle);
  const uy = Math.sin(pcAngle);

  const op = useMemo(() => {
    const rad = (angle * Math.PI) / 180;
    const r = 70;
    const px = Math.cos(rad) * r * variance;
    const py = Math.sin(rad) * r * variance;
    const proj = px * ux + py * uy; // projeção escalar sobre o eixo
    const rx = proj * ux;
    const ry = proj * uy;
    const error = Math.hypot(px - rx, py - ry) / 40; // distância ao eixo, normalizada
    return { px, py, rx, ry, error };
  }, [angle, variance, ux, uy]);

  const anomaly = op.error > threshold;

  // nuvem de treino ao longo do eixo principal (pseudo-aleatória estável)
  const cloud = useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < 60; i++) {
      const t = (i / 59 - 0.5) * 160;
      const jitter = ((i * 37) % 17) - 8;
      pts.push({ x: t * ux - jitter * uy * 0.25, y: t * uy + jitter * ux * 0.25 });
    }
    return pts;
  }, [ux, uy]);

  return (
    <div className="not-prose my-6 rounded-xl border border-border bg-surface p-4">
      <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
        <svg
          width={W}
          height={H}
          role="img"
          aria-label={`Diagrama PCA. Erro de reconstrução ${op.error.toFixed(2)}, classificado como ${anomaly ? 'anômalo' : 'normal'}.`}
          className="mx-auto rounded-lg bg-bg"
        >
          {/* eixo principal aprendido */}
          <line
            x1={cx - ux * 150}
            y1={cy - uy * 150}
            x2={cx + ux * 150}
            y2={cy + uy * 150}
            stroke="currentColor"
            className="text-accent/60"
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />
          <text x={cx + ux * 118 + 4} y={cy + uy * 118 + 14} className="fill-accent" fontSize="10">
            eixo aprendido
          </text>

          {/* nuvem do regime normal */}
          {cloud.map((p, i) => (
            <circle key={i} cx={cx + p.x} cy={cy + p.y} r={2} className="fill-muted/50" />
          ))}

          {/* segmento do erro de reconstrução */}
          <line
            x1={cx + op.px}
            y1={cy + op.py}
            x2={cx + op.rx}
            y2={cy + op.ry}
            stroke="currentColor"
            className={anomaly ? 'text-red-500' : 'text-emerald-500'}
            strokeWidth={2}
          />
          {/* pé da projeção sobre o eixo */}
          <circle cx={cx + op.rx} cy={cy + op.ry} r={3} className="fill-muted" />

          {/* ponto de operação atual */}
          <circle cx={cx + op.px} cy={cy + op.py} r={6} className={anomaly ? 'fill-red-500' : 'fill-emerald-500'} />
          <text
            x={cx + op.px + 9}
            y={cy + op.py + 3}
            className={anomaly ? 'fill-red-500' : 'fill-emerald-500'}
            fontSize="10"
          >
            agora
          </text>
        </svg>

        <div className="flex flex-col justify-center gap-4 text-sm">
          <Slider label="Variância injetada" hint="amplitude do desvio" value={variance} min={0.2} max={2.5} step={0.1} onChange={setVariance} />
          <Slider label="Desvio do regime (°)" hint="quanto foge da direção normal" value={angle} min={0} max={90} step={1} onChange={setAngle} />
          <Slider label="Limiar de anomalia" hint="acima disto = alarme" value={threshold} min={0.3} max={3} step={0.1} onChange={setThreshold} />

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

      <p className="mt-3 text-xs text-muted">
        O <span className="text-emerald-500">ponto verde</span> é a leitura atual; a bolinha cinza sobre o eixo é
        sua projeção. O segmento entre os dois é o <strong>erro de reconstrução</strong>, a distância ao padrão
        aprendido. Empurre o ponto para longe do eixo e o erro cresce até virar alarme.
      </p>
    </div>
  );
}

function Slider(props: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-baseline justify-between gap-2 text-muted">
        <span>
          {props.label} <span className="text-xs opacity-70">· {props.hint}</span>
        </span>
        <span className="font-mono text-fg">{props.value.toFixed(1)}</span>
      </span>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(e) => props.onChange(parseFloat(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-border accent-teal-500"
      />
    </label>
  );
}
