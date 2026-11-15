# Roadmap: AgroAlerta + AgroVigia

## Overview

The project starts with an Expo app that runs on phones and in the browser. It has the branded five-tab shell, Supabase auth, and a demo farm cloned for each user, so a producer can already open it, sign up, and see their own labeled demo data. Next comes the core value: a short onboarding that ends on Início, where the producer sees right away whether the property is Normal, Atenção, or Crítico. AgroVigia comes after that (sensor cards, charts, devices, Histórico), so the numbers on the home screen can be checked. Then AgroAlerta closes the loop with the alert center, thresholds, and push notifications. The last phase adds demo-labeled risk analyses, property and area management, and the full Perfil.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: App Shell, Auth & Demo Farm** - Running Expo app (native + web) with branded 5-tab shell, Supabase auth, RLS schema, and a demo farm cloned for each user (completed 2026-11-12)
- [ ] **Phase 2: Onboarding & Início** - Short first-run setup that lands on a home screen answering "is my farm OK?" in seconds
- [ ] **Phase 2.1: Fazendas e sensores no mapa** (INSERTED) - Empty new accounts, green center (+), farm boundary on map via CEP, sensors with coverage radius and simulated readings
- [ ] **Phase 3: AgroVigia Monitoring & Histórico** - Sensor cards, sensor detail charts with filters, devices, add sensor, and Histórico
- [ ] **Phase 4: AgroAlerta Alerts, Thresholds & Push** - Alert center with filters and statuses, thresholds that drive condition, and push while the app is closed
- [ ] **Phase 5: Análises, Propriedade & Perfil** - Demo-labeled risk analyses, property and planting-area management, and full Perfil

## Phase Details

### Phase 1: App Shell, Auth & Demo Farm

**Goal**: A producer can open the app on a phone or in a browser, create an account, and get into a branded five-tab app backed by their own labeled demo farm in Supabase
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: FND-01, FND-02, FND-03, FND-04, FND-05, FND-06, FND-07, FND-08, FND-09, FND-10, AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05
**Success Criteria** (what must be TRUE):

  1. The same app opens on an Android/iOS device (Expo) and in a desktop or mobile browser. It shows the branded bottom bar (dark-green active state) with Início, Monitoramento, Alertas, Análises, Perfil, and every tab is reachable with one thumb
  2. Producer can create an account (name, e-mail, password), log in, request a password-reset e-mail, and stay logged in after closing the app or refreshing the browser
  3. Producer can log out from Perfil and is returned to the login screen
  4. Right after signup, the producer's account has its own demo farm (sensors, about 30 days of readings, alerts, risk analyses, climate). Screens that show it display a "Dados demonstrativos" label, and a second account cannot see the first account's data
  5. Screens that load remote data show visible loading, empty, and connection-error states (e.g. with network off), with icons that have screen-reader labels

**Plans**: 7 plans

Plans:
**Wave 1**

- [x] 01-01-PLAN.md — Expo SDK 58 scaffold, design tokens, ThemeProvider, logo (package-audit checkpoint)
- [x] 01-02-PLAN.md — Supabase schema, per-owner RLS, demo-farm clone + signup trigger ([BLOCKING] project setup/schema push)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-03-PLAN.md — Branded five-tab shell, component library core, loading/empty/error states

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-04-PLAN.md — Auth pure logic (security utils, cooldown, error mapping) + MetricTile/ListRow/Chip/SectionHeader

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 01-05-PLAN.md — Auth: Entrar / Criar conta, Supabase client, AuthProvider, persisted session, guarded routes

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 01-06-PLAN.md — Password recovery (deep link + web), connection gates, ErrorBoundary, Select/Textarea
- [x] 01-07-PLAN.md — Service layer, Início + Perfil on real data, logout, DemoBadge, phase UAT

**UI hint**: yes

### Phase 2: Onboarding & Início

