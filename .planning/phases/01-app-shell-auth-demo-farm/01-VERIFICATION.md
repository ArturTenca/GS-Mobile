---
phase: 01-app-shell-auth-demo-farm
verified: 2026-11-12T00:00:00Z
status: human_needed
score: 5/5 must-haves verified (code level); runtime items pending human
overrides_applied: 0
human_verification:
  - test: "Apply supabase/migrations/004_review_fixes.sql on the live project (SQL editor), then re-check RLS"
    expected: "Per-command policies and column grants active; sensor-area trigger active; demo risk text follows level (WR-06, WR-07, WR-11). Second account still cannot see first account's rows."
    why_human: "Migration is written but not yet applied live. Not a code gap."
  - test: "Password recovery via PKCE: request reset from the login screen, open the e-mail link on the SAME device/browser, set a new password"
    expected: "Code exchange succeeds, form appears only after exchange, then user is signed out/returned to login (WR-01, WR-02 are 'fixed: requires human verification')"
    why_human: "Needs real e-mail and a live Supabase Auth redirect URL config."
  - test: "Sign up two accounts, check each sees own demo farm; log out from Perfil; refresh browser / restart app"
    expected: "Own property with 6 sensors and pending alerts count; session persists; logout returns to login; account B sees nothing of A"
    why_human: "Live end-to-end behavior (UAT in plan 07 was approved as a blanket approval without per-step notes; post-UAT fixes were not re-run)."
  - test: "Airplane mode / network off on a data screen (Início, Perfil)"
    expected: "Visible connection-error state with retry; icons have screen-reader labels"
    why_human: "Visual/runtime behavior."
---

# Phase 1: App Shell, Auth & Demo Farm Verification Report

**Phase Goal:** A producer can open the app on a phone or in a browser, create an account, and get into a branded five-tab app backed by their own labeled demo farm in Supabase
**Verified:** 2026-11-12
**Status:** human_needed
**Re-verification:** No, initial verification (against current code, after review fixes)

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | One Expo codebase on native + web, branded five-tab bar, every tab reachable | VERIFIED (code) | Expo Router app under `src/app`; `(app)/(tabs)` has index, monitoramento, alertas, analises, perfil; custom `TabBar.tsx` (JS tabs, 5 icons/labels, minHeight 52, `accessibilityRole="tab"`, selected state, primarySoft active pill). Visual check covered by UAT. |
| 2 | Signup (name/e-mail/password), login, reset e-mail, session persists | VERIFIED (code) | `AuthProvider` implements signUp (name in metadata), signInWithPassword, resetPasswordForEmail (anti-enumeration), getSession on boot. `supabase.ts` uses persistSession + expo-sqlite localStorage, PKCE. `(auth)/index.tsx` and `reset-password.tsx` are substantive (352/269 lines). Validators/cooldown/error mapping unit-tested. |
| 3 | Logout from Perfil returns to login | VERIFIED (code) | `perfil.tsx` confirm modal calls `signOut()`, clears query cache; `AuthProvider.signOut` has local-scope fallback; `Stack.Protected` guards switch to `(auth)` when session is null. |
| 4 | Per-user demo farm (sensors, ~30 days readings, alerts, risk analyses, climate), labeled "Dados demonstrativos", isolation between accounts | VERIFIED (code), live partially | `003_demo_farm.sql`: `clone_demo_farm` (3 areas, 6 sensors, hourly `generate_series` readings, climate, alerts, risk analyses, all `is_demo=true`), signup trigger plus `ensure_demo_farm` self-heal RPC (denied to anon, confirmed by orchestrator). `002_rls.sql`: RLS on all 10 tables, owner-scoped via `private.is_property_owner`, column-level update grants. Orchestrator confirmed live: 10 tables, anon sees `[]`. Label: `DemoBadge` in Perfil only, per D-10 (accepted, see FND-09). |
| 5 | Loading / empty / error states, icons with screen-reader labels | VERIFIED (code) | `AsyncBoundary`, `LoadingState`, `EmptyState`, `ErrorState`, `DatabaseGate`/`DatabaseUnavailable` (probes `/auth/v1/settings`, distinguishes invalid_config vs unreachable), `ErrorBoundary`. Used in Início and Perfil. Tab items carry accessibilityLabel. |

