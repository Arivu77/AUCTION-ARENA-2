import { createContext, useContext, useState } from 'react';
const ThemeContext = createContext({ theme: 'dark', toggleTheme: () => {} });
export function useTheme() { return useContext(ThemeContext); }
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('dark');
  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}
