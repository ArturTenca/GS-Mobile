---
phase: 01-app-shell-auth-demo-farm
plan: 03
subsystem: app-shell
tags: [expo-router, js-tabs, components, a11y, lucide]
requires: [01-01]
provides:
  - Button, Card, Badge/StatusBadge/DemoBadge, LoadingState, EmptyState, ErrorState
  - ScreenContainer, ScreenHeader, custom five-tab TabBar
  - Routes (app)/(tabs) with five placeholder screens
affects: [01-05, 01-06, 01-07]
tech-stack:
  added: []
  patterns: [StyleSheet in useMemo keyed on colors, expo-router/js-tabs with tabBar prop]
key-files:
  created: [src/components/ui/Button.tsx, Card.tsx, Badge.tsx, LoadingState.tsx, EmptyState.tsx, ErrorState.tsx, src/components/layout/ScreenContainer.tsx, ScreenHeader.tsx, TabBar.tsx, "src/app/(app)/_layout.tsx", "src/app/(app)/(tabs)/_layout.tsx", "src/app/(app)/(tabs)/{index,monitoramento,alertas,analises,perfil}.tsx"]
  modified: [src/app/_layout.tsx]
  deleted: [src/app/index.tsx]
key-decisions:
  - "TabBar uses the SDK 58 BottomTabBarProps contract (emitter + navigateToTab), not navigation.navigate"
requirements-completed: [FND-02, FND-04, FND-05, FND-10]
duration: ~20min
completed: 2026-11-11
---

# Phase 1 Plan 03: Five-tab shell and UI primitives Summary

Branded five-tab shell (Início, Monitoramento, Alertas, Análises, Perfil) on expo-router/js-tabs with a custom Lucide TabBar (52px items, pill + heavier stroke for active), plus the first reusable component set and loading/empty/error states.

## Tasks
| Task | Name | Commit |
|------|------|--------|
| 1 | UI primitives and states | d6ca058 |
| 2 | Layout components and TabBar | 6ace679 |
| 3 | Route groups, tabs layout, placeholders | fcc633a |

## Verification
tsc --noEmit 0; expo export --platform web OK with routes /, /monitoramento, /alertas, /analises, /perfil. No hex literals, fontWeight or supabase imports in components.

## Deviations from Plan
1. [Rule 3 - Blocking] In Expo Router 58, `BottomTabBarProps` has `{state, descriptors, emitter, navigateToTab, insets}`, no `navigation`. TabBar emits `tabPress` via `emitter.emit` (canPreventDefault) then calls `navigateToTab(route.key)` if not focused/not prevented; same semantics as planned. Still uses `useSafeAreaInsets` per plan.
2. Início and Perfil descriptions added as short PT-BR copy (plan only fixed titles); these are temporary placeholders for plan 07.
3. Pressed inactive tab fades the whole pill (opacity 0.6) rather than only the background.
4. Visual check in a browser (360px label clipping, assumption A3, dark mode) not done in this non-interactive run; TAB_VISIBLE_LABELS is ready if "Monitoramento" clips.

## Known Stubs
Início and Perfil screens are intentional EmptyState placeholders, replaced by plan 07. Monitoramento/Alertas/Análises are placeholders for later phases. TabBar `tabBarBadge` slot is read but not rendered (Phase 4).

## Self-Check: PASSED
