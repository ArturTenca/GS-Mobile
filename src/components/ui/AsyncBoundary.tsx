import type { ReactNode } from 'react';

import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';

type AsyncBoundaryProps = {
  query: { isLoading: boolean; isError: boolean; refetch: () => unknown; isRefetching?: boolean };
  isEmpty: boolean;
  empty: ReactNode;
  loadingMessage?: string;
  children: ReactNode;
};

/** Gives every remote-data screen its four states: loading, error, empty, content. */
export function AsyncBoundary({ query, isEmpty, empty, loadingMessage, children }: AsyncBoundaryProps) {
  if (query.isLoading) return <LoadingState message={loadingMessage} />;
  if (query.isError) {
    return <ErrorState onRetry={() => void query.refetch()} retrying={query.isRefetching} />;
  }
  if (isEmpty) return <>{empty}</>;
  return <>{children}</>;
}