**Score:** 5/5 truths verified at code level.

### Required Artifacts / Key Links

| Link | Status | Details |
|------|--------|---------|
| RootLayout -> DatabaseGate -> QueryClient -> AuthProvider -> Navigator | WIRED | `src/app/_layout.tsx`; splash hidden on fonts ready (CR-01 fixed) |
| Screens -> hooks -> services -> supabase | WIRED | Início uses `useHomeSummary` -> `services/properties.getHomeSummary` (real counts from `sensors`/`alerts`); Perfil uses `useProducer` -> `services/producers`. Query keys scoped by user id (WR-03). |
| Direct supabase use in UI | Info | Only `(auth)/index.tsx` and `reset-password.tsx` import supabase, for auth calls, not data. No `supabase.from` in screens. Acceptable for FND-06. |
| Recovery link -> `exchangeCodeForSession` | WIRED | PKCE per user decision; plan 06 implicit-token wording superseded. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Type check | `npx tsc --noEmit` | no errors | PASS |
| Unit tests | `npm test` | 7 suites, 72 tests passed | PASS |
| Debt markers | grep TBD/FIXME/XXX in src, supabase, scripts | none | PASS |

Probes: none declared or present (Step 7c skipped). Live REST probing was done by the orchestrator, not repeated here.

### Requirements Coverage

All 15 IDs in the plans' `requirements` frontmatter match REQUIREMENTS.md; no orphaned Phase 1 IDs.

| Req | Plan(s) | Status | Evidence |
|-----|---------|--------|----------|
| FND-01 | 01 | SATISFIED | Expo+TS+RN Web single codebase, tsc clean |
| FND-02 | 03 | SATISFIED | Custom TabBar, 5 tabs, 52px targets |
| FND-03 | 01 | SATISFIED | `theme/tokens.ts` (tested), ThemeProvider, fonts |
| FND-04 | 03, 04, 06 | SATISFIED | `components/ui/*` library used by screens |
| FND-05 | 03, 06, 07 | SATISFIED | AsyncBoundary + states; DatabaseGate |
| FND-06 | 07 | SATISFIED | `src/services/*` with ServiceError; UI data goes through hooks/services |
| FND-07 | 02 | SATISFIED | 001 schema (multi-property via owner_id), 002 RLS on all tables; live tables confirmed |
| FND-08 | 02, 07 | SATISFIED | `is_demo` on seeded rows, ~30 days hourly readings |
| FND-09 | 07 | SATISFIED per D-10 | Badge in Perfil only, by user decision D-10. Início intentionally unlabeled (WR-10 skipped as no_change_needed). Note: ROADMAP SC4 wording says "screens that show it display the label"; D-10 narrows this pending the user's final labeling policy. Revisit in Phase 2+. |
| FND-10 | 03, 06 | SATISFIED (code) | accessibility roles/labels on tabs and controls; runtime screen-reader check is human |
| AUTH-01..05 | 04, 05, 06, 07 | SATISFIED (code) | See truths 2 and 3; live flow pending human items |

### Anti-Patterns Found

None blocking. TabBar contains an intentionally unused `_badge` placeholder reserved for Phase 4 (info). Review items CR-01..03 and WR-01..12 (except WR-10) are fixed in code per commits; WR-01, WR-02, WR-11 flagged by the fixer as requiring human verification.

### Human Verification Required

1. Apply `004_review_fixes.sql` on the live project and re-verify RLS isolation (not a code gap).
2. Exercise password recovery end to end with PKCE (same device) on web and native.
3. Two-account signup/isolation, logout, and refresh persistence on the live project after review fixes (UAT approval predates these fixes and was blanket).
4. Offline behavior and screen-reader labels on device.

### Gaps Summary

No code gaps found. Automated evidence (types, 72 tests, code reading of wiring, migrations) supports the phase goal. Status is human_needed only because the live migration 004 is unapplied and post-UAT auth fixes (PKCE recovery, WR-01/02/11) need runtime confirmation.

---

_Verified: 2026-11-12_
_Verifier: Claude (gsd-verifier)_
