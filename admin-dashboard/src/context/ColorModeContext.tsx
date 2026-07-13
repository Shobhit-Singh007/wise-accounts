import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { type Mode } from '../theme';

interface ColorModeContextType {
  mode: Mode;
  toggleMode: () => void;
}

const ColorModeContext = createContext<ColorModeContextType>({ mode: 'light', toggleMode: () => {} });

export function ColorModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>(() => {
    const saved = localStorage.getItem('colorMode');
    return (saved === 'dark' || saved === 'light') ? saved : 'light';
  });

  const toggleMode = useCallback(() => {
    setMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('colorMode', next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ mode, toggleMode }), [mode, toggleMode]);

  return (
    <ColorModeContext.Provider value={value}>
      {children}
    </ColorModeContext.Provider>
  );
}

export function useColorMode() {
  return useContext(ColorModeContext);
}
