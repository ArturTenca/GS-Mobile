import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import { auditTextRows, reconcileResolved } from '@/security/audit';
import {
  fetchAuditRows,
  flushPendingSecurityEvents,
  listSecurityEvents,
  recordSecurityEvents,
} from '@/services/security';

export interface AuditResult {
  found: number;
  resolved: number;
}

async function runAudit(): Promise<AuditResult> {
  const rows = await fetchAuditRows();
  const current = auditTextRows(rows);
  const existing = await listSecurityEvents();
  const resolved = reconcileResolved(existing, current);
  await recordSecurityEvents([...current, ...resolved]);
  try {
    await flushPendingSecurityEvents();
  } catch {
    // buffer mantido para a proxima tentativa
  }
  return { found: current.length, resolved: resolved.length };
}

export function useRunAudit() {
  const queryClient = useQueryClient();
  const userId = useAuth().user?.id ?? null;
  // Double-tap guard (T-04.2-39).
  const inFlight = useRef(false);

  const mutation = useMutation({
    mutationFn: runAudit,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['security', userId] }),
  });

  async function run(): Promise<AuditResult | null> {
    if (inFlight.current) return null;
    inFlight.current = true;
    try {
      return await mutation.mutateAsync();
    } catch {
      return null;
    } finally {
      inFlight.current = false;
    }
  }

  return {
    run,
    isRunning: mutation.isPending,
    isError: mutation.isError,
    reset: mutation.reset,
  };
}
