jest.mock('@/hooks/useAlerts', () => ({ useAlerts: jest.fn() }));

import { badgeLabel } from './usePendingAlertCount';

describe('badgeLabel', () => {
  it('hides at 0', () => expect(badgeLabel(0)).toBeUndefined());
  it('shows 1', () => expect(badgeLabel(1)).toBe(1));
  it('shows 9', () => expect(badgeLabel(9)).toBe(9));
  it('caps at 9+ from 10', () => {
    expect(badgeLabel(10)).toBe('9+');
    expect(badgeLabel(250)).toBe('9+');
  });
});
