---
phase: 04-agroalerta-alerts-thresholds-push
plan: 07
subsystem: profile-notifications
tags: [notifications, preferences, react-query, settings]
requires: [04-03, 04-06]
provides: [getNotificationPrefs, saveNotificationPrefs, useNotificationPrefs, NotificationsSection]
affects: [perfil, preferences-store]
key-files:
  created:
    - src/services/notifications.ts
    - src/services/notifications.test.ts
    - src/hooks/useNotificationPrefs.ts
    - src/components/profile/NotificationsSection.tsx
  modified:
    - src/stores/preferences.ts
    - src/stores/preferences.test.ts
    - src/components/settings/SettingsRow.tsx
    - src/app/(app)/(tabs)/perfil.tsx
decisions:
  - Preferences persist version bumped to 2; merge ignores old `notifications`.
  - NotificationsSection exposes `deviceStatus` and `onMasterChange` props for plan 09.
metrics:
  tasks: 2
  completed: 2026-11-15
requirements: [PRF-03, ALRT-07]
---

# Phase 4 Plan 07: Notification preferences Summary

Server-stored notification preferences (master + 6 categories) with optimistic switches, a web push-unavailable warning, and removal of the old local critical/warning/daily store.

## Commits
- 637b038: service, hook, store cleanup (task 1)
- Task 2 commit: SettingsRow disabled, NotificationsSection, Perfil wiring

## Deviations from Plan
- [Rule 3] `notifications.test.ts` mocks `lucide-react-native` because the service imports `CATEGORY_ORDER` from `alertMeta`, which pulls ESM lucide into jest.
- `src/types/database.ts` has no producers Row type, so no type change was needed.
- Removed now-unused imports and styles in `perfil.tsx`.

## Verification
typecheck, eslint, check-ui-rules and full jest (384 tests) pass. Real toggling is left to plan 10 UAT.

## Known Stubs
None. `deviceStatus` defaults to 'ok' until plan 09 supplies it; this is intentional.

## Self-Check: PASSED
