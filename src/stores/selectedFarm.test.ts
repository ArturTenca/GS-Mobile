import { pickSelectedFarm, useSelectedFarmStore } from '@/stores/selectedFarm';

jest.mock('expo-sqlite/localStorage/install', () => ({}));

const farms = [{ id: 'f2' }, { id: 'f1' }];

describe('pickSelectedFarm', () => {
  it('returns the stored farm when present', () => {
    expect(pickSelectedFarm(farms, 'f1')).toEqual({ id: 'f1' });
  });
  it('falls back to the most recent on stale id', () => {
    expect(pickSelectedFarm(farms, 'gone')).toEqual({ id: 'f2' });
    expect(pickSelectedFarm(farms, undefined)).toEqual({ id: 'f2' });
  });
  it('returns null for an empty list', () => {
    expect(pickSelectedFarm([], 'f1')).toBeNull();
  });
});

describe('useSelectedFarmStore', () => {
  beforeEach(() => useSelectedFarmStore.setState({ byUser: {} }));

  it('keeps selections per user', () => {
    useSelectedFarmStore.getState().setSelected('a', 'f1');
    const { byUser } = useSelectedFarmStore.getState();
    expect(byUser.a).toBe('f1');
    expect(byUser.b).toBeUndefined();
  });
  it('clear removes only that user', () => {
    const s = useSelectedFarmStore.getState();
    s.setSelected('a', 'f1');
    s.setSelected('b', 'f2');
    s.clear('a');
    expect(useSelectedFarmStore.getState().byUser).toEqual({ b: 'f2' });
  });
  it('works without localStorage (in-memory fallback) and persists through the store API', () => {
    expect(typeof localStorage).toBe('undefined');
    useSelectedFarmStore.getState().setSelected('a', 'f9');
    expect(useSelectedFarmStore.getState().byUser.a).toBe('f9');
    expect(useSelectedFarmStore.persist.getOptions().name).toBe('agroalerta.selectedFarm');
  });
});
