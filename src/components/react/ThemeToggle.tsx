import { useEffect, useState } from 'react';

/** Island minúscula: alterna claro/escuro e persiste em localStorage. */
export default function ThemeToggle() {
  const [dark, setDark] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Ativar tema claro' : 'Ativar tema escuro'}
      title={dark ? 'Tema claro' : 'Tema escuro'}
      className="rounded-md border border-border px-2 py-1.5 text-sm text-muted transition-colors hover:border-accent hover:text-accent"
    >
      {/* Evita mismatch de hidratação antes de ler o estado real. */}
      <span aria-hidden="true">{mounted ? (dark ? '☀' : '☾') : '☾'}</span>
    </button>
  );
}
