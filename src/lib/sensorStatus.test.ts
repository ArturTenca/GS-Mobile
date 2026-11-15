import { isSensorOffline, rangeViolation, SENSOR_OFFLINE_AFTER_MS } from './sensorStatus';

const now = 1_000_000_000_000;

describe('isSensorOffline (D-05)', () => {
  it('is 2 hours', () => {
    expect(SENSOR_OFFLINE_AFTER_MS).toBe(7_200_000);
  });
  it('null activity is offline', () => {
    expect(isSensorOffline(null, now)).toBe(true);
  });
  it('exactly 2h is online', () => {
    expect(isSensorOffline(now - SENSOR_OFFLINE_AFTER_MS, now)).toBe(false);
  });
  it('2h + 1ms is offline', () => {
    expect(isSensorOffline(now - SENSOR_OFFLINE_AFTER_MS - 1, now)).toBe(true);
  });
  it('recent is online', () => {
    expect(isSensorOffline(now - 1000, now)).toBe(false);
  });
});

describe('rangeViolation', () => {
  const r = { min: 10, max: 30 };
  it('below and above', () => {
    expect(rangeViolation(9.9, r)).toBe('low');
    expect(rangeViolation(30.1, r)).toBe('high');
  });
  it('value at a limit is in range', () => {
    expect(rangeViolation(10, r)).toBeNull();
    expect(rangeViolation(30, r)).toBeNull();
  });
  it('missing threshold or null side never violates', () => {
    expect(rangeViolation(999)).toBeNull();
    expect(rangeViolation(999, null)).toBeNull();
    expect(rangeViolation(999, { min: 0, max: null })).toBeNull();
    expect(rangeViolation(-5, { min: null, max: 10 })).toBeNull();
  });
});
