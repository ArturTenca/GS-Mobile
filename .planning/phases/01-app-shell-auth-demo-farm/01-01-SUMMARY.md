---
phase: 01-app-shell-auth-demo-farm
plan: 01
subsystem: app-shell
tags: [expo, expo-router, typescript, theme, tokens, react-native-web]
requires: []
provides:
  - Expo SDK 58 + TS app scaffold at repo root
  - src/theme/tokens.ts (light/dark palettes, spacing, radius, typography)
  - ThemeProvider/useTheme, Text, Logo, AppColumn
affects: [01-02, 01-03]
tech-stack:
  added: [expo 58, expo-router, @supabase/supabase-js, @tanstack/react-query, lucide-react-native, react-native-svg, "@expo-google-fonts/inter", expo-sqlite, jest-expo]
  patterns: [StyleSheet in useMemo keyed on colors, tokens as sole hex source]
key-files:
  created: [package.json, app.json, tsconfig.json, metro.config.js, .gitignore, .env.example, src/theme/tokens.ts, src/theme/tokens.test.ts, src/theme/fonts.ts, src/features/theme/ThemeProvider.tsx, src/components/ui/Text.tsx, src/components/brand/Logo.tsx, src/components/layout/AppColumn.tsx, src/app/_layout.tsx, src/app/index.tsx]
  modified: []
key-decisions:
  - "StyleSheet + tokens, no NativeWind (D-13)"
  - "Package list approved by user on 2026-11-11 (T-01-SC): lucide-react-native, @expo-google-fonts/inter, @tanstack/react-query, @supabase/supabase-js, react-native-svg, Expo-owned and dev packages; nothing outside the list installed"
requirements-completed: [FND-01, FND-03]
duration: ~25min
completed: 2026-11-11
---

# Phase 1 Plan 01: Scaffold, tokens and theme Summary

Expo SDK 58 + TypeScript + Expo Router app at the repo root with tested light/dark green design tokens, system-following ThemeProvider, Inter fonts, SVG logo and a 500px web column.

## Tasks
| Task | Name | Commit |
|------|------|--------|
| 1 | Package approval checkpoint (user: "approved", 2026-11-11) | n/a |
| 2 | Scaffold Expo SDK 58 project | da52996 |
| 3 | Tokens, ThemeProvider, Text, Logo, AppColumn, landing | 76f93c4 |

## Resolved versions
expo ~58.0.24, expo-router ~58.0.31, react 19.3.0, react-native 0.88.1, react-native-web ^0.21.4, @supabase/supabase-js ^2.119.0, @tanstack/react-query ^5.107.1, lucide-react-native ^1.72.0, @expo-google-fonts/inter ^0.4.2, react-native-svg 15.16.0, expo-sqlite ~58.0.16, jest-expo ~58.0.14, jest ~30.5.2, typescript ~6.0.3, eslint ^9.39.5, eslint-config-expo ~58.0.4.

## Verification
expo-doctor 20/20, tsc --noEmit 0, jest 16/16, expo export --platform web OK. No hex literals or fontWeight outside tokens. All spec colors met WCAG thresholds as written (no token deviations).

## Deviations from Plan
1. [Rule 3 - Blocking] TypeScript 6 does not auto-include jest globals; added `"types": ["jest"]` to tsconfig.json (committed in Task 3).
2. [Rule 3] `tsc --noEmit` has no inputs until src exists, so it was not green after Task 2 alone; green after Task 3.
3. `expo install` also added `expo-font`, `expo-splash-screen`, `expo-sqlite` to app.json plugins (expected). `@types/jest` and `eslint-config-expo` landed in dependencies instead of devDependencies (npm via expo install); harmless.
4. TDD: tokens.test.ts and tokens.ts were written together and committed in one commit (no separate RED commit).
5. Added `modulePathIgnorePatterns` for Projeto_entrega-main in the jest config (extra safeguard).
6. Landing page not visually checked in a browser (dev server not launched in this non-interactive run); verified via web export only. Manual check of dark/light toggle and 360/390px layout is pending.

## Known Stubs
src/app/index.tsx is an intentional temporary landing page, replaced in plan 03.

## Self-Check: PASSED
