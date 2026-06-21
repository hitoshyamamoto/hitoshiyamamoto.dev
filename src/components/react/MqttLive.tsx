import { useEffect, useRef, useState } from 'react';

/**
 * Demo de telemetria em tempo real (island local, sem cold start).
 *
 * Por ora simula o stream no cliente. Para dados reais, troque o gerador por
 * uma conexão MQTT sobre WebSocket (mqtt.js) — atrás de uma função serverless
 * quando a credencial do broker não puder ir para o cliente.
 *
 * Honra prefers-reduced-motion pausando a atualização contínua.
 */
const MAX_POINTS = 60;

export default function MqttLive() {
  const [points, setPoints] = useState<number[]>([]);
  const [running, setRunning] = useState(true);
  const reduced = usePrefersReducedMotion();
  const seed = useRef(0.5);

  useEffect(() => {
    if (!running || reduced) return;
    const id = setInterval(() => {
      // passeio aleatório suave, limitado a [0,1]
      seed.current = clamp(seed.current + (Math.random() - 0.5) * 0.15, 0, 1);
      setPoints((prev) => [...prev.slice(-(MAX_POINTS - 1)), seed.current]);
    }, 250);
    return () => clearInterval(id);
  }, [running, reduced]);

  const W = 480;
  const H = 160;
  const last = points.at(-1);

  const path = points
    .map((v, i) => {
      const x = (i / (MAX_POINTS - 1)) * W;
      const y = H - v * H;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div className="not-prose rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="inline-flex items-center gap-2 font-mono">
          <span
            className={`h-2 w-2 rounded-full ${running && !reduced ? 'bg-emerald-500' : 'bg-muted'}`}
            aria-hidden="true"
          />
          telemetria/sensor-01
        </span>
        <span className="font-mono text-muted">
          {last != null ? (last * 100).toFixed(1) : '—'} %
        </span>
      </div>

      <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Gráfico de telemetria ao vivo" className="rounded-lg bg-bg">
        <path d={path} fill="none" stroke="currentColor" className="text-accent" strokeWidth={2} />
        {last != null && (
          <circle cx={W} cy={H - last * H} r={3} className="fill-accent" />
        )}
      </svg>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setRunning((r) => !r)}
          className="btn"
          disabled={reduced}
        >
          {running ? '⏸ Pausar' : '▶ Retomar'}
        </button>
        {reduced && (
          <span className="text-xs text-muted">animação desativada (movimento reduzido)</span>
        )}
      </div>
    </div>
  );
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = () => setReduced(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}
