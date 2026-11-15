import { StatusBar } from 'expo-status-bar';
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { usePreferencesStore } from '@/stores/preferences';
import { darkColors, lightColors, type Colors, type ThemeMode } from '@/theme/tokens';

import { resolveTheme, type ThemePreference } from './resolveTheme';

type ThemeContextValue = {
  theme: ThemeMode;
  colors: Colors;
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const preference = usePreferencesStore((s) => s.theme);
  const setPreference = usePreferencesStore((s) => s.setTheme);
  const theme: ThemeMode = resolveTheme(preference, scheme);
  const colors = theme === 'dark' ? darkColors : lightColors;

  const toggleTheme = useCallback(() => {
    setPreference(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setPreference]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, colors, preference, setPreference, setTheme: setPreference, toggleTheme }),
    [theme, colors, preference, setPreference, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme deve ser usado dentro de ThemeProvider');
  }
  return ctx;
}
