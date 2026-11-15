---
phase: 04
slug: agroalerta-alerts-thresholds-push
status: approved
reviewed_at: 2026-11-15
shadcn_initialized: false
preset: none
created: 2026-11-15
---

# Phase 04 — UI Design Contract

> Visual and interaction contract for AgroAlerta alerts, thresholds and push. **Extends the approved Phase 1, 02.1 and 02.2 contracts** (`01-UI-SPEC.md`, `02.1-UI-SPEC.md`, `02.2-UI-SPEC.md`). Anything not restated here is inherited unchanged: spacing tokens, type scale, Inter 400/600 only, 48dp targets, lucide icons, `StyleSheet` + `src/theme/tokens.ts` only, no hex/rgba outside tokens (`scripts/check-ui-rules.mjs`), centered popups via `Modal`/`ConfirmDialog` (no `Alert.alert`/`window.confirm`), no toast system (inline `Notice`), motion <=150ms, 500px web column, status never shown by color alone (icon + text + color).
> All copy is pt-BR and **final**: use it verbatim. Verify at 360x640, native + web, light + dark.
> No CONTEXT.md exists (discuss-phase skipped). Every decision not taken from REQUIREMENTS/ROADMAP/RESEARCH is a labeled default in "Assumptions" (U1..U16) and in RESEARCH A1..A4.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (React Native; no `components.json`; shadcn not applicable) |
| Preset | not applicable |
| Component library | in-repo `src/components/ui/*`, `src/components/settings/*`, `src/components/alerts/*`; new files listed in "Component Changes" |
| Icon library | `lucide-react-native`, stroke 2, sizes 16 / 20 / 24 |
| Font | Inter 400 (`Inter_400Regular`) / 600 (`Inter_600SemiBold`) |
| Native APIs (new) | `expo-notifications`, `expo-device` (RESEARCH Standard Stack). No `expo-haptics` (inherited "Haptics: none") |

### Source attribution

