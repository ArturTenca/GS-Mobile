---
phase: 04-agroalerta-alerts-thresholds-push
plan: 01
subsystem: database
tags: [supabase, postgres, plpgsql, alerts, push, pg_net]
requires: [001..007]
provides:
  - private.evaluate_property_alerts and triggers on readings/thresholds
  - producers.notify_enabled / notify_categories, alerts.notified_at
  - guarded push trigger (pg_net) and private.push_config
key-files:
  created:
    - supabase/migrations/008_alerts_engine.sql
    - supabase/manual/008_push_config.sql
    - supabase/manual/008_evaluator_check.sql
    - scripts/probe-008.mjs
  modified:
    - supabase/setup_completo.sql
requirements: [ALRT-02, ALRT-06, ALRT-07, PRF-03, PRF-04]
completed: 2026-11-15
---

# Phase 4 Plan 01: Alert engine migration 008 Summary

Server-side alert evaluator (latest reading vs thresholds, weather, 2 h offline) driven by triggers, plus notification prefs, notified_at, threshold CHECKs and a never-failing pg_net push trigger.

## Commits
- 6f65b0b: migration 008
- second commit: manual helpers, probe, setup_completo regeneration

## Decisions / design notes
- No unique index on alerts(sensor_id, category); serialization via pg_advisory_xact_lock. Dedupe: skip insert when an open alert exists or one with triggered_at >= episode start exists (also protects against seed episodes with merged gaps).
- generate_demo_dataset v2 sets transaction-local `app.skip_alert_eval=1` while inserting readings so the per-statement trigger does not evaluate partial data, then evaluates once at the end.
- thresholds trigger also skips properties created in the same transaction and missing properties (cascade deletes).
- Backfill drops trg_alerts_push before re-evaluating and the push trigger is created afterwards, so backfilled alerts never push.
- setup_completo.sql built by slicing/concatenation; every non-comment line of migrations 001..008 verified present verbatim (begin/commit excluded); 008 block has an even `$$` count.

## Deviations from Plan
- Worktree base was reset to 8514c1a as instructed by the branch check.
- [Rule 2] Added `app.skip_alert_eval` guard and property-existence/same-transaction guards in triggers (correctness; not in plan text).

## Known limitations
- New signups (ensure_demo_farm) do not get the demo unfavorable_weather alert; only existing demo properties are seeded (as planned).
- SQL could not be executed locally (no Postgres); applied and probed in plan 06.
- Offline detection for non-demo farms is evaluated only on reading/threshold events (no cron).

## Self-Check: PASSED
