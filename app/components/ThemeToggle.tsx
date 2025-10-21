'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'bill-tracker-theme';

type Theme = 'light' | 'dark';

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    root.style.setProperty('color-scheme', 'dark');
  } else {
    root.classList.remove('dark');
    root.style.setProperty('color-scheme', 'light');
  }
  window.localStorage.setItem(STORAGE_KEY, theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored === 'light' || stored === 'dark') {
      setTheme(stored);
      applyTheme(stored);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initial = prefersDark ? 'dark' : 'light';
      setTheme(initial);
      applyTheme(initial);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === 'undefined') {
      return;
    }
    applyTheme(theme);
  }, [theme, mounted]);

  function toggleTheme() {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }

  const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      className="inline-flex items-center gap-2 rounded-full border border-mutedLight px-3 py-1.5 text-sm font-medium text-textDark transition hover:border-textDark dark:border-muted dark:text-textPrimary/80 dark:hover:border-textPrimary"
    >
      <span className="text-lg" role="img" aria-hidden="true">
        {theme === 'dark' ? '🌙' : '☀️'}
      </span>
      <span>{theme === 'dark' ? 'Dark' : 'Light'} mode</span>
    </button>
  );
}
