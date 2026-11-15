---
phase: 04-agroalerta-alerts-thresholds-push
plan: 08
subsystem: push
tags: [edge-function, deno, expo-push, supabase]
requires: [04-01]
provides: [push-alert Edge Function source, pure push logic]
affects: [04-10 deploy checkpoint]
key-files:
  created:
    - supabase/functions/push-alert/logic.ts
    - supabase/functions/push-alert/logic.test.ts
    - supabase/functions/push-alert/index.ts
    - supabase/config.toml
  modified:
    - tsconfig.json
requirements: [ALRT-07, PRF-03]
metrics:
  completed: 2026-11-15
---

# Phase 4 Plan 08: push-alert Edge Function Summary

Secret-gated Deno Edge Function that sends Expo push for warning/critical alerts honoring owner preferences, with pure logic covered by 16 jest tests.

## Accomplishments
- logic.ts: extractAlertId (supports `{alert_id}` from pg_net trigger and `{record:{id}}` Database Webhook), shouldNotify, buildMessage (UI-SPEC copy, demo suffix), chunk. No imports.
- index.ts: 405 for non-POST, constant-time `x-push-secret` check (401) before any DB access, defensive parse (400), loads alert + property/sensor/area, prefs and tokens by owner, sends in chunks of 100, deletes DeviceNotRegistered tokens, sets `notified_at` guarded by `.is('notified_at', null)` only when at least one ticket was ok. Logs only ids and counts.
- config.toml: `[functions.push-alert] verify_jwt = false`.
- tsconfig.json: only the exclude array changed (added `supabase/functions/*/index.ts`, Deno code).

## Verification
- `npx jest supabase/functions/push-alert --bail`: 16 passed
- `tsc --noEmit` clean; `scripts/check-ui-rules.mjs` OK
- No `SUPABASE_SERVICE_ROLE_KEY` in `src`

## Deviations from Plan
None in behavior. Salvaged files from a crashed attempt were reviewed and reused. Not deployed (plan 10).

## Notes
- notified_at is set only if Expo accepted at least one message, so a total send failure can be retried.
- Migration 008 trigger posts `{alert_id}` via pg_net when available; Database Webhook shape also accepted.

## Self-Check: PASSED
