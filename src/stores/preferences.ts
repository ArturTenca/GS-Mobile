import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { ThemePreference } from '@/features/theme/resolveTheme';

import { persistStorage } from './persistStorage';

export type TempUnit = 'c' | 'f';
export type NotificationKey = 'critical' | 'warning' | 'daily';
export type NotificationPrefs = Record<NotificationKey, boolean>;

interface PreferencesState {
  theme: ThemePreference;
  tempUnit: TempUnit;
  notifications: NotificationPrefs;
  setTheme: (theme: ThemePreference) => void;
  setTempUnit: (unit: TempUnit) => void;
  setNotification: (key: NotificationKey, value: boolean) => void;
}

const DEFAULT_NOTIFICATIONS: NotificationPrefs = { critical: true, warning: true, daily: false };

const THEMES: ThemePreference[] = ['system', 'light', 'dark'];

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: 'system',
      tempUnit: 'c',
      notifications: DEFAULT_NOTIFICATIONS,
      setTheme: (theme) => set({ theme }),
      setTempUnit: (tempUnit) => set({ tempUnit }),
      setNotification: (key, value) =>
        set((s) => ({ notifications: { ...s.notifications, [key]: value } })),
    }),
    {
      name: 'agroalerta.preferences',
      version: 1,
      storage: persistStorage,
      partialize: (s) => ({ theme: s.theme, tempUnit: s.tempUnit, notifications: s.notifications }),
      // Validate stored (user-controlled) values; unknown values fall back to defaults (T-02.2-01).
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PreferencesState>;
        const n = (p.notifications ?? {}) as Partial<NotificationPrefs>;
        return {
          ...current,
          theme: THEMES.includes(p.theme as ThemePreference) ? (p.theme as ThemePreference) : current.theme,
          tempUnit: p.tempUnit === 'c' || p.tempUnit === 'f' ? p.tempUnit : current.tempUnit,
          notifications: {
            critical: typeof n.critical === 'boolean' ? n.critical : current.notifications.critical,
            warning: typeof n.warning === 'boolean' ? n.warning : current.notifications.warning,
            daily: typeof n.daily === 'boolean' ? n.daily : current.notifications.daily,
          },
        };
      },
    },
  ),
);
