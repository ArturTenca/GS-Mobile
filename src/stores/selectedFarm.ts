import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from './persistStorage';

interface SelectedFarmState {
  byUser: Record<string, string>;
  setSelected: (userId: string, farmId: string) => void;
  clear: (userId: string) => void;
}

export const useSelectedFarmStore = create<SelectedFarmState>()(
  persist(
    (set) => ({
      byUser: {},
      setSelected: (userId, farmId) => set((s) => ({ byUser: { ...s.byUser, [userId]: farmId } })),
      clear: (userId) =>
        set((s) => {
          const next = { ...s.byUser };
          delete next[userId];
          return { byUser: next };
        }),
    }),
    {
      name: 'agroalerta.selectedFarm',
      storage: persistStorage,
      partialize: (s) => ({ byUser: s.byUser }),
    },
  ),
);

/** Stored id only counts if it is in the (RLS-filtered) list; else most recent (D-09). */
export function pickSelectedFarm<T extends { id: string }>(
  farms: T[],
  storedId: string | undefined | null,
): T | null {
  if (farms.length === 0) return null;
  return farms.find((f) => f.id === storedId) ?? farms[0];
}
