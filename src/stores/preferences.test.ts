import { usePreferencesStore } from '@/stores/preferences';

jest.mock('expo-sqlite/localStorage/install', () => ({}));

describe('usePreferencesStore', () => {
  beforeEach(() =>
    usePreferencesStore.setState({
      theme: 'system',
      tempUnit: 'c',
      notifications: { critical: true, warning: true, daily: false },
    }),
  );

  it('has the expected defaults', () => {
    const s = usePreferencesStore.getState();
    expect(s.theme).toBe('system');
    expect(s.tempUnit).toBe('c');
    expect(s.notifications).toEqual({ critical: true, warning: true, daily: false });
  });

  it('sets theme and unit', () => {
    usePreferencesStore.getState().setTheme('dark');
    usePreferencesStore.getState().setTempUnit('f');
    expect(usePreferencesStore.getState().theme).toBe('dark');
    expect(usePreferencesStore.getState().tempUnit).toBe('f');
  });

  it('setNotification flips only that key', () => {
    usePreferencesStore.getState().setNotification('daily', true);
    expect(usePreferencesStore.getState().notifications).toEqual({
      critical: true,
      warning: true,
      daily: true,
    });
  });

  it('persists only data fields under the expected name/version', () => {
    const opts = usePreferencesStore.persist.getOptions();
    expect(opts.name).toBe('agroalerta.preferences');
    expect(opts.version).toBe(1);
    const partial = opts.partialize!(usePreferencesStore.getState());
    expect(Object.keys(partial as object).sort()).toEqual(['notifications', 'tempUnit', 'theme']);
  });
});
