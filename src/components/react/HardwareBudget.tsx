import { useMemo, useState } from 'react';

/**
 * Estima compute e memória do PCA embarcado a partir de d, k, W, N e precisão,
 * pelas ordens O(dk) na inferência e O(Nd² + d³) no treino.
 */

function fmtBytes(n: number): string {
  if (n < 1024) return `${n.toFixed(0)} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(2)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}
function fmtFlops(n: number, perSec = false): string {
  const s = perSec ? '/s' : '';
  if (n < 1e3) return `${n.toFixed(0)} FLOP${s}`;
  if (n < 1e6) return `${(n / 1e3).toFixed(1)} kFLOP${s}`;
  if (n < 1e9) return `${(n / 1e6).toFixed(1)} MFLOP${s}`;
  return `${(n / 1e9).toFixed(2)} GFLOP${s}`;
}

function NumField(props: { label: string; value: number; onChange: (v: number) => void; min: number; step?: number }) {
  return (
    <label className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted">{props.label}</span>
      <input
        type="number"
        value={props.value}
        min={props.min}
        step={props.step ?? 1}
        onChange={(e) => props.onChange(Math.max(props.min, Number(e.target.value) || props.min))}
        className="w-28 rounded-md border border-border bg-bg px-2 py-1 text-right font-mono text-fg"
      />
    </label>
  );
}

export default function HardwareBudget() {
  const [d, setD] = useState(51);
  const [k, setK] = useState(10);
  const [W, setW] = useState(500);
  const [N, setN] = useState(10000);
  const [fs, setFs] = useState(1 / 60); // Hz (1/min)
  const [bytes, setBytes] = useState(4); // float32
  const [L, setL] = useState(0); // lags do DPCA
  const [trainOnDevice, setTrainOnDevice] = useState(false);

  const r = useMemo(() => {
    const de = d * (L + 1); // dimensão efetiva (DPCA)
    const model = (de * k + 2 * de + k) * bytes; // P, média, escala, autovalores
    const buffer = W * de * bytes; // buffer de janela (0 no EWMA puro → W=1)
    const working = (de + k) * bytes;
    const infMem = model + buffer + working;

    const infPerSample = 4 * de * k; // projetar + reconstruir dominam
    const infRate = infPerSample * fs;

    const trainMem = (N * de + de * de) * bytes;
    const trainFlops = N * de * de + de * de * de;

    const peakRaw = trainOnDevice ? Math.max(infMem, trainMem) : infMem;
    const peak = peakRaw * 1.7; // margem p/ SO, pilha, fragmentação

    return { de, model, buffer, infMem, infPerSample, infRate, trainMem, trainFlops, peak };
  }, [d, k, W, N, fs, bytes, L, trainOnDevice]);

  return (
    <div className="not-prose my-6 rounded-xl border border-border bg-surface p-4">
      <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        <NumField label="sensores d" value={d} onChange={setD} min={1} />
        <NumField label="componentes k" value={k} onChange={setK} min={1} />
        <NumField label="janela W (amostras; 1 = EWMA)" value={W} onChange={setW} min={1} />
        <NumField label="treino N (amostras)" value={N} onChange={setN} min={1} step={500} />
        <NumField label="taxa fs (Hz)" value={Number(fs.toFixed(4))} onChange={setFs} min={0.0001} step={0.1} />
        <NumField label="lags L (DPCA; 0 = estático)" value={L} onChange={setL} min={0} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <div className="flex gap-1" role="group" aria-label="Precisão">
          {[
            { b: 4, l: 'float32' },
            { b: 8, l: 'float64' },
          ].map((o) => (
            <button key={o.b} type="button" onClick={() => setBytes(o.b)} aria-pressed={bytes === o.b} className={`rounded-md border px-2.5 py-1 transition-colors ${bytes === o.b ? 'border-accent text-accent' : 'border-border text-muted hover:border-accent/50'}`}>
              {o.l}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setTrainOnDevice((v) => !v)} aria-pressed={trainOnDevice} className={`rounded-md border px-2.5 py-1 transition-colors ${trainOnDevice ? 'border-accent text-accent' : 'border-border text-muted hover:border-accent/50'}`}>
          treinar no dispositivo: {trainOnDevice ? 'sim' : 'não'}
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-bg p-3">
          <div className="text-xs uppercase tracking-wide text-muted">Inferência (sempre)</div>
          <dl className="mt-1 space-y-0.5 font-mono text-sm">
            <div className="flex justify-between"><dt className="text-muted">compute</dt><dd>{fmtFlops(r.infRate, true)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">modelo</dt><dd>{fmtBytes(r.model)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">buffer</dt><dd>{fmtBytes(r.buffer)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">RAM</dt><dd className="text-fg">{fmtBytes(r.infMem)}</dd></div>
          </dl>
        </div>
        <div className="rounded-lg border border-border bg-bg p-3">
          <div className="text-xs uppercase tracking-wide text-muted">Treino (raro)</div>
          <dl className="mt-1 space-y-0.5 font-mono text-sm">
            <div className="flex justify-between"><dt className="text-muted">compute</dt><dd>{fmtFlops(r.trainFlops)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">RAM</dt><dd className="text-fg">{fmtBytes(r.trainMem)}</dd></div>
          </dl>
        </div>
        <div className="rounded-lg border border-accent/40 bg-bg p-3">
          <div className="text-xs uppercase tracking-wide text-accent">Pico de RAM (×1,7)</div>
          <div className="mt-1 font-mono text-2xl text-accent">{fmtBytes(r.peak)}</div>
          <div className="text-xs text-muted">GPU: nenhuma (matrizes minúsculas)</div>
        </div>
      </div>

      <p className="mt-3 text-xs text-muted">
        A inferência é desprezível (≈ 4·d·k FLOPs/amostra); o que pesa é o <strong>buffer de janela</strong>
        (W·d) e, se você treinar no dispositivo, o <strong>bloco de treino</strong> (N·d + d²) e o O(d³) da
        decomposição. Treine fora e embarque só os pesos para zerar essas duas pontas.
      </p>
    </div>
  );
}
