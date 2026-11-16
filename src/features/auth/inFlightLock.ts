import { useRef } from 'react';

export interface InFlightLock {
  /** Síncrono: true se adquiriu; false se já há uma requisição em andamento. */
  tryAcquire: () => boolean;
  release: () => void;
}

export function createInFlightLock(): InFlightLock {
  let held = false;
  return {
    tryAcquire() {
      if (held) return false;
      held = true;
      return true;
    },
    release() {
      held = false;
    },
  };
}

/** Trava estável entre renders; evita duplo toque antes do estado `submitting` renderizar. */
export function useInFlightLock(): InFlightLock {
  const ref = useRef<InFlightLock | null>(null);
  if (ref.current === null) ref.current = createInFlightLock();
  return ref.current;
}
