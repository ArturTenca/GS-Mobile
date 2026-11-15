---
phase: 02-onboarding-in-cio
plan: 05
subsystem: home-ui
tags: [ui, home, condition-hero, react-native]
requires: [02-03, 02-04]
provides:
  - typography.display token (28/36)
  - Card padded prop, MetricTile icon/context/semDados, ScreenContainer refreshing/onRefresh (native only)
  - ConditionHero, ClimateCard, AlertRow components
  - Rewritten Inicio screen (HOME-01..08 UI)
affects: [02-06]
key-files:
  created:
    - src/components/home/ConditionHero.tsx
    - src/components/home/ClimateCard.tsx
    - src/components/alerts/AlertRow.tsx
  modified:
    - src/theme/tokens.ts
    - src/theme/tokens.test.ts
    - src/components/ui/Card.tsx
    - src/components/ui/MetricTile.tsx
    - src/components/layout/ScreenContainer.tsx
    - src/app/(app)/(tabs)/index.tsx
key-decisions:
  - "RefreshControl only attached on non-web; web uses the hero Atualizar button"
  - "ClimateCard icon chosen via a module-level ClimateIcon switch (the React Compiler lint rejects dynamically chosen component variables)"
requirements-completed: []
duration: ~30min
completed: 2026-11-12
---

# Phase 2 Plan 05: Inicio Summary

Inicio now shows greeting and property line, the large Normal/Atencao/Critico hero (icon + Display word + reason + action + "+N" line, live region, "Atualizado ha X min" via useNow, Atualizar button), climate card, three indicator tiles with counts, and up to 3 pending alerts that open /alerta/[id]. Requirements are not marked complete (Plan 06 UAT).

## Tasks
1. Primitives (display token, Card padded, MetricTile, ScreenContainer refresh) - 02fbf3e
2. ConditionHero, ClimateCard, AlertRow - 82400f7
3. Inicio composition - 2450c8b, follow-up fix 15fe8bf (removed `isRefetching` from boundary query per acceptance criteria)

## Dark-theme contrast (D-10 / UI-SPEC)
Computed WCAG ratios from tokens.ts dark palette (all >= 4.5:1, no adjustments needed):
- successText on successSoft: 7.08:1
- warningText on warningSoft: 8.55:1
- error on errorSoft: 5.63:1
- text on successSoft / warningSoft / errorSoft: 12.51 / 12.65 / 13.74:1

## Verification
check-ui-rules OK, tsc 0, jest 17 suites / 155 tests pass, expo lint 0 errors (5 pre-existing warnings), `expo export --platform web` to a temp dir succeeded; repo `dist/` untouched. Built against mocks/types only: migration 005 is not applied live, so Inicio will show its error state against the live DB until Plan 02-06.

## Deviations from Plan
- [Rule 1 - Bug] ClimateCard first used a dynamically selected icon component, which lint flagged ("Cannot create components during render"); replaced with a static switch component.
- Spacing nit: SectionHeader keeps its inherited 16px bottom margin, so the count line sits 16px (not 12px) below the header; not changed to avoid touching the shared SectionHeader.
- Plan checker suggested splitting Task 3; it was small enough to commit as one.
- Added a tokens test asserting the display size.

## Known Stubs
None.

## Threat Flags
None.

## Self-Check: PASSED
Created files exist; commits 02fbf3e, 82400f7, 2450c8b, 15fe8bf present.
