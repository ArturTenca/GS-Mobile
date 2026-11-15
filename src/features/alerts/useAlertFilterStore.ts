import { create } from 'zustand';

import type { AlertStatusFilter } from '@/features/alerts/filter';
import type { AlertCategory, AlertSeverity } from '@/types/database';

interface AlertFilterState {
  status: AlertStatusFilter;
  category: AlertCategory | null;
  severity: AlertSeverity | null;
  setStatus: (status: AlertStatusFilter) => void;
  setCategory: (category: AlertCategory | null) => void;
  setSeverity: (severity: AlertSeverity | null) => void;
  /** Resets category and severity only (UI-SPEC S1). */
  clearFilters: () => void;
}

// In-memory only: filters are not persisted (U14).
export const useAlertFilterStore = create<AlertFilterState>((set) => ({
  status: 'pendentes',
  category: null,
  severity: null,
  setStatus: (status) => set({ status }),
  setCategory: (category) => set({ category }),
  setSeverity: (severity) => set({ severity }),
  clearFilters: () => set({ category: null, severity: null }),
}));
