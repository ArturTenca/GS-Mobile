import { COOLDOWN_MS, initialCooldown, isLocked, MAX_ATTEMPTS, recordFailure, remainingSeconds } from './loginCooldown';

describe('loginCooldown', () => {
  it('constants', () => {
    expect(MAX_ATTEMPTS).toBe(5);
    expect(COOLDOWN_MS).toBe(30000);
  });
  it('4 failures keep unlocked', () => {
    let s = initialCooldown;
    for (let i = 0; i < 4; i++) s = recordFailure(s, 1000);
    expect(s.failures).toBe(4);
    expect(isLocked(s, 1000)).toBe(false);
  });
  it('5th failure locks for 30s and resets failures', () => {
    let s = initialCooldown;
    for (let i = 0; i < 5; i++) s = recordFailure(s, 1000);
    expect(s.lockedUntil).toBe(31000);
    expect(s.failures).toBe(0);
    expect(isLocked(s, 1000)).toBe(true);
  });
  it('remainingSeconds uses ceil', () => {
    const s = { failures: 0, lockedUntil: 31000 };
    expect(remainingSeconds(s, 1000)).toBe(30);
    expect(remainingSeconds(s, 30500)).toBe(1);
  });
  it('unlocks once now >= lockedUntil', () => {
    const s = { failures: 0, lockedUntil: 31000 };
    expect(isLocked(s, 31000)).toBe(false);
    expect(remainingSeconds(s, 31000)).toBe(0);
  });
});
