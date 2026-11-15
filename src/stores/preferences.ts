import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { ThemePreference } from '@/features/theme/resolveTheme';

import { persistStorage } from './persistStorage';

export type TempUnit = 'c' | 'f';

interface PreferencesState {
  theme: ThemePreference;
  tempUnit: TempUnit;
  setTheme: (theme: ThemePreference) => void;
  setTempUnit: (unit: TempUnit) => void;
}

const THEMES: ThemePreference[] = ['system', 'light', 'dark'];

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: 'system',
      tempUnit: 'c',
      setTheme: (theme) => set({ theme }),
      setTempUnit: (tempUnit) => set({ tempUnit }),
    }),
    {
      name: 'agroalerta.preferences',
      version: 2,
      storage: persistStorage,
      partialize: (s) => ({ theme: s.theme, tempUnit: s.tempUnit }),
      // Validate stored (user-controlled) values; unknown values fall back to defaults (T-02.2-01).
      // Old persisted keys (v1 `notifications`) are ignored: prefs now live server-side.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PreferencesState>;
        return {
          ...current,
          theme: THEMES.includes(p.theme as ThemePreference) ? (p.theme as ThemePreference) : current.theme,
          tempUnit: p.tempUnit === 'c' || p.tempUnit === 'f' ? p.tempUnit : current.tempUnit,
        };
      },
    },
  ),
);
