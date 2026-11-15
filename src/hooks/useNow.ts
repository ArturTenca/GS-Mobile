import { useEffect, useState } from 'react';

/**
 * Ticking "now" (ms). Only ages relative labels ("Atualizado há X min");
 * it never recomputes demo offsets, which are fixed once in the service.
 */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
