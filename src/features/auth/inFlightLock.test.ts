import { createInFlightLock } from './inFlightLock';

describe('createInFlightLock', () => {
  it('acquires once until released', () => {
    const lock = createInFlightLock();
    expect(lock.tryAcquire()).toBe(true);
    expect(lock.tryAcquire()).toBe(false);
    lock.release();
    expect(lock.tryAcquire()).toBe(true);
  });

  it('stays usable after a throw when released in finally', async () => {
    const lock = createInFlightLock();
    const run = async () => {
      if (!lock.tryAcquire()) return;
      try {
        throw new Error('boom');
      } finally {
        lock.release();
      }
    };
    await expect(run()).rejects.toThrow('boom');
    expect(lock.tryAcquire()).toBe(true);
  });

  it('instances are independent', () => {
    const a = createInFlightLock();
    const b = createInFlightLock();
    expect(a.tryAcquire()).toBe(true);
    expect(b.tryAcquire()).toBe(true);
  });
});
