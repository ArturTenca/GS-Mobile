# Pitfalls Research

**Domain:** Expo RN Web + Supabase agri-IoT for outdoor Brazilian farmers
**Researched:** 2026-11-11
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Demo data looks like real science

**What goes wrong:**
Home and Análises show drought/heat scores. Farmer (or a professor) treats them as meteorological truth.

**Why it happens:**
AI screens invite “smart” copy; seed data is realistic on purpose.

**How to avoid:**
`is_demo` on readings/alerts/analyses; persistent chip “Dados demonstrativos”; risk copy never says “previsão científica”.

**Warning signs:**
Strings like “modelo preditivo” or missing banner on Análises.

**Phase to address:**
Data/schema phase and every UI phase that renders numbers.

---

### Pitfall 2: Inconsistent farm story

**What goes wrong:**
Alert “solo seco” while the soil card shows 45% and the threshold is 20%. Trust collapses.

**Why it happens:**
Screens hardcoded; seed written by hand in JSON per page.

**How to avoid:**
One `clone_demo_farm` + generate alerts from readings vs thresholds in SQL. Integration test: every open alert matches a reading.

**Warning signs:**
Different numbers on Início vs Monitoramento vs Alertas.

**Phase to address:**
Seed + dashboard + alerts (same milestone if coarse).

---

### Pitfall 3: Enterprise dashboard on a phone in the sun

**What goes wrong:**
Dense tables, 12px gray type, tiny tabs. Unusable outdoors, one-handed.

**Why it happens:**
Default admin templates; NativeTabs with iOS chrome that ignores 48dp agri buttons.

**How to avoid:**
Custom tab bar, min 48dp targets, high-contrast tokens (dark green / yellow / red), short PT-BR labels, Início as a hero not a grid of widgets.

**Warning signs:**
Horizontal scroll on home; more than one primary question on first screen.

**Phase to address:**
Shell/theme first.

---

### Pitfall 4: Charts that work only on native (or only on web)

**What goes wrong:**
Classroom demo on RN Web is a white screen because Skia/victory wasn’t bootstrapped.

**Why it happens:**
victory-native looks modern; Skia web is extra setup.

**How to avoid:**
gifted-charts (SVG). Smoke-test sensor detail on web and Android. Platform.select if web needs `react-gifted-charts`.

**Warning signs:**
“Works in Expo Go, blank on `w`”.

**Phase to address:**
Monitoramento / Histórico.

---

### Pitfall 5: Push “done” because the permission prompt exists

**What goes wrong:**
No EAS projectId, tokens not upserted, function missing, web/sim silent — farmer never gets closed-app alerts.

**Why it happens:**
Client half is easy; backend half is skipped.

**How to avoid:**
`push_tokens` table, register on every launch after login, Edge Function on `alerts` INSERT, EXPO_ACCESS_TOKEN secret, degrade on web with copy “Notificações push no celular”.

**Warning signs:**
Token null; function never deployed; only local notifications.

**Phase to address:**
Alerts/push phase.

---

### Pitfall 6: RLS after the UI

**What goes wrong:**
Anon key can read every farm; or a shared seed property leaks between users.

**Why it happens:**
Speed; global demo farm.

**How to avoid:**
RLS from migration 1; per-user clone; never put service role in Expo.

**Warning signs:**
Policies “enable later”; one `property_id` in seed used by all accounts.

**Phase to address:**
Supabase foundation.

---

### Pitfall 7: Auth recovery / session only works in the happy path

**What goes wrong:**
Password reset emails in English; session dies on web refresh; onboarding loops.

**Why it happens:**
Supabase defaults; AsyncStorage snippets; onboarding flag not stored.

**How to avoid:**
Official Expo+Supabase session; PT-BR templates; `onboarding_completed_at`; deep link for recovery if feasible, else in-app “cheque o e-mail” state.

**Warning signs:**
Refresh logs the user out on web; signup skips onboarding forever or never.

**Phase to address:**
Auth/onboarding.

---

### Pitfall 8: Sensor offline is a pretty icon with no meaning

**What goes wrong:**
Status never goes offline because last_seen isn’t computed.

**Why it happens:**
Seed all “online”; no staleness rule.

**How to avoid:**
Define offline if `last_reading_at` older than N minutes (e.g. 30). Seed at least one offline sensor. UI state required by PROJECT.md.

**Warning signs:**
All cards green; no empty/offline story.

**Phase to address:**
Monitoramento.

---

### Pitfall 9: Expo Router + extra React Navigation imports

