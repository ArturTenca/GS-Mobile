---
phase: 04-agroalerta-alerts-thresholds-push
plan: 06
subsystem: database
tags: [supabase, migration, probe, checkpoint]
requires: [04-01]
provides: [migration-008-live, migration-009-file, demo-alert-seed]
affects: [04-07, 04-08, 04-09, 04-10]
key-files:
  created:
    - supabase/migrations/009_revoke_anon_writes.sql
    - supabase/manual/seed_alertas_demo.sql
  modified:
    - supabase/setup_completo.sql
key-decisions:
  - "Anon write privileges revoked on all public tables (009) after probe-008 check c returned 204"
completed: 2026-11-15
status: partial
---

# Phase 04 Plan 06: Apply migration 008 — Summary

Migration 008 is live in the user's Supabase project. Anon probe passes on schema; one security gap found and fixed in a new migration 009 (file ready, application by the user still pending).

## Task results

| Task | Result |
|------|--------|
| 1. Apply 008 in SQL editor | Done by the user. The editor returned the backfill `select private.evaluate_property_alerts(...)` result set (2 rows, void) and no error, so the whole transaction committed. |
| 2. Anon probe `scripts/probe-008.mjs` | a) PASS, b) PASS, d) PASS. c) FAIL: anon `PATCH alerts` returned 204. RLS has no anon policy, so 0 rows changed, but anon still held Supabase's default INSERT/UPDATE/DELETE grants. Fixed with `009_revoke_anon_writes.sql` (commit a08753c), appended to `setup_completo.sql`. Re-run of the probe after the user applies 009 is pending. |
| 3. Evaluator consistency check | Not run. The user chose to proceed to the next wave; `supabase/manual/008_evaluator_check.sql` remains to be run (moved to the 04-10 UAT). |

## Open questions (not answered by the user yet)

- `pg_net` availability: unknown. Push path stays dual (pg_net trigger or Database Webhook); 04-10 Task 2 decides.
- EAS account / Apple-FCM credentials: unknown. Needed in 04-09/04-10.

## Extra (user request)

`supabase/manual/seed_alertas_demo.sql`: 8 demo alerts per farm (6 categories, 3 severities, 3 statuses), `is_demo = true`, `notified_at = now()` so no push, idempotent per farm via a `[demo-seed]` marker, with a delete statement in the header.

## Deviations

- [Rule 2 - Security] Added migration 009 (anon write revoke) after probe check c.
- Task 3 deferred at the user's request.

## Self-Check: PASSED (with deferred items listed above)
