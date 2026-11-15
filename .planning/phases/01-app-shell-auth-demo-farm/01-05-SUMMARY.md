---
phase: 01-app-shell-auth-demo-farm
plan: 05
subsystem: auth
tags: [supabase, expo-router, auth, sqlite-storage, stack-protected]
requires: [01-01, 01-03, 01-04]
provides:
  - Supabase client with expo-sqlite localStorage session persistence
  - AuthProvider/useAuth (signIn, signUp, signOut, resetPassword, updatePassword)
  - Entrar | Criar conta single auth screen
  - Input, Tabs, Notice components
  - Stack.Protected root layout driven by session
affects: [01-06, 01-07]
key-files:
  created: [src/lib/supabase.ts, src/lib/queryClient.ts, src/features/auth/AuthProvider.tsx, src/features/auth/useLoginRateLimit.ts, src/components/ui/Input.tsx, src/components/ui/Tabs.tsx, src/components/ui/Notice.tsx, "src/app/(auth)/_layout.tsx", "src/app/(auth)/index.tsx"]
  modified: [src/app/_layout.tsx]
key-decisions:
  - "Session state alone switches (app)/(auth) via Stack.Protected; no router calls after auth"
  - "queryClient.clear() whenever the authenticated user id changes"
  - "resetPassword always returns no error except the e-mail rate-limit code (anti-enumeration)"
requirements-completed: [AUTH-01, AUTH-02, AUTH-04]
completed: 2026-11-11
---

# Phase 1 Plan 05: Auth vertical slice Summary

Supabase-backed login and signup on one Entrar / Criar conta screen with client cooldown, persisted sessions and Stack.Protected route switching.

## Tasks
| Task | Name | Commit |
|------|------|--------|
| 1 | Supabase client, AuthProvider, cooldown hook, guarded root layout | 8ae018e |
| 2 | Input, Tabs, Notice, auth screen | 78f08ab |

## Verification
- `tsc --noEmit` clean, jest 41/41, `expo export --platform web` succeeds.
- No hex literals outside tokens, no `service_role`, no router/navigate calls in AuthProvider, `_layout.tsx` or the auth screen.
- Not-configured path: with no `.env`, supabase.ts builds the offline fallback client and the screen shows the "Login indisponível" Notice (code path verified by build only, not run in a browser).

## Needs live Supabase verification (deferred to plan 07 UAT)
Plan 01-02 is paused (no Supabase project, no .env), so these were NOT exercised: signup returning a session (needs "Confirm email" off) and the demo-farm trigger firing, login success, generic error on wrong password from the real server, session persistence across restart/refresh (AUTH-04), 5-failure/30s cooldown in a running UI, reset link redirect. AUTH-01/02/04 are marked complete in REQUIREMENTS.md as implemented, pending that live verification.

## Deviations from Plan
- [Rule 3] Input forwards ref typed as `ComponentRef<typeof TextInput>` (exported `InputRef`) because the plain `TextInput` type failed under RN 0.88 typings.
- No other deviations. The "Esqueci minha senha" link is intentionally absent (plan 06).

## Known Stubs
None.

## Self-Check: PASSED
