---
phase: 01-app-shell-auth-demo-farm
plan: 06
subsystem: auth-recovery-and-gates
tags: [password-recovery, deep-link, error-boundary, database-gate, ui-rules]
requires: [01-05]
provides:
  - parseAuthParams / classifyRecoveryUrl / getRecoveryTokens (no URLSearchParams)
  - DatabaseGate, DatabaseUnavailable, ErrorBoundary wrapping the app outside auth
  - Forgot-password and "Verifique seu e-mail" views in the auth screen
  - Ungated /reset-password route (verifying | ready | invalid | success)
  - Select, Textarea components
  - scripts/check-ui-rules.mjs design-rule gate
affects: [01-07]
key-files:
  created: [src/features/auth/authLinks.ts, src/features/auth/authLinks.test.ts, src/components/ui/ErrorBoundary.tsx, src/components/ui/DatabaseUnavailable.tsx, src/components/layout/DatabaseGate.tsx, src/app/reset-password.tsx, src/components/ui/Select.tsx, src/components/ui/Textarea.tsx, scripts/check-ui-rules.mjs]
  modified: [src/app/_layout.tsx, "src/app/(auth)/index.tsx"]
key-decisions:
  - "Wrap order SafeAreaProvider > ThemeProvider > ErrorBoundary > DatabaseGate > QueryClient > Auth; reset-password Screen sits outside both Stack.Protected groups"
  - "Recovery uses setSession on native from the link fragment and AuthProvider session on web; PASSWORD_RECOVERY event not used; 4 s without a session after loading means invalid"
  - "DatabaseUnavailable gained a retryLabel prop so ErrorBoundary can show Recarregar app"
requirements-completed: [FND-04, FND-05, FND-10]
requirements-pending-live-verification: [AUTH-03]
completed: 2026-11-11
---

# Phase 1 Plan 06: Password recovery and connection gates Summary

Forgot-password flow with anti-enumeration confirmation, a branded "Definir nova senha" route that handles native deep links and the web build, plus DatabaseGate/ErrorBoundary so connection and render failures never show a blank screen.

## Tasks
| Task | Name | Commit |
|------|------|--------|
| 1 | Auth-link parser, gates, ErrorBoundary, root layout | 68410c5 |
| 2 | Forgot-password view and reset-password route | b955784 |
| 3 | Select, Textarea, UI-rules script | 9c9a902 |

## Verification
- `tsc --noEmit` clean; jest 5 suites / 50 tests (authLinks: 9 tests); `node scripts/check-ui-rules.mjs` OK (verified it exits 1 when a hex literal is added, then reverted); `expo export --platform web` succeeds and emits a `reset-password` bundle.
- package.json untouched.

## Needs live Supabase / device verification (deferred to plan 07 UAT)
Plan 01-02 is paused (no Supabase project, no .env), so NOT exercised: receiving the real reset e-mail, redirect allow-list, opening the link on web and on a phone (agroalerta:// and exp://), setSession with real tokens, updateUser success and auto-login, expired-link state against a real server, DatabaseGate "Tentar novamente" against an unreachable host, ErrorBoundary triggered by a real render crash, visual check of the new screens. AUTH-03 is implemented but pending that live verification (do not treat as verified).

## Deviations from Plan
- [Rule 3] With no .env the DatabaseGate (per plan) shows "Configuração pendente" for the whole app, so the auth screen is unreachable until Supabase is configured; this is the intended not-configured path.
- `expo export` rewrote tsconfig.json as a side effect; reverted, not committed.
- Reset-password "Enviar novo link" calls signOut() first when a link-created session exists, so the guarded auth route is reachable.

## Known Stubs
None.

## Self-Check: PASSED
