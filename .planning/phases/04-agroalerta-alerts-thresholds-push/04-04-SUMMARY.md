---
phase: 04-agroalerta-alerts-thresholds-push
plan: 04
subsystem: alerts
tags: [alerts, evidence, status-mutation, react-query]
requires: ["04-02"]
provides: [updateAlertStatus, AlertDetail evidence fields, ReadingEvidence, alert detail actions]
affects: [alerta/[id] screen]
key-files:
  created: [src/hooks/useUpdateAlertStatus.ts, src/components/alerts/ReadingEvidence.tsx]
  modified: [src/services/alerts.ts, src/services/alerts.test.ts, "src/app/(app)/alerta/[id].tsx"]
requirements-completed: [ALRT-04, ALRT-06]
completed: 2026-11-15
---

# Phase 4 Plan 04: Alert detail slice Summary

Alert detail marks novo alerts visualizado once, resolves via confirm dialog, and shows the violating reading against the current threshold.

## Tasks
1. updateAlertStatus (visualizado guarded by status=novo; resolvido uses select().single()), evidence fields in getAlert (demo-shifted), useUpdateAlertStatus hook invalidating alerts/alert/home. Commit 4fcea62.
2. ReadingEvidence card (threshold + offline variants, null for weather) and detail screen: category badge, resolve ConfirmDialog ("Agora não"), success notices, Monitoramento / Alertas links, back fallback `/alertas`. See git log for hash.

## Deviations from Plan
None. Task 1 reused salvaged work from the interrupted attempt after re-verification (jest 360 passing, typecheck, ui-rules, eslint clean).

## Known Stubs
None.

## Self-Check: PASSED