**Goal**: A new producer finishes a short setup and lands on Início, which tells them within seconds whether the property is Normal, Atenção, or Crítico and what needs attention
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: ONB-01, ONB-02, HOME-01, HOME-02, HOME-03, HOME-04, HOME-05, HOME-06, HOME-07, HOME-08
**Success Criteria** (what must be TRUE):

  1. After first signup, the producer enters property name, city/state, and a first planting area (name + crop), then lands on Início showing their property with the demo farm data linked to it
  2. Início greets the producer by name and shows the property name, a large "Condição da propriedade" indicator (Normal / Atenção / Crítico, shown with color plus text/icon), and the current climate snapshot
  3. Início shows current temperature, air humidity, and soil moisture with normal/abnormal marks, plus active sensor count, pending alert count, and last update time. Pull-to-refresh updates them
  4. Producer can tap a recent alert on Início to open its detail, and tap the environmental indicators section to go to Monitoramento

**Plans**: 6 plans

Plans:
**Wave 1**

- [x] 02-01-PLAN.md — Onboarding gate, service, validation and screen (ONB-01/02)
- [x] 02-02-PLAN.md — Condition/offline/demo-time/format domain logic + migration 005 file

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 02-03-PLAN.md — Home overview service (demo anchoring) and hooks
- [x] 02-04-PLAN.md — Alert detail slice (/alerta/[id])

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 02-05-PLAN.md — Início UI (hero, climate, indicators, alerts, refresh)

**Wave 4** *(blocked on Wave 3 completion)*

- [ ] 02-06-PLAN.md — Schema push checkpoint, final gate, UAT, mark requirements

**UI hint**: yes

### Phase 02.2: Ajustes de UX, clima e dados demo (INSERTED)

**Goal:** Perfil vira tela de configurações (tema Sistema/Claro/Escuro persistido e mais), todos os popups ficam centralizados no tamanho do conteúdo, o Início mostra previsão real do tempo (Open-Meteo) com os dias da semana e ícones, o mapa fica monocromático seguindo o tema, e Análises oferece gerar dados demonstrativos e mostra gráficos de todos os sensores da fazenda
**Requirements**: PRF-06, UX-01, WX-01, MAP-02, DEMO-02, ANL-01
**Depends on:** Phase 2.1
**Plans:** 10 plans

Plans:
- [ ] 02.2-01-PLAN.md — Preferências persistidas, ThemeProvider, formatter de temperatura e tokens (wave 1)
- [ ] 02.2-02-PLAN.md — Migração 007 generate_demo_dataset, setup_completo e probe + [BLOCKING] aplicar SQL (wave 1)
- [ ] 02.2-03-PLAN.md — Popups centralizados: Modal, OptionList, ConfirmDialog, Select/FarmSelector (wave 1)
- [ ] 02.2-04-PLAN.md — Perfil com configurações (wave 2)
- [ ] 02.2-05-PLAN.md — Previsão do tempo Open-Meteo no Início (wave 2)
- [ ] 02.2-06-PLAN.md — Mapa monocromático seguindo o tema (OSM/Esri + filtro CSS) (wave 2)
- [ ] 02.2-07-PLAN.md — Camada de dados de Análises: matemática de gráficos, serviços e hooks (wave 2)
- [ ] 02.2-08-PLAN.md — Gráficos por sensor (gifted-charts), cartões e chips de período (wave 3)
- [ ] 02.2-09-PLAN.md — Tela Análises com popup de dados demonstrativos (wave 4)
- [ ] 02.2-10-PLAN.md — Gate final, UAT em PT-BR e rastreabilidade (wave 5)

### Phase 02.1: Fazendas e sensores no mapa (INSERTED)

