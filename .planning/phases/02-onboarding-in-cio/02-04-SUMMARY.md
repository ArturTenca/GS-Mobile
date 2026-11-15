---
phase: 02-onboarding-in-cio
plan: 04
subsystem: alert-detail
tags: [service, route, react-query, demo-time, ui]
requires: [02-01, 02-02]
provides:
  - getAlert / AlertDetail (src/services/alerts.ts)
  - useAlert (key ['alert', userId, id])
  - SEVERITY_META / STATUS_META (src/components/alerts/alertMeta.ts)
  - ScreenHeader onBack prop
  - /alerta/[id] read-only detail route
affects: [02-05, 02-06]
key-files:
  created:
    - src/services/alerts.ts
    - src/services/alerts.test.ts
    - src/hooks/useAlert.ts
    - src/components/alerts/alertMeta.ts
    - src/app/(app)/alerta/[id].tsx
  modified:
    - src/components/layout/ScreenHeader.tsx
    - src/app/(app)/_layout.tsx
key-decisions:
  - "Demo offset for the detail screen comes from the readings table (freshest is_demo row of the alert's property), so it does not depend on migration 005's latest_readings view"
  - "Malformed UUID returns null without querying; RLS-denied and missing both render 'Alerta não encontrado'"
requirements-completed: []
duration: ~15min
completed: 2026-11-12
---

# Phase 2 Plan 04: Alert detail Summary

Read-only alert detail at `/alerta/<id>`: severity and status badges, title, absolute and relative time, area, "O que aconteceu" and an emphasized "O que fazer" card, with not-found/error states. Registered inside the not-onboarding `Stack.Protected` group.

## Tasks
1. getAlert service, tests, useAlert hook - e05631b
2. Alert meta maps, ScreenHeader back, detail screen, route registration - 663b963

## Verification
jest 154/154 (5 new alert tests), tsc clean, check-ui-rules OK, expo lint 0 errors (5 pre-existing warnings), web export to a temp dir succeeds with no Stack.Screen name warnings (SPA output does not enumerate dynamic routes). The screen has no mutation code. Live data check is deferred to plan 02-06 UAT.

## Deviations from Plan
- Tests and implementation committed together (no separate RED commit), as in earlier plans.
- The plan's grep for `@/lib/supabase` in hooks/app/components still matches pre-existing files (auth index, reset-password, DatabaseGate); none are from this plan.

## Known Stubs
None.

## Self-Check: PASSED
