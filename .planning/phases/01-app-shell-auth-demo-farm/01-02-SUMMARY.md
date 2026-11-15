---
phase: 01-app-shell-auth-demo-farm
plan: 02
subsystem: database
tags: [supabase, postgres, rls, migrations, demo-farm]
requires: []
provides:
  - "10-table schema with RLS (per-owner)"
  - "signup trigger creating producer + private demo farm"
  - "public.ensure_demo_farm() RPC (auth.uid() only)"
  - "Live Supabase project with .env filled"
affects: [auth, data-screens, plan-05, plan-07]
tech-stack:
  added: [supabase]
  patterns: ["private schema for security-definer helpers", "per-owner RLS via private.is_property_owner"]
key-files:
  created:
    - supabase/migrations/001_schema.sql
    - supabase/migrations/002_rls.sql
    - supabase/migrations/003_demo_farm.sql
    - supabase/setup_completo.sql
  modified: []
key-decisions:
  - "setup_completo.sql concatenates 001..003 in one begin/commit transaction for pasting in the SQL editor (no psql/Docker)"
  - "Live signup smoke test deferred to plan 07 UAT at user request"
requirements-completed: [FND-07]
duration: n/a
completed: 2026-11-11
---

# Phase 1 Plan 02: Supabase schema, RLS and demo farm Summary

Supabase backend with 10 RLS-protected tables, signup trigger cloning a per-user demo farm, and a live migrated project with `.env` configured.

## Tasks

| Task | Name | Commit |
|------|------|--------|
| 1 | 001_schema.sql + 002_rls.sql | dad97b5 |
| 2 | 003_demo_farm.sql | df59a48 |
| 3 | [BLOCKING] Supabase setup (human-action) | n/a (dashboard + .env) |

Extra: `supabase/setup_completo.sql` (001..003 in one transaction) committed as 0847fc8 by the orchestrator.

## Task 3 verification evidence

- `.env` exists, gitignored, holds EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (anon role, not service_role).
- REST with anon key: all 10 tables (producers, properties, planting_areas, sensors, readings, thresholds, alerts, risk_analyses, climate_snapshots, push_tokens) return HTTP 200 `[]`, so tables exist and RLS hides everything from anon.
- RPC `ensure_demo_farm` as anon returns 401 permission denied (correct).
- `/auth/v1/settings`: disable_signup=false.
- User states "Confirm email" is OFF and the SQL was applied.

## Open items

- `mailer_autoconfirm` was still reported false at last check despite the user saying Confirm email is off (possible propagation delay or wrong toggle). Re-check in plan 07 UAT.
- Signup trigger and demo farm counts (6 sensors / 7 alerts) not verified live; deferred to plan 07 UAT at user request. FND-08 is therefore implemented but not marked complete.

## Deviations from Plan

None to the code. Live signup smoke test deferred (see above).

## Self-Check: PASSED
