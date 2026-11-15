---
phase: 02-onboarding-in-cio
plan: 02
subsystem: condition-domain
tags: [pure-logic, jest, tdd, supabase-view, demo-time]
requires: []
provides:
  - deriveCondition (D-01..D-07), selectMetric
  - sensorStatus (SENSOR_OFFLINE_AFTER_MS, isSensorOffline, rangeViolation)
  - formatTime / formatNumber PT-BR helpers (no Intl)
  - demoTime (computeDemoOffset, shiftTs, shiftDemoRow, DEMO_FRESHNESS_MS)
  - migration 005 latest_readings view (file only, not applied)
affects: [02-03, 02-05, 02-06]
tech-stack:
  added: []
  patterns: [injected now, read-time demo anchoring, security_invoker view]
key-files:
  created:
    - src/lib/sensorStatus.ts
    - src/lib/formatTime.ts
    - src/lib/formatNumber.ts
    - src/services/demoTime.ts
    - src/features/condition/types.ts
    - src/features/condition/reasons.ts
    - src/features/condition/deriveCondition.ts
    - src/features/condition/selectMetric.ts
    - supabase/migrations/005_latest_readings.sql
  modified:
    - supabase/setup_completo.sql
key-decisions:
  - "Warning outranks info within alert tier; newest first within equal severity"
  - "Alert with null recommendation falls back to a generic PT-BR action"
  - "Sensors with no activity data count as offline"
requirements-completed: []
duration: ~20min
completed: 2026-11-12
---

# Phase 2 Plan 02: Condition domain core Summary

Pure, tested domain core for Início (condition derivation, metric selection, 2 h offline rule, demo time anchoring, PT-BR time/number formatting) plus migration 005 for the latest-reading view.

## Tasks
1. Offline rule, demo time, formatting - b3c1375
2. deriveCondition, reasons, selectMetric - 25a80c1 (19-case matrix + demo fixture, selectMetric cases)
3. Migration 005 + setup_completo append (001..005) - c2a5353

## Verification
jest 141/141, tsc clean, expo lint 0 errors (5 pre-existing warnings), check-ui-rules OK. No Date.now/Intl in the pure modules; demoTime has no supabase import. Migration 005 is ASCII-only and NOT applied; the push and Postgres >= 15 confirmation are in plan 02-06. Requirements not marked complete.

## Deviations from Plan
- Tests and implementation committed together per task (no separate RED commits), same as plan 02-01.
- Both `sensorsActiveLabel`-style helpers live in formatNumber.ts as specified; `Status` is re-exported from types.ts via type-only import of Badge.

## Known Stubs
None.

## Self-Check: PASSED
