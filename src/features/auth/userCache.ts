import type { QueryClient } from '@tanstack/react-query';

/**
 * Drops one owner's cached server data when the signed-in user changes.
 * The first sign-in of the app (no previous user) keeps the cache: screens have already
 * started their requests at that point, and a clear() would cancel them silently and
 * leave the UI loading forever. On a real user switch or sign-out, inactive data is
 * removed and active queries are reset (data wiped, then refetched under the new session).
 */
export function handleUserChange(qc: QueryClient, prevUserId: string | null, nextUserId: string | null): void {
  if (prevUserId === null || prevUserId === nextUserId) return;
  qc.removeQueries({ type: 'inactive' });
  void qc.resetQueries({ type: 'active' });
}
