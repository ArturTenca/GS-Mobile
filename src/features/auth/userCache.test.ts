import { QueryClient, QueryObserver } from '@tanstack/react-query';

import { handleUserChange } from './userCache';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function startSlowQuery(qc: QueryClient, key: string) {
  const obs = new QueryObserver(qc, {
    queryKey: [key],
    queryFn: () => new Promise<number>((r) => setTimeout(() => r(1), 30)),
  });
  const unsubscribe = obs.subscribe(() => {});
  return { obs, unsubscribe };
}

describe('handleUserChange', () => {
  it('first sign-in does not cancel in-flight screen requests (regression: endless "Preparando sua propriedade")', async () => {
    const qc = new QueryClient();
    const { obs, unsubscribe } = startSlowQuery(qc, 'farms');
    await wait(5);
    handleUserChange(qc, null, 'user-a');
    await wait(80);
    expect(obs.getCurrentResult().status).toBe('success');
    expect(obs.getCurrentResult().isLoading).toBe(false);
    unsubscribe();
    qc.clear();
  });

  it('switching users wipes the previous owner data and refetches active queries', async () => {
    const qc = new QueryClient();
    qc.setQueryData(['inactive-old-user'], 'secret');
    const { obs, unsubscribe } = startSlowQuery(qc, 'overview');
    await wait(60);
    expect(obs.getCurrentResult().data).toBe(1);
    handleUserChange(qc, 'user-a', 'user-b');
    expect(qc.getQueryData(['inactive-old-user'])).toBeUndefined();
    expect(obs.getCurrentResult().data).toBeUndefined();
    await wait(80);
    expect(obs.getCurrentResult().status).toBe('success');
    unsubscribe();
    qc.clear();
  });

  it('same user does nothing', () => {
    const qc = new QueryClient();
    qc.setQueryData(['x'], 1);
    handleUserChange(qc, 'user-a', 'user-a');
    expect(qc.getQueryData(['x'])).toBe(1);
  });
});