**Goal:** New accounts start empty; producer registers their own farms (CEP + map + boundary polygon) and sensors (point + type + coverage radius) through a green center "+" action, and registered sensors feed Início with labeled simulated readings
**Mode:** mvp
**Requirements**: DATA-01, NAV-01, FARM-01, FARM-02, FARM-03, FARM-04, SENS-01, SENS-02, SENS-03, MAP-01
**Success Criteria** (what must be TRUE):

  1. A brand-new account sees no mock data; Início shows an empty state that leads to adding the first farm
  2. The tab bar shows Início · Monitoramento · green (+) · Alertas · Perfil on phone and web; (+) offers Fazenda and Sensor
  3. Producer types a CEP, the satellite map moves there, taps boundary points, sees the area in hectares, and saves the farm
  4. Producer selects a farm, the map fits its boundary, places a sensor inside it with type, name and coverage radius circle, and registers it
  5. After registering sensors, Início shows the selected farm's condition, indicators and sensor count from simulated readings labeled "Dados demonstrativos"
**UI hint**: yes
**Depends on:** Phase 2
**Plans:** 9/10 plans executed

Plans:
- [x] 02.1-01-PLAN.md — Geometry, tile config, CEP geocoding, map tokens, farm validation
- [x] 02.1-02-PLAN.md — [BLOCKING] Migration 006 (schema, triggers, register_sensor RPC) + anon probe
- [x] 02.1-03-PLAN.md — Farms/sensors services, selected-farm store, hooks (no demo re-clone)
- [x] 02.1-04-PLAN.md — Remove onboarding gate; zero-farm empty states (DATA-01)
- [x] 02.1-05-PLAN.md — Center (+) tab button, Adicionar chooser, Análises out of tabs (NAV-01)
- [x] 02.1-06-PLAN.md — MapCanvas (Leaflet in WebView/iframe), protocol, map chrome, MapStage
- [x] 02.1-07-PLAN.md — Add-farm flow: CEP form, boundary drawing, review/save (FARM-01..03)
- [x] 02.1-08-PLAN.md — Add-sensor flow: place inside farm, radius, register + simulated readings (SENS-01..03)
- [x] 02.1-09-PLAN.md — FarmSelector, Início/Monitoramento for selected farm, demo labeling (FARM-04)
- [ ] 02.1-10-PLAN.md — Final gate, UAT, requirements traceability

### Phase 3: AgroVigia Monitoring & Histórico

**Goal**: Producer can check every sensor, see how each measurement changed over time, manage devices, and review history, so the numbers on the home screen can be trusted
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: MON-01, MON-02, MON-03, MON-04, MON-05, MON-06, MON-07, MON-08, MON-09, HIST-01, HIST-02, HIST-03, HIST-04, HIST-05
**Success Criteria** (what must be TRUE):

  1. Monitoramento lists sensor cards (temperature, air humidity, soil moisture, and other types) with value, unit, last update, and a clearly different look for online-normal, online-abnormal, and offline sensors
  2. Opening a sensor shows an evolution chart. Switching day / week / month updates both the chart and min/max/average, and shows last communication and health. The chart renders on both device and browser
  3. Producer can see the devices list with each sensor's planting area and add a new sensor (name, type, area), which then appears in Monitoramento
  4. From Monitoramento, producer opens Histórico and sees interactive temperature, air-humidity, and soil-moisture charts, plus alert history and risk-classification history, all filterable by day / week / month

**Plans**: TBD
**UI hint**: yes

### Phase 4: AgroAlerta Alerts, Thresholds & Push

**Goal**: Producer is warned about farm problems (in the app and by push when it is closed), can act on alerts, and can set the limits that decide what counts as a problem
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: ALRT-01, ALRT-02, ALRT-03, ALRT-04, ALRT-05, ALRT-06, ALRT-07, PRF-03, PRF-04
**Success Criteria** (what must be TRUE):

  1. Alertas lists alerts (temperature above limit, low soil moisture, high air humidity, heavy rain, unfavorable weather, sensor without communication) with title, description, date/time, severity, recommendation, and status, filterable by category and severity
  2. Opening an alert marks it visualizado, producer can mark it resolvido, and the Alertas tab badge and the Início pending count update to match
  3. Every threshold alert matches the readings: e.g. a low-soil-moisture alert points to a soil reading below the configured limit visible in Monitoramento
  4. Producer can change temperature and humidity (air/soil) thresholds in Perfil, and the property condition and sensor normal/abnormal state update to match
  5. With the app closed on a physical device, the producer gets a push notification for a new important alert, can turn notifications and alert categories on or off, and sees a clear message on web that push is not available there

