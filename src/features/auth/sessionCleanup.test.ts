import { clearUserScopedState } from '@/features/auth/sessionCleanup';
import { useSelectedFarmStore } from '@/stores/selectedFarm';

jest.mock('expo-sqlite/localStorage/install', () => ({}));

describe('clearUserScopedState', () => {
  beforeEach(() => {
    useSelectedFarmStore.setState({ byUser: { u1: 'f1', u2: 'f2' } });
  });

  it('removes only the given user entry', () => {
    clearUserScopedState('u1');
    expect(useSelectedFarmStore.getState().byUser).toEqual({ u2: 'f2' });
  });

  it('is a no-op for null', () => {
    clearUserScopedState(null);
    expect(useSelectedFarmStore.getState().byUser).toEqual({ u1: 'f1', u2: 'f2' });
  });
});