| Decision | Source |
|----------|--------|
| 6 alert categories, filters by category + severity, statuses novo/visualizado/resolvido | REQ ALRT-01..03; ROADMAP SC1 |
| Open -> visualizado; button -> resolvido; badge + Início count in sync | REQ ALRT-04, ALRT-05; ROADMAP SC2 |
| Violating reading shown inline + link to Monitoramento (no sensor-detail deep link) | ROADMAP SC3; RESEARCH Pitfall 12, A8 |
| Thresholds for temperature, air humidity, soil moisture edited in Perfil; Celsius stored, unit preference for display | REQ PRF-04; RESEARCH Pattern 6, A9 |
| Push for warning + critical only | RESEARCH A1 |
| Badge counts pending = novo + visualizado (same as Início) | RESEARCH A2 |
| Master switch + 6 category switches, server-stored, replaces críticos/avisos/resumo diário | RESEARCH A3, Pitfall 11 |
| heavy_rain / unfavorable_weather come from climate snapshots (no reading card) | RESEARCH A4 |
| Web: push not available banner; permission requested from the switch, never at launch | REQ ALRT-07; RESEARCH Pattern 4, Pitfall 10 |
| Layout, tokens, copy, states, a11y below | This UI-SPEC (Claude's discretion; no user questions) |

---

## Spacing Scale

Inherited project tokens (`src/theme/tokens.ts` `spacing`), all multiples of 4:

| Token | Value | Usage in this phase |
|-------|-------|---------------------|
| xs | 4px | Gap between title/description/meta lines inside `AlertRow`; label-to-field gap |
| sm | 8px | Chip gaps, badge gaps, icon-to-text gap, min/max input gap |
| md | 12px | Row vertical padding, gap between stacked blocks inside a card, dialog button gap |
| lg | 16px | Card padding, row horizontal padding, gap between filter block and list |
| xl | 24px | Gap between screen sections (Perfil sections, detail cards) |
| xxl | 32px | Gap above the bottom action group on alert detail |
| xxxl | 48px | Touch target minimum (`touch.min`), empty-state top padding |

Exceptions (component dimensions, not spacing): 1px borders/dividers; `AlertRow` minHeight 72 (inherited) and lead circle 40; settings row minHeight 56 (inherited); tab badge 20x20 (min width 20) with 2px `card` ring; chip visual height 32 inside 48 hit area (inherited `Chip`); threshold input minHeight 48 (inherited `Input`).

---

## Typography

No new sizes or weights. Declared set used in this phase (4 sizes, 2 weights):

| Role | Size | Weight | Line Height | Used for in Phase 4 |
|------|------|--------|-------------|---------------------|
| Caption | 12px | 600 (badge) / 400 | 16px (1.33) | Severity/status `Badge` text, tab badge count, tab labels, Input error/helper text |
| Label | 14px | 400 / 600 | 20px (1.43) | Row subtitle (area · time · category), alert description + recommendation in list, result count line, filter labels, settings descriptions, `Notice` text, threshold group helper |
| Body | 16px | 400 / 600 | 24px (1.5) | Alert title in row (600), detail section titles (600) and paragraphs (400), settings row labels, threshold group titles (600), buttons (600) |
| Heading | 20px | 600 | 28px (1.4) | Detail alert title, violating reading value ("18 %"), EmptyState/ErrorState titles, popup titles |

Display 28 stays reserved for the Início hero word (not used this phase). Numbers use `numeric` (tabular-nums) and pt-BR decimals via `formatDecimal` ("24,5 °C", "18 %"). Temperatures always pass through `formatTemperature`/`convertTemperature` with the `tempUnit` preference.

---

## Color

Values from `src/theme/tokens.ts` (light / dark). No new tokens this phase.

| Role | Value (light / dark) | Usage |
|------|----------------------|-------|
| Dominant (60%) | `background` `#F5F7F4` / `#0D1310` | Screen background behind Alertas, detail, Perfil |
| Secondary (30%) | `card` `#FFFFFF` / `#161E19` + 1px `border` `#D5DCD6` / `#2B3830` | Alert list card, detail cards, settings sections, tab bar, dialogs |
| Accent (10%) | `primary` `#1F5A36` / `#2E7D4F`; text accent `primaryText` `#1F5A36` / `#7BD39A`; soft `primarySoft` `#E4EFE6` / `#1C3325` | Only the elements listed below |
| Destructive | `errorFill` `#B42318` / `#C0362C` | Tab pending-count badge fill (see note) and danger confirm buttons (inherited). No destructive action is introduced in this phase |

Accent reserved for (this phase, exhaustive):
1. Primary buttons: "Marcar como resolvido" (detail + its confirm dialog), "Salvar limites" (Perfil)
2. Selected status segment in Alertas (`Tabs` underline + label weight 600) and selected severity chip (`primarySoft` bg + `primaryText`)
3. Switch "on" track (`primary`) on Notificações rows
4. "O que fazer" `Card variant="important"` icon (`ListChecks` in `primaryText`) — inherited
5. Focused input border / web focus ring (inherited) and `DemoBadge` (inherited)
6. Active tab icon pill in TabBar (inherited)

Semantic (not accent): severity colors come from `SEVERITY_META` (`errorSoft`/`error` critical, `warningSoft`/`warningText` warning, `background`/`textMuted` info); "resolvido" badge `success`; violating reading value uses `error` (critical) or `warningText` (warning) text **plus** an icon and the word "Abaixo do limite"/"Acima do limite". The tab badge uses `errorFill` + `onPrimary` text (contrast >= 4.5:1 in both themes) because it signals pending problems; this is the only non-dialog use of `errorFill`.

---

## Component Changes & New Components

| Component | Contract |
|-----------|----------|
| `alertMeta.ts` (extend) | Add `CATEGORY_META: Record<AlertCategory, { label: string; icon: LucideIcon }>` (labels in Copywriting > Categories). Icons: `temperature_high` `Thermometer`, `soil_moisture_low` `Sprout`, `air_humidity_high` `Droplets`, `heavy_rain` `CloudRain`, `unfavorable_weather` `CloudLightning`, `sensor_offline` `WifiOff` (executor confirms exports; fallback `TriangleAlert`). Add `getCategoryLabel()` |
| `AlertRow` (extend) | New optional props `category?`, `description?`, `recommendation?`, `variant?: 'compact' \| 'full'` (default `compact` = today's look, used on Início). `full` (Alertas list): lead circle 40 (severity icon, unchanged) -> body column gap 4: title Body 16/600 (2 lines) -> description Label 14/400 `text` (2 lines) -> recommendation row: `ListChecks` 16 `primaryText` + Label 14 muted "O que fazer: {recommendation}" (2 lines; hidden when null) -> meta Label 14 muted "{categoria} · {área} · {relativo}" (1 line) -> badges row (severity + status, inherited). `novo` rows show title weight 600 and a 8px `primary` dot is NOT used — status is the "Novo" badge (text). Chevron 20 trailing. a11y label: "{Severidade}, {status}: {título}. {categoria}, {área}, {relativo}. Abrir detalhes" |
| `AlertFilters` (new `components/alerts/AlertFilters.tsx`) | See S1. Status `Tabs` + category `Select` + severity chip row + result line |
| `TabBar` (change) | Render `options.tabBarBadge` on the Alertas tab (see S3). Remove the "Reserved for Phase 4" no-op |
| `ReadingEvidence` (new `components/alerts/ReadingEvidence.tsx`) | Detail card for the reading that triggered a threshold/offline alert (S2) |
| `ThresholdsSection` (new `components/profile/ThresholdsSection.tsx`) | Perfil "Limites dos sensores" (S4) |
| `NotificationsSection` (new `components/profile/NotificationsSection.tsx`) | Perfil "Notificações" replacing the current 3-row block (S5) |
| `SettingsRow` (reuse) | Add `disabled?: boolean`: opacity 0.5, Switch disabled, `accessibilityState.disabled`, row not pressable |
| `Notice` (reuse) | Variants `warning` / `error` / `success` only. No new `info` variant |
| `ConfirmDialog` (reuse) | tone `primary` for resolve |
| `Input` (reuse) | Threshold fields: `keyboardType="decimal-pad"` (native) / `inputMode="decimal"` (web), accepts "," or "." |

---

## Screen Contracts

### S1. Alertas — `src/app/(app)/(tabs)/alertas.tsx` (ALRT-01, 02, 03)

`ScreenHeader` "Alertas" -> `ScreenContainer` (not centered once there is a farm; pull-to-refresh via `refreshing`/`onRefresh` on native; refetch on focus on all platforms). Vertical order, gap 16:

1. `DemoBadge` (left aligned) when any loaded alert has `is_demo = true` (inherited labeling rule).
2. **Status** — `Tabs` (semantics `tabs`, a11y label "Situação"), 3 segments: **Pendentes · Resolvidos · Todos**. Default **Pendentes** (novo + visualizado). Not persisted across app restarts; kept in a zustand UI store while the app runs.
3. **Categoria** — `Select` label "Categoria", options: "Todas as categorias" (default) + the 6 full category labels. Popup = inherited `Modal` + `OptionList`.
4. **Gravidade** — Label 14/600 "Gravidade" -> 8 -> row of `Chip role="radio"` (container `accessibilityRole="radiogroup"`, label "Gravidade"), `flexWrap: 'wrap'`, gap 8: **Todas** (default) · **Crítico** (`OctagonAlert`) · **Atenção** (`TriangleAlert`) · **Informativo** (`Info`). Single-select. No horizontal scrolling anywhere on this screen.
5. **Result line** — row, space-between: Label 14 muted `numeric` count ("1 alerta" / "{n} alertas"; on Pendentes tab "1 alerta pendente" / "{n} alertas pendentes" via the existing `pendingAlertsLabel`) and, only when category or severity differ from default, `Button ghost sm` "Limpar filtros" (resets category + severity, not status).
6. **List** — `Card padded={false}` with `AlertRow variant="full"` rows. Order: severity desc (critical > warning > info), then `triggered_at` desc. Max 200 loaded (RESEARCH), all filtering in memory. Row press -> `/alerta/[id]`. No marking on list render.

Category for `sensor_offline` rows shows the sensor name in place of the area when the area is null.

States (S1):

| Situation | UI |
|-----------|----|
| Farm/alerts loading | `LoadingState` "Carregando alertas…" (centered) |
| Load error | `ErrorState` (inherited copy) + retry |
| No farm | Existing EmptyState "Cadastre sua primeira fazenda" (unchanged) |
| Farm has zero alerts (any status) | `EmptyState` icon `CircleCheck`: see Copywriting |
| Pendentes tab empty, resolved exist | `EmptyState` `CircleCheck` "Tudo em ordem" + action "Ver resolvidos" (switches tab) |
| Filters return nothing | `EmptyState` `ListFilter` "Nenhum alerta com esses filtros" + action "Limpar filtros" |
| Background refetch | List stays; no spinner except native pull-to-refresh |

### S2. Detalhe do alerta — `src/app/(app)/alerta/[id].tsx` (ALRT-04, ALRT-06)

Keep the existing header "Detalhe do alerta", cards and copy. Changes, top to bottom (gap 16, unchanged):

1. **Header card** (existing): badges row now = severity + status + category badge (`Badge default` with category icon). Title, date line, area line unchanged.
2. **"Leitura que gerou o alerta"** — new `ReadingEvidence` `Card`, only for `temperature_high`, `soil_moisture_low`, `air_humidity_high`, `sensor_offline`:
   - Title row: sensor-type icon 20 `textMuted` + Body 16/600 "Leitura que gerou o alerta".
   - Value line: Heading 20/600 `numeric` value with unit ("18 %", "36 °C" in the user's unit), colored `error` (critical) or `warningText` (warning), followed on the same line by icon (`ArrowDown` for soil, `ArrowUp` for temp/air) 16 + Label 14/600 "Abaixo do limite" / "Acima do limite" in the same color.
   - Limit line: Label 14 muted "Limite mínimo: 25 %" (soil) or "Limite máximo: 32 °C" (temp/air) using the **current** threshold.
   - Time line: Label 14 muted "Medido em {formatDateTime} · {sensor name}".
   - `sensor_offline` variant: value line = Body 16/600 "Sem sinal desde {formatDateTime(last_seen_at)}" with `WifiOff` 16 `warningText`; limit line "Sensores sem envio há mais de 2 horas geram este alerta." (RESEARCH A10).
   - Reading not found (missing `reading_id` and no latest reading): card hidden, nothing else changes.
   - `heavy_rain` / `unfavorable_weather`: no evidence card (description carries the forecast; RESEARCH A4).
3. **"O que aconteceu"** card (existing).
4. **"O que fazer"** important card (existing).
5. **Action group** (32 above, gap 12), full width:
   - Status `novo`/`visualizado`: `Button primary md fullWidth` icon `CircleCheck` "Marcar como resolvido" -> `ConfirmDialog` tone `primary` (copy below). Loading label "Salvando…". On success: dialog closes, status badge flips to "Resolvido", button group is replaced by `Notice success` "Alerta resolvido." and the screen stays open. On failure: dialog stays open with its `error` prop "Não foi possível atualizar o alerta. Verifique sua internet e tente de novo."
   - Status `resolvido`: `Notice success` "Este alerta já foi resolvido." in place of the primary button.
   - Threshold/offline categories: `Button secondary md fullWidth` icon `Activity` "Ver no Monitoramento" -> `router.navigate('/monitoramento')` (A8: no per-sensor deep link this phase).
   - `Button ghost md fullWidth` "Ver todos os alertas" (existing action, demoted from secondary to ghost).
6. **Visualizado on open**: when the alert loads with status `novo`, fire `updateAlertStatus(id,'visualizado')` once (ref-guarded). The status badge changes to "Visualizado" after success; the tab badge count does **not** drop (pending = novo + visualizado). Failure is silent (no Notice); it retries next open.
7. Opened from a push tap: same screen; back goes to Alertas tab (`router.canGoBack()` false -> `router.replace('/alertas')`, changed from `/`).

### S3. Tab badge + Início count (ALRT-05)

- Source: one helper `countPending(alerts)` + one hook `usePendingAlertCount(propertyId)` used by `(tabs)/_layout.tsx` (sets `tabBarBadge`) and Início's "Alertas recentes" count. Both must render the same number at all times.
- Visual: pill positioned on the Alertas icon pill, top-right: `position: 'absolute'`, top -4, right 4 (relative to the 56x32 icon pill). Size: height 20, minWidth 20, paddingHorizontal 4, `radius.pill`, bg `errorFill`, 2px border `card`, text Caption 12/600 `onPrimary` `numeric`, centered, `maxFontSizeMultiplier 1.2`. Count `0` -> not rendered. `1..9` -> digit; `>= 10` -> "9+".
- a11y: tab `accessibilityLabel` becomes "Alertas, {pendingAlertsLabel(n)}" (e.g. "Alertas, 3 alertas pendentes"); unchanged "Alertas" when 0. Badge view itself is hidden from a11y.
- Updates: after mark visualizado/resolvido, threshold save, push received in foreground, and app focus (invalidate `['alerts']`, `['alert']`, `['home','overview']`).
- Native app icon badge count: not set this phase (U9).

### S4. Perfil — "Limites dos sensores" (PRF-04)

New `SettingsSection` placed **after "Fazenda" and before "Notificações"**. Title "Limites dos sensores". Card content: padding 16, gap 16.

- Intro: Label 14 muted "Valem para a fazenda {nome da fazenda selecionada}. Quando uma leitura passa do limite, a fazenda entra em Atenção e um alerta é criado."
- Three groups, divided by 1px `border` with 16 above/below:

| Group | Icon | Title (Body 16/600) | Fields | Required side | Helper (Label 14 muted) |
|-------|------|---------------------|--------|---------------|------------------------|
| Temperatura | `Thermometer` | Temperatura | "Mínimo ({°C\|°F})" / "Máximo ({°C\|°F})" | Máximo | "Acima do máximo gera alerta de temperatura alta." |
| Umidade do ar | `Droplets` | Umidade do ar | "Mínimo (%)" / "Máximo (%)" | Máximo | "Acima do máximo gera alerta de umidade do ar alta." |
| Umidade do solo | `Sprout` | Umidade do solo | "Mínimo (%)" / "Máximo (%)" | Mínimo | "Abaixo do mínimo gera alerta de solo seco." |

- Field layout: two `Input`s side by side (`flex: 1` each, gap 8); at font scale >= 1.5 they stack. Optional side may be empty (= sem limite, stored `null`); placeholder "Sem limite".
- Values shown in the user's unit; stored in Celsius (convert on save, 1 decimal). Values are prefilled from `thresholds`.
- Validation (pure `features/thresholds/validate.ts`, shown under the field on blur and on save): see Copywriting > Limites.
- Save: `Button primary md` "Salvar limites" (left aligned, below last group), enabled only when something changed and all fields are valid. Loading "Salvando…". Success: `Notice success` "Limites salvos. A condição da fazenda e os alertas foram atualizados." (until next edit). Failure: `Notice error` "Não foi possível salvar os limites. Verifique sua internet e tente de novo." Values typed are kept.
- After save: invalidate thresholds, home overview, alerts and farm sensors queries so Início condition, sensor normal/abnormal and the tab badge update without reload.
- States: loading -> `LoadingState` "Carregando limites…" inside the card; error -> `ErrorState` (inherited) inside the card; no farm -> Label 14 muted "Cadastre uma fazenda para definir os limites." (no inputs). Changing "Fazenda padrão" above reloads the groups for that farm and discards unsaved edits without a prompt.

### S5. Perfil — "Notificações" (ALRT-07, PRF-03)

Replaces the current "Alertas críticos / Avisos / Resumo diário" rows and their footnote. Preferences are stored server-side per producer (A3); the switches are optimistic.

Card content, in order:
1. **Platform notice (top of the card, padding 16)** — only when applicable, one at a time, priority top-down:
   - Web: `Notice warning` "O navegador não recebe notificações push. Instale o app no celular para ser avisado com o app fechado. As escolhas abaixo valem para o celular."
   - Native, permission denied: `Notice warning` "As notificações estão bloqueadas neste celular. Libere nos ajustes do aparelho para receber os alertas." + below it `Button secondary sm` icon `Settings` "Abrir ajustes" (`Linking.openSettings()`).
   - Native, not a physical device or no EAS projectId: `Notice warning` "Este aparelho não pode receber notificações push. Use o app instalado em um celular."
2. **Master row** — `SettingsRow` icon `BellRing`, label "Receber notificações", description "Avisos no celular quando surgir um alerta de Atenção ou Crítico.", trailing switch with "Ligado"/"Desligado". Default ON.
   - Turning ON (native): request permission from this tap (never on app launch). Granted -> register token, save pref, switch stays ON. Denied -> switch returns to OFF, denied Notice appears. Saving in flight: switch shows the new value; row not pressable until done.
   - Turning OFF: save pref and delete this device's token row.
   - Web: switch saves the pref only (no permission request).
3. **Category rows** (6 `SettingsRow` with switches, `disabled` when master is OFF), icons and labels from `CATEGORY_META`, descriptions in Copywriting > Notificações. Defaults: all ON.
4. **Footnote** (below the card, existing footnote style: `Info` 16 + Label 14 muted): "Enviamos push só para alertas de Atenção e Crítico. Alertas informativos aparecem apenas na lista de Alertas."

Failure to save any switch: switch reverts and `Notice error` "Não foi possível salvar a preferência. Verifique sua internet e tente de novo." appears under the card until the next successful change. Loading prefs: `LoadingState` "Carregando preferências…" in the card; load error: inherited `ErrorState` in the card.

The persisted local store drops `critical/warning/daily` (bump `version`, migrate without crashing; `tempUnit`/`theme` keep working).

### S6. Push notification (device, app closed or in background)

- Android channel: id `alertas`, name "Alertas", importance HIGH, accent color = `primary` light value via the `expo-notifications` plugin config (only place a hex may appear outside tokens: `app.json`, copy it from `lightColors.primary`).
- Content (lock-screen safe, no coordinates/values beyond the title): title "{Severidade}: {título do alerta}" e.g. "Crítico: Umidade do solo baixa"; body "{Fazenda} · {área ou sensor}. Toque para ver o que fazer." Demo alerts append " (dados demonstrativos)" to the body.
- Tap -> opens app on `/alerta/[id]` (S2), which then marks it visualizado.
- Foreground: show the system banner (sound on), and invalidate alerts so the badge and list update.

### S7. Início adaptation

"Alertas recentes" keeps its layout; the count line and the 3 rows now read from the shared pending helper (S3). Rows stay `AlertRow variant="compact"`.

---

## State Matrix

| Situation | UI |
|-----------|----|
| Open a `novo` alert | Detail renders; status badge -> "Visualizado" after save; tab count unchanged |
| Mark resolvido | ConfirmDialog -> loading -> `Notice success`; list/Início/badge drop by 1 |
| Threshold raised so reading is back in range | Server auto-resolves alert; after save the alert leaves Pendentes, badge and Início condition update |
| Threshold lowered so a reading violates | New alert appears in Pendentes (status "Novo"), badge +1, push sent if enabled and severity >= Atenção |
| Push permission denied | Master OFF + warning Notice + "Abrir ajustes" |
| Web | Warning Notice in Notificações; switches still save |
| Offline / server error on list | `ErrorState` + retry |
| Filtered empty | EmptyState + "Limpar filtros" |

---

## Interaction & Accessibility

- All new pressables >= 48x48: chips 48 hit, `Select` 48, settings rows 56, buttons `md` 48 (`sm` 40 + hitSlop, inherited). Tab badge is not a separate target.
- Status tabs: `accessibilityRole="tab"` + `selected`; severity chips `radio` + `checked` inside `radiogroup`; switches `accessibilityRole="switch"` + `checked` with visible "Ligado"/"Desligado"; disabled category rows expose `disabled`.
- Violating value and severity never rely on color: icon + "Acima do limite"/"Abaixo do limite" + severity badge text.
- Result count line is a polite live region (`accessibilityLiveRegion="polite"` / `aria-live`) so filter changes are announced.
- Save/resolve results announced via `Notice` (live region, inherited).
- Web keyboard: Tab order = visual order; Enter/Space toggles chips and switch rows; Escape closes dialogs.
- 360px: no horizontal scroll; chips wrap; min/max inputs side by side (152px each); badges wrap. 200% font: rows grow, inputs stack, tab badge capped by `maxFontSizeMultiplier 1.2`.
- Motion: none new (no animated badge, no list animations).

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA (detail) | Marcar como resolvido |
| Primary CTA (Perfil) | Salvar limites |
| Empty state heading (no alerts at all) | Nenhum alerta por aqui |
| Empty state body (no alerts at all) | Quando uma leitura passar dos limites ou um sensor parar de enviar dados, o aviso aparece nesta lista. |
| Empty (Pendentes) | **Tudo em ordem** — Nenhum alerta pendente nesta fazenda. [Ver resolvidos] |
| Empty (filters) | **Nenhum alerta com esses filtros** — Mude a categoria ou a gravidade para ver outros alertas. [Limpar filtros] |
| Error state (list, inherited) | **Sem conexão com o servidor** — Verifique sua internet e toque em tentar novamente. [Tentar novamente] |
| Error (status update) | Não foi possível atualizar o alerta. Verifique sua internet e tente de novo. |
| Error (thresholds save) | Não foi possível salvar os limites. Verifique sua internet e tente de novo. |
| Error (notification pref) | Não foi possível salvar a preferência. Verifique sua internet e tente de novo. |
| Confirmation: mark resolvido (not destructive; tone primary) | Title "Marcar como resolvido?" / message "Use quando o problema já foi tratado na lavoura. O alerta sai da lista de pendentes." / [Marcar como resolvido] (loading "Salvando…") [Voltar] |
| Destructive actions | None introduced in this phase |

### Alertas

| Element | Copy |
|---------|------|
| Screen title | Alertas |
| Loading | Carregando alertas… |
| Status tabs | Pendentes · Resolvidos · Todos |
| Category select label / default | Categoria / Todas as categorias |
| Severity label / chips | Gravidade / Todas · Crítico · Atenção · Informativo |
| Count | 1 alerta / {n} alertas; Pendentes tab: 1 alerta pendente / {n} alertas pendentes |
| Clear filters | Limpar filtros |
| Row recommendation prefix | O que fazer: |
| Tab a11y | Alertas, {n} alertas pendentes (singular "1 alerta pendente") |

### Categories (`CATEGORY_META.label`)

| Enum | Label | Notification row description |
|------|-------|------------------------------|
| temperature_high | Temperatura alta | Quando a temperatura passa do limite máximo. |
| soil_moisture_low | Solo seco | Quando a umidade do solo fica abaixo do limite mínimo. |
| air_humidity_high | Umidade do ar alta | Quando a umidade do ar passa do limite máximo. |
| heavy_rain | Chuva forte | Quando a previsão indica chance alta de chuva forte. |
| unfavorable_weather | Clima desfavorável | Quando o tempo pode prejudicar a lavoura. |
| sensor_offline | Sensor sem sinal | Quando um sensor fica mais de 2 horas sem enviar dados. |

### Detalhe do alerta

| Element | Copy |
|---------|------|
| Evidence title | Leitura que gerou o alerta |
| Direction | Acima do limite / Abaixo do limite |
| Limit | Limite máximo: {valor} / Limite mínimo: {valor} |
| Time | Medido em {data e hora} · {sensor} |
| Offline value | Sem sinal desde {data e hora} |
| Offline rule | Sensores sem envio há mais de 2 horas geram este alerta. |
| Link | Ver no Monitoramento |
| Back to list | Ver todos os alertas |
| Resolved now | Alerta resolvido. |
| Already resolved | Este alerta já foi resolvido. |

### Perfil — Limites dos sensores

| Element | Copy |
|---------|------|
| Section title | Limites dos sensores |
| Intro | Valem para a fazenda {nome}. Quando uma leitura passa do limite, a fazenda entra em Atenção e um alerta é criado. |
| Field labels | Mínimo (°C) / Máximo (°C) (or °F); Mínimo (%) / Máximo (%) |
| Placeholder (optional side) | Sem limite |
| Required empty | Informe um valor. |
| Not a number | Use só números, como 25 ou 25,5. |
| Min >= max | O mínimo precisa ser menor que o máximo. |
| Temperature range | Use um valor entre -20 e 60 °C. (°F: entre -4 e 140 °F.) |
| Humidity range | Use um valor entre 0 e 100 %. |
| Saving | Salvando… |
| Success | Limites salvos. A condição da fazenda e os alertas foram atualizados. |
| No farm | Cadastre uma fazenda para definir os limites. |
| Loading | Carregando limites… |

### Perfil — Notificações

| Element | Copy |
|---------|------|
| Master label / description | Receber notificações / Avisos no celular quando surgir um alerta de Atenção ou Crítico. |
| Web notice | O navegador não recebe notificações push. Instale o app no celular para ser avisado com o app fechado. As escolhas abaixo valem para o celular. |
| Denied notice / button | As notificações estão bloqueadas neste celular. Libere nos ajustes do aparelho para receber os alertas. / Abrir ajustes |
| Unsupported device | Este aparelho não pode receber notificações push. Use o app instalado em um celular. |
| Footnote | Enviamos push só para alertas de Atenção e Crítico. Alertas informativos aparecem apenas na lista de Alertas. |
| Loading | Carregando preferências… |
| Switch state text | Ligado / Desligado |

### Push

| Element | Copy |
|---------|------|
| Title | {Crítico\|Atenção}: {título do alerta} |
| Body | {Fazenda} · {área ou sensor}. Toque para ver o que fazer. |
| Demo suffix | (dados demonstrativos) |
| Android channel name | Alertas |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none (React Native, no `components.json`) | not required |
| Third-party registries | none | not applicable |

Runtime dependencies introduced (not registries): `expo-notifications`, `expo-device` — first-party Expo SDK 58 modules named in CLAUDE.md; install via `npx expo install` (RESEARCH Package Legitimacy Audit).

---

## Assumptions (defaults chosen, not asked)

| # | Assumption | Why | Easy to change? |
|---|-----------|-----|-----------------|
| A1 | Push only for severity Atenção and Crítico | RESEARCH A1 | Yes — Edge Function filter + footnote copy |
| A2 | Badge = pending (novo + visualizado), identical to Início count | RESEARCH A2; ROADMAP SC2 "match" | Yes — `countPending` |
| A3 | Master switch + 6 category switches, server-stored; "Resumo diário" removed | RESEARCH A3 | Yes |
| A4 | heavy_rain / unfavorable_weather from climate snapshots; no reading card for them | RESEARCH A4 | Yes |
| U1 | Alertas default tab "Pendentes" | Farmer sees what needs action first; matches badge | Yes |
| U2 | Category filter is a `Select` (popup), severity filter is chips; no horizontal scroll | 6 long labels do not fit as chips at 360; project removed horizontal scrolling in commit 959f7d1 | Yes |
| U3 | List row shows description + recommendation (2 lines each) to satisfy ALRT-01 in the list itself | REQ ALRT-01 lists both | Yes — `variant` |
| U4 | Resolving asks for confirmation (tone primary, not red) | Status cannot be undone from the UI | Yes |
| U5 | No "reabrir" (undo resolvido) action | RLS allows status update but not in scope | Yes |
| U6 | Detail links to Monitoramento tab, not a sensor detail route | RESEARCH A8 / Pitfall 12 | Yes once Phase 3 route exists |
| U7 | Evidence card uses current thresholds for the "Limite" line | Matches what Perfil shows; server auto-resolves stale alerts | Yes |
| U8 | Thresholds section sits in Perfil between Fazenda and Notificações and applies to the selected farm | Thresholds are per property | Yes |
| U9 | No native app-icon badge count | Out of scope; avoids extra permission behavior on iOS | Yes |
| U10 | Tab badge shows "9+" above 9 | Fits 20px pill at 360 | Yes |
| U11 | Tab badge uses `errorFill` (not accent) | Pending problems are a warning signal; white text passes contrast in both themes | Yes — token |
| U12 | Permission denied keeps master switch OFF with a settings shortcut | Honest state; no silent failure | Yes |
| U13 | Optional threshold side may be empty ("Sem limite") | Table allows null; evaluator only needs one side | Yes |
| U14 | Status filter is session-only (zustand, not persisted) | Avoid confusing "where did my alerts go" on next launch | Yes |
| U15 | Push tap with no back stack returns to Alertas, not Início | User came for alerts | Yes |
| U16 | No haptics on resolve/save | `expo-haptics` not installed; inherited "Haptics: none" | Yes |

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: FLAG
- [x] Dimension 2 Visuals: FLAG
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: FLAG (md 12 inherited token)
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-11-15
