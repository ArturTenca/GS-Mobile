// Máquina de estados pura do bloqueio de login (somente UX; o limite real é do Supabase).
export const MAX_ATTEMPTS = 5;
export const COOLDOWN_MS = 30_000;

export type CooldownState = { failures: number; lockedUntil: number | null };

export const initialCooldown: CooldownState = { failures: 0, lockedUntil: null };

export function recordFailure(state: CooldownState, now: number): CooldownState {
  const failures = state.failures + 1;
  if (failures >= MAX_ATTEMPTS) {
    return { failures: 0, lockedUntil: now + COOLDOWN_MS };
  }
  return { failures, lockedUntil: state.lockedUntil };
}

export function isLocked(state: CooldownState, now: number): boolean {
  return state.lockedUntil !== null && now < state.lockedUntil;
}

export function remainingSeconds(state: CooldownState, now: number): number {
  if (state.lockedUntil === null || !isLocked(state, now)) return 0;
  return Math.ceil((state.lockedUntil - now) / 1000);
}
