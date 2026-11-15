import { useCallback, useEffect, useState } from 'react';

import {
  initialCooldown,
  isLocked,
  recordFailure as recordFailureState,
  remainingSeconds as remainingSecondsOf,
  type CooldownState,
} from '@/features/auth/loginCooldown';

/** Bloqueio de login somente no cliente (UX); o limite real é do Supabase (D-16). */
export function useLoginRateLimit() {
  const [state, setState] = useState<CooldownState>(initialCooldown);
  const [now, setNow] = useState(() => Date.now());

  const locked = isLocked(state, now);

  useEffect(() => {
    if (state.lockedUntil === null) return;
    setNow(Date.now());
    const id = setInterval(() => {
      const current = Date.now();
      setNow(current);
      setState((s) => (s.lockedUntil !== null && current >= s.lockedUntil ? initialCooldown : s));
    }, 1000);
    return () => clearInterval(id);
  }, [state.lockedUntil]);

  const recordFailure = useCallback(() => {
    const current = Date.now();
    setNow(current);
    setState((s) => recordFailureState(s, current));
  }, []);

  const reset = useCallback(() => setState(initialCooldown), []);

  return {
    isCooldown: locked,
    remainingSeconds: locked ? remainingSecondsOf(state, now) : 0,
    recordFailure,
    reset,
  };
}
