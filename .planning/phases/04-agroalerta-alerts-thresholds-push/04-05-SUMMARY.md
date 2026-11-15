---
phase: 04-agroalerta-alerts-thresholds-push
plan: 05
subsystem: alerts-ui
tags: [badge, tabbar, alerts]
requires: [04-02]
provides: [usePendingAlertCount, badgeLabel, tab badge]
key-files:
  created: [src/hooks/usePendingAlertCount.ts, src/hooks/usePendingAlertCount.test.ts]
  modified: [src/components/layout/TabBar.tsx, "src/app/(app)/(tabs)/_layout.tsx", "src/app/(app)/(tabs)/index.tsx"]
requirements: [ALRT-05]
completed: 2026-11-15
---

# Phase 4 Plan 05: Pending alert badge Summary

Single `usePendingAlertCount` hook (useAlerts + countPending) feeds both the Alertas tab badge (1-9, "9+", hidden at 0) and the Início count line.

## Tasks
1. Hook + `badgeLabel` with tests - 8274893
2. TabBar badge rendering (errorFill, hidden from a11y, label "Alertas, n alertas pendentes"), layout wiring, Início count - 8266338

## Deviations from Plan
- Hook test mocks `@/hooks/useAlerts` because the real import chain loads expo-sqlite (expo-asset missing in jest env). No behavior change.
- Worktree was reset to the expected base 0686e6f at start.

## Notes
- Início's list-visibility guard still uses `overview.alerts` (per plan); only the count line uses the shared hook.
- Typecheck, ui-rules, and full jest (358 tests) pass.

## Self-Check: PASSED
