import { usePreferencesStore } from '@/stores/preferences';

jest.mock('expo-sqlite/localStorage/install', () => ({}));

describe('usePreferencesStore', () => {
  beforeEach(() => usePreferencesStore.setState({ theme: 'system', tempUnit: 'c' }));

  it('has the expected defaults', () => {
    const s = usePreferencesStore.getState();
    expect(s.theme).toBe('system');
    expect(s.tempUnit).toBe('c');
    expect('notifications' in s).toBe(false);
  });

  it('sets theme and unit', () => {
    usePreferencesStore.getState().setTheme('dark');
    usePreferencesStore.getState().setTempUnit('f');
    expect(usePreferencesStore.getState().theme).toBe('dark');
    expect(usePreferencesStore.getState().tempUnit).toBe('f');
  });

  it('persists only data fields under the expected name/version', () => {
    const opts = usePreferencesStore.persist.getOptions();
    expect(opts.name).toBe('agroalerta.preferences');
    expect(opts.version).toBe(2);
    const partial = opts.partialize!(usePreferencesStore.getState());
    expect(Object.keys(partial as object).sort()).toEqual(['tempUnit', 'theme']);
  });

  it('loads a v1 payload with notifications, keeping theme and unit', () => {
    const opts = usePreferencesStore.persist.getOptions();
    const merged = opts.merge!(
      {
        theme: 'dark',
        tempUnit: 'f',
        notifications: { critical: true, warning: false, daily: true },
      },
      usePreferencesStore.getState(),
    ) as unknown as Record<string, unknown>;
    expect(merged.theme).toBe('dark');
    expect(merged.tempUnit).toBe('f');
    expect('notifications' in merged).toBe(false);
  });
});
