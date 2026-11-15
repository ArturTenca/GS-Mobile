---
phase: 01-app-shell-auth-demo-farm
fixed_at: 2026-11-12T00:00:00Z
review_path: .planning/phases/01-app-shell-auth-demo-farm/01-REVIEW.md
iteration: 1
findings_in_scope: 15
fixed: 14
skipped: 1
status: partial
---

# Phase 01: Code Review Fix Report

**Fixed at:** 2026-11-12
**Source review:** .planning/phases/01-app-shell-auth-demo-farm/01-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 15 (CR-01..03, WR-01..12; Info out of scope)
- Fixed: 14
- Skipped: 1 (WR-10, no_change_needed by user decision D-10)

## Fixed Issues

| ID | Commit | Files | Applied fix |
|----|--------|-------|-------------|
| CR-01 | d2169b7 | `src/app/_layout.tsx`, `src/components/ui/ErrorBoundary.tsx` | Splash hides once fonts load (RootLayout); Navigator shows LoadingState while auth loads; ErrorBoundary hides splash as safety net |
| CR-02 | 0cc9b05 | `src/lib/supabase.ts`, `src/app/reset-password.tsx`, `src/features/auth/authLinks.ts`, `src/features/auth/authLinks.test.ts` | PKCE (`flowType: 'pkce'`, `detectSessionInUrl: false`), `exchangeCodeForSession(code)` from `?code=` on native and web; fragment tokens ignored; code validated; tests updated |
| CR-03 | 4d167b8 | `src/features/auth/AuthProvider.tsx` | Local-scope sign-out fallback when server sign-out fails |
| WR-01 | 8263caa | `src/app/reset-password.tsx` | Form shows only after a successful code exchange in this visit (fixed: requires human verification) |
| WR-02 | fcf19f4 | `src/app/reset-password.tsx` | Navigate to forgot panel from an effect after session becomes null (fixed: requires human verification) |
| WR-03 | 35e92f4 | `src/hooks/useProducer.ts`, `src/hooks/useHomeSummary.ts`, `src/hooks/useCurrentProperty.ts` | Query keys scoped by user id, `enabled: !!userId` |
| WR-04 | 8dd0bda | `src/features/auth/AuthProvider.tsx`, `src/features/auth/authErrors.ts`, `src/app/(auth)/index.tsx` | Farmer-friendly success notice, dev hint via console.warn |
| WR-05 | fa6dbbd | `src/app/(auth)/index.tsx` | E-mail editable in forgot panel during cooldown |
| WR-06 | f9aea54 | `supabase/migrations/004_review_fixes.sql`, `supabase/setup_completo.sql` | Per-command policies + column UPDATE grants; is_demo/property_id immutable |
| WR-07 | b5bdd14 | `supabase/migrations/004_review_fixes.sql`, `supabase/setup_completo.sql` | BEFORE trigger enforcing sensor area in same property |
| WR-08 | a21b0dc | `metro.config.js` | blockList regex matches `\` and `/` |
| WR-09 | (no commit) | `.env.example`, `.gitignore` (working tree) | Reverted uncommitted deletion/ignore; HEAD already correct |
| WR-11 | 01fa228 | `supabase/migrations/004_review_fixes.sql`, `supabase/setup_completo.sql` | `private.demo_risk_text`, recreated `clone_demo_farm`, existing demo rows updated (fixed: requires human verification) |
| WR-12 | c4a1e26 | `src/lib/supabase.ts`, `src/components/layout/DatabaseGate.tsx` | Probe `/auth/v1/settings`; 401/403 -> invalid_config screen |

## Skipped Issues

### WR-10: Home screen shows demo farm data without a demo label

**File:** `src/app/(app)/(tabs)/index.tsx:51-63`
**Reason:** no_change_needed — user decision D-10 keeps the "Dados demonstrativos" badge only in Perfil.
**Original issue:** Home renders seeded data without a demo badge.

---

_Fixed: 2026-11-12_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
