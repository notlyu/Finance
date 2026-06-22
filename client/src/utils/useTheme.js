import { useCallback, useEffect, useState } from 'react';

const THEME_KEY = 'theme';

/**
 * useTheme() — единый хук управления темой приложения.
 * Читает/пишет localStorage['theme'] и переключает html.classList.
 * Значения: 'light' | 'dark' | 'system'
 *
 * Заменяет дублированную логику в App.js, Settings.jsx и других файлах.
 */
export function useTheme() {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem(THEME_KEY) || 'system';
  });

  // Применить тему к <html>
  const applyTheme = useCallback((value) => {
    const root = document.documentElement;
    if (value === 'dark') {
      root.classList.add('dark');
    } else if (value === 'light') {
      root.classList.remove('dark');
    } else {
      // system
      const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
      if (prefersDark) root.classList.add('dark');
      else root.classList.remove('dark');
    }
  }, []);

  // При монтировании применяем сохранённую тему
  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  // Следим за системной темой когда выбрано 'system'
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => {
      document.documentElement.classList.toggle('dark', e.matches);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = useCallback((value) => {
    localStorage.setItem(THEME_KEY, value);
    setThemeState(value);
    applyTheme(value);
  }, [applyTheme]);

  const toggleTheme = useCallback(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'light' : 'dark');
  }, [setTheme]);

  const isDark = typeof window !== 'undefined' &&
    document.documentElement.classList.contains('dark');

  return { theme, setTheme, toggleTheme, isDark };
}

export default useTheme;