**What goes wrong:**
SDK 56+ breaks `@react-navigation/*` in app code.

**Why it happens:**
Old tutorials.

**How to avoid:**
Only `expo-router` APIs; `npx expo install expo-router`.

**Warning signs:**
Imports from `@react-navigation/native` in screens.

**Phase to address:**
App shell.

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcoded demo JSON in UI | Fast screens | Inconsistent, no ESP32 path | Never (PROJECT.md forbids) |
| Global shared seed farm | Easy seed | RLS/privacy bugs | Never |
| Skip push Edge Function | Faster alerts UI | Feature flag-lied | Only until alerts phase ends — then block |
| StyleSheet copies vs tokens | Speed | Unreadable outdoors | Never after shell |
| Polling every 2s | “Live” | Battery / rate limits | Use focus + 30–60s |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Supabase | Service role in `EXPO_PUBLIC_*` | Publishable key + RLS |
| Expo Push | No `projectId` | Constants EAS projectId |
| Expo Push | Register once at install | Upsert on every launch; delete on logout |
| Expo Push | Assume web works | Explicit no-op + in-app |
| Gifted charts | Same package blindly on web | ≥1.4.49 and/or react-gifted-charts on web |
| Auth emails | Default English | PT-BR templates |
| SDK | npm install random expo package versions | `npx expo install` |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Select * readings | Slow sensor detail | Range + limit + SQL aggregates | Hundreds of seed points already |
| Re-render all tabs | Jank | Query keys per screen, memo cards | Low-end Androids |
| Images/maps on home | Slow first paint | No maps in v1 | Immediate |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Shared demo property | User A sees User B alerts | Clone per uid |
| Open `alerts` insert from client as another user | Spam push | RLS + server trigger |
| Thresholds without owner check | Cross-tenant | Policy via property.owner_id |
| Showing scientific certainty | Harmful irrigation decisions | Demo labeling |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Dashboard soup | Can’t see if farm is OK | One condition hero |
| Technical jargon | Abandons app | “Umidade do solo baixa” + what to do |
| Tiny tab icons | Miss-taps with dirty hands | Large labeled tabs |
| English UI | Audience mismatch | PT-BR only |
| Alert list without recommendation | Anxiety without action | Always a next step |
| Onboarding wizard of 12 steps | Never reaches Início | Short: name, location, one area |

## "Looks Done But Isn't" Checklist

- [ ] **Home:** Condition matches sensors + open alerts — verify with a Crítico seed
- [ ] **Alerts:** Mark resolved updates badge on Início
- [ ] **Charts:** Day/week/month actually change the series on web and native
- [ ] **Push:** Token row exists after login on a device; function logs a send (or documented skip on web)
- [ ] **Demo chip:** Visible on Análises and on sensor values
- [ ] **Offline sensor:** At least one device shows last-seen + offline state
- [ ] **RLS:** Second user cannot read first user’s property
- [ ] **Onboarding:** Completing once never shows again; logout/login restores session
- [ ] **Add area / add sensor:** Appears on Monitoramento and property screen
- [ ] **Thresholds:** Changing soil min creates matching condition/alert behavior on seed data

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Inconsistent seed | MEDIUM | Rewrite seed SQL from thresholds; delete hardcoded UI numbers |
| Skia/web charts | MEDIUM | Replace with gifted-charts |
| Shared farm leak | HIGH | Add clone function, migrate, tighten RLS |
| Push incomplete | MEDIUM | Add table + function; don’t fake success in UI |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Dashboard soup / outdoor UX | Phase 1 shell | Open Início on a phone-width web viewport |
| RLS / clone farm | Phase 1–2 data | Two accounts isolation |
| Auth/onboarding loops | Auth phase | Recovery copy + session refresh |
| Inconsistent story | Dashboard + alerts | Cross-screen number audit |
| Charts web blank | Monitoramento | `npx expo start --web` sensor detail |
| Offline sensor empty | Monitoramento | Seeded offline card |
| Push half-done | Alertas | Token + function or explicit web fallback |
| Fake science | Análises | Demo chip + copy review |
| Router nav imports | Shell | No `@react-navigation/*` in app |

## Sources

- Expo SDK 58 Router changelog (native tabs / no external RN nav imports)
- Expo push setup + Supabase Edge Function example
- Gifted-charts web issues (#609)
- PROJECT.md (demo labeling, outdoor UX, consistency)

---
*Pitfalls research for: mobile agri-IoT monitoring*
*Researched: 2026-11-11*
