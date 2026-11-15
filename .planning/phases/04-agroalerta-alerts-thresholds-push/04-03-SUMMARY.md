---
phase: 04-agroalerta-alerts-thresholds-push
plan: 03
subsystem: profile-thresholds
tags: [thresholds, perfil, validation, react-query]
requires: []
provides:
  - validateThresholds pure validator
  - saveThresholds upsert service
  - useSaveThresholds mutation hook
  - ThresholdsSection in Perfil
affects: [alerts, home-condition, sensors]
tech-stack:
  added: []
  patterns: [pure validator, inFlight-guarded mutation hook, multi-key invalidation]
key-files:
  created:
    - src/features/thresholds/validate.ts
    - src/features/thresholds/validate.test.ts
    - src/services/thresholds.test.ts
    - src/hooks/useSaveThresholds.ts
    - src/components/profile/ThresholdsSection.tsx
  modified:
    - src/services/thresholds.ts
    - src/app/(app)/(tabs)/perfil.tsx
decisions:
  - Fahrenheit-to-Celsius conversion lives in the validator (rounded to 1 decimal), no format.ts change needed
  - Form is keyed by farm id and temperature unit so switching either discards edits
requirements-completed: [PRF-04]
metrics:
  tasks: 3
  completed: 2026-11-15
---

# Phase 4 Plan 03: Limites dos sensores Summary

Perfil now has an editable "Limites dos sensores" section: validated min/max per sensor type, shown in the user's temperature unit, stored in Celsius via upsert on `property_id,sensor_type`, with home/alerts/sensors/readings caches invalidated on save.

## Commits
- be079c3: validator + 11 tests
- 0fb873d: saveThresholds service, hook, 3 service tests
- Task 3 commit: ThresholdsSection UI and Perfil wiring

## Deviations from Plan
None. Note: worktree base was reset to 8514c1a per the startup check, and node_modules was symlinked from the main checkout.

## Verification
typecheck, eslint on touched files, check-ui-rules and full jest (339 tests) pass. Live save and alert reconciliation are deferred to plan 10 UAT (needs migration 008).

## Known Stubs
None.

## Self-Check: PASSED
