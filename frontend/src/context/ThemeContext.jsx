import { createContext, useContext, useEffect } from 'react';

const ThemeContext = createContext();
export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }) {
  // Store is light-only — dark mode retired. Force light and keep it locked.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark');
    localStorage.setItem('cf_theme', 'light');
  }, []);

  // `toggle` kept as a no-op so any lingering caller doesn't break.
  const toggle = () => {};

  return <ThemeContext.Provider value={{ theme: 'light', toggle }}>{children}</ThemeContext.Provider>;
}
