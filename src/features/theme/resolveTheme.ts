import type { ThemeMode } from '@/theme/tokens';

export type ThemePreference = 'system' | 'light' | 'dark';

export function resolveTheme(
  preference: ThemePreference,
  systemScheme: string | null | undefined,
): ThemeMode {
  if (preference === 'light') return 'light';
  if (preference === 'dark') return 'dark';
  return systemScheme === 'dark' ? 'dark' : 'light';
}
