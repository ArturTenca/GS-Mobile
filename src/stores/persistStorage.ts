import 'expo-sqlite/localStorage/install';
import { createJSONStorage, type StateStorage } from 'zustand/middleware';

const memory = new Map<string, string>();
const memoryStorage: StateStorage = {
  getItem: (k) => memory.get(k) ?? null,
  setItem: (k, v) => {
    memory.set(k, v);
  },
  removeItem: (k) => {
    memory.delete(k);
  },
};

/** Shared zustand storage: localStorage (web or expo-sqlite shim on native), else in-memory. */
export const persistStorage = createJSONStorage(() =>
  typeof localStorage !== 'undefined' ? localStorage : memoryStorage,
);
