---
phase: 01-app-shell-auth-demo-farm
plan: 04
subsystem: auth-logic-and-ui-library
tags: [security, validation, cooldown, auth-errors, components, a11y]
requires: [01-01, 01-03]
provides:
  - sanitize/validate (login, signup, new password) with PT-BR copy
  - pure loginCooldown state machine (5 failures, 30s)
  - mapAuthError with fixed PT-BR messages
  - MetricTile, ListRow, Chip, SectionHeader
affects: [01-05, 01-07]
key-files:
  created: [src/lib/security/limits.ts, sanitize.ts, validate.ts, security.test.ts, src/features/auth/loginCooldown.ts, loginCooldown.test.ts, authErrors.ts, authErrors.test.ts, src/components/ui/MetricTile.tsx, ListRow.tsx, Chip.tsx, SectionHeader.tsx]
key-decisions:
  - "Unknown/network auth errors fall back to the offline message so raw server text is never shown"
requirements-completed: [AUTH-01, AUTH-02, FND-04]
completed: 2026-11-11
---

# Phase 1 Plan 04: Auth logic and UI library Summary

Tested pure auth logic (sanitizers, validators, 5-failure/30s cooldown, PT-BR error mapping) plus the remaining FND-04 components, all token-based.

## Tasks
| Task | Name | Commit |
|------|------|--------|
| 1 | Security utils, cooldown, auth errors | 0c90d26 |
| 2 | MetricTile, ListRow, Chip, SectionHeader | 13eab4e |

## Verification
jest: 3 suites, 25 tests passing. tsc --noEmit clean. No hex literals, fontWeight or supabase in the new components; no paths/loginRateLimitApi references in security/auth.

## Deviations from Plan
- MetricTile accepts the `icon` prop in its type but does not render it (not required by acceptance criteria; can be added when plan 07 needs it).
- Task 1 was written test and implementation together in one commit rather than separate RED/GREEN commits.

## Known Stubs
None.

## Self-Check: PASSED
