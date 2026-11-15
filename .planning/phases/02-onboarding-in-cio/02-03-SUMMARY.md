---
phase: 02-onboarding-in-cio
plan: 03
subsystem: home-data-layer
tags: [service, react-query, demo-time, jest]
requires: [02-01, 02-02]
provides:
  - getHomeOverview / HomeOverview / ClimateSnapshotView (src/services/home.ts)
  - useHomeOverview (key ['home','overview',userId,propertyId])
  - useNow ticking hook
  - Threshold, ClimateSnapshot, PlantingArea, LatestReadingRow types
affects: [02-05, 02-06]
key-files:
  created:
    - src/services/home.ts
    - src/services/home.test.ts
    - src/hooks/useHomeOverview.ts
    - src/hooks/useNow.ts
  modified:
    - src/types/database.ts
key-decisions:
  - "Climate query isolated in its own catch; failure yields climate.status 'error' instead of rejecting"
  - "Explicit .eq('property_id') on thresholds and climate_snapshots (checker recommendation), asserted in tests"
requirements-completed: []
duration: ~15min
completed: 2026-11-12
---

# Phase 2 Plan 03: Home data layer Summary

Composite `getHomeOverview(propertyId)` loads sensors, latest readings, thresholds, unresolved alerts and latest climate in parallel, shifts demo rows once with a single offset from the freshest demo reading, and returns deriveCondition-ready data; plus React Query and `useNow` hooks.

## Tasks
1. Types + service + tests - 58dcaa4
2. Hooks - 50e1906

## Verification
jest 149/149 (8 new home tests), tsc clean, expo lint 0 errors (5 pre-existing warnings), check-ui-rules OK. `Date.now()` appears once in home.ts. Live validation deferred until migration 005 is pushed (plan 02-06); until then the latest_readings failure surfaces as a PT-BR ServiceError.

## Deviations from Plan
- Tests and implementation committed together (no separate RED commit), as in earlier plans.
- Added explicit property_id filter on thresholds/climate_snapshots per checker recommendation.
- `computeDemoOffset` appears twice in home.ts (import + single call).

## Known Stubs
None.

## Self-Check: PASSED
