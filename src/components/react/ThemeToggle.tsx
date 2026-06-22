import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'coffee';

// Ciclo de temas; o ícone mostra o tema ATUAL.
const ORDER: Theme[] = ['light', 'dark', 'coffee'];
const ICON: Record<Theme, string> = { light: '☀', dark: '☾', coffee: '☕' };
const LABEL: Record<Theme, string> = { light: 'claro', dark: 'escuro', coffee: 'café' };

/** Alterna entre os temas (claro · escuro · café) e persiste em localStorage. */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const current = document.documentElement.dataset.theme as Theme | undefined;
    setTheme(current ?? 'dark');
  }, []);

  function cycle() {
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem('theme', next);
  }

  const nextTheme = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Tema atual: ${LABEL[theme]}. Mudar para ${LABEL[nextTheme]}.`}
      title={`Tema: ${LABEL[theme]}`}
      className="rounded-md border border-border px-2 py-1.5 text-sm text-muted transition-colors hover:border-accent hover:text-accent"
    >
      <span aria-hidden="true">{mounted ? ICON[theme] : '☾'}</span>
    </button>
  );
}