**Plans**: 10 plans

Plans:
**Wave 1**

- [x] 04-01-PLAN.md — Migration 008: alert evaluator, triggers, notification prefs, push trigger, setup_completo regen
- [x] 04-02-PLAN.md — Alertas list: filters, category meta, listAlerts, full AlertRow
- [x] 04-03-PLAN.md — Perfil thresholds editor (validator, save, section)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 04-04-PLAN.md — Alert detail: visualizado on open, resolve, reading evidence
- [x] 04-05-PLAN.md — Tab badge + Início pending count from one hook
- [x] 04-06-PLAN.md — [BLOCKING] Apply 008 in SQL editor + probe + evaluator check
- [x] 04-08-PLAN.md — push-alert Edge Function source + tested logic

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 04-07-PLAN.md — Server-side notification prefs + Notificações section + web notice

**Wave 4** *(blocked on Wave 3 completion)*

- [ ] 04-09-PLAN.md — Push client: package gate, registration, tap handling, app.json plugin

**Wave 5** *(blocked on Wave 4 completion)*

- [ ] 04-10-PLAN.md — Gate, Edge Function deploy, EAS dev build, device UAT, traceability

**UI hint**: yes

### Phase 04.1: Entrega da disciplina: requisitos do professor, README e desempenho (INSERTED)

**Goal:** Deixar o repositório pronto para a entrega da disciplina em 19/11/2026 23h55 (README com Ficha da CitizenTech, instruções, prints e vídeo; critérios do professor auditados; app leve e rápido com antes/depois medido).
**Requirements**: D-01..D-10 (CONTEXT.md; sem IDs em REQUIREMENTS.md)
**Depends on:** Phase 4
**Plans:** 4/5 plans executed

Plans:
- [x] 04.1-01-PLAN.md — Higiene do repositório (restaurar .env.example/009/tsconfig, limpar restos) e alvo de toque do Button sm
- [x] 04.1-02-PLAN.md — Performance de startup: baseline, fontes por peso, cascata de rede (producer/farms/clima)
- [x] 04.1-03-PLAN.md — Performance de bundle: imports de ícones lucide por arquivo e medição depois
- [x] 04.1-04-PLAN.md — README pt-BR (Ficha, como rodar, aderência), roteiro do vídeo e checklist de acessibilidade
- [ ] 04.1-05-PLAN.md — Checkpoint humano: prints, link do vídeo, Ficha e gate final de entrega

### Phase 5: Análises, Propriedade & Perfil

**Goal**: Producer can read plain-language risk analyses clearly labeled as demo, manage their property and planting areas, and manage their profile and account
**Mode:** mvp
**Depends on**: Phase 4
**Requirements**: RISK-01, RISK-02, RISK-03, RISK-04, RISK-05, PROP-01, PROP-02, PROP-03, PROP-04, PROP-05, PRF-01, PRF-02, PRF-05
**Success Criteria** (what must be TRUE):

  1. Análises shows drought, excessive heat, high humidity, and unfavorable weather risk, each with level (baixo / moderado / alto), contributing indicators, data used, plain-language explanation, and recommendation
  2. Análises is clearly labeled demonstrative / rule-based and never reads as a scientific forecast
  3. From Perfil, producer can view and edit property name and location, see areas and sensor count, create / edit / delete planting areas (name + crop), and see the sensors in each area
  4. Producer can edit their name and see an account section with their e-mail, a password change via reset e-mail, and logout

**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. App Shell, Auth & Demo Farm | 7/7 | Complete   | 2026-11-12 |
| 2. Onboarding & Início | 5/6 | In Progress|  |
| 3. AgroVigia Monitoring & Histórico | 0/TBD | Not started | - |
| 4. AgroAlerta Alerts, Thresholds & Push | 8/10 | In Progress|  |
| 5. Análises, Propriedade & Perfil | 0/TBD | Not started | - |
