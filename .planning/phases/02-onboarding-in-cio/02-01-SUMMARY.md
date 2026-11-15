---
phase: 02-onboarding-in-cio
plan: 01
subsystem: onboarding
tags: [expo-router, supabase, react-query, validation]
requires: []
provides:
  - completeOnboarding idempotent service (flag written last)
  - validateOnboarding + UF_OPTIONS
  - Stack.Protected onboarding gate in (app)/_layout.tsx
  - onboarding screen (S1)
affects: [02-02, 02-04, 02-06]
tech-stack:
  added: []
  patterns: [setQueryData before invalidate, find-or-update single non-demo area, Stack.Protected redirectTo]
key-files:
  created:
    - src/services/onboarding.ts
    - src/services/onboarding.test.ts
    - src/features/onboarding/validate.ts
    - src/features/onboarding/validate.test.ts
    - src/features/onboarding/ufs.ts
    - src/hooks/useCompleteOnboarding.ts
    - src/app/(app)/onboarding.tsx
  modified:
    - src/types/database.ts
    - src/services/producers.ts
    - src/services/services.test.ts
    - src/app/(app)/_layout.tsx
    - src/app/(app)/(tabs)/_layout.tsx
key-decisions:
  - "Producers flag written last; every write chained .select('id') so RLS zero-row = ServiceError"
  - "Cache seeded with setQueryData before invalidations to avoid stale-null bounce"
requirements-completed: []
duration: ~25min
completed: 2026-11-12
---

# Phase 2 Plan 01: Onboarding slice Summary

Producers with a null `onboarding_completed_at` are gated to a single onboarding screen that renames the cloned property and creates one non-demo planting area, then lands on the tabs.

## Tasks
1. Service, validation, UF list, producer shape - 819a6a0 (24 tests pass)
2. Gate, hook, screen, tabs anchor fix - b805c64

## Verification
check-ui-rules OK, tsc clean, jest 84/84, expo lint 0 errors, web export to temp dir succeeded (repo dist/ untouched). Live behavior is deferred to Plan 06 UAT; ONB-01/ONB-02 are not marked complete in REQUIREMENTS.md.

## Deviations from Plan
- TDD tests and implementation were committed together in one feat commit (no separate RED commit).
- `Text` has no title/subtitle variants; used `heading` and `body` semibold.

## Deferred Issues
- Lint warnings remain (0 errors): react-hooks/set-state-in-effect on the prefill effect in onboarding.tsx (same pattern pre-exists in useLoginRateLimit.ts).

## Known Stubs
None.

## Self-Check: PASSED
