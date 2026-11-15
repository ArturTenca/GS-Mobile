# Stack Research

**Domain:** Mobile-first agricultural IoT monitoring (Expo + Supabase)
**Researched:** 2026-11-11
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Expo SDK | 58.0.x | App runtime (iOS, Android, web) | Current stable (Oct 2026). RN 0.88, RN Web 0.21, Node ≥ 22.13. Locked by PROJECT.md. |
| React Native | 0.88 (via SDK 58) | UI runtime | Pinned by Expo; do not pick RN independently. |
| React | 19.3.0 (via SDK 58) | UI library | Comes with SDK 58. |
| TypeScript | 5.x (Expo template) | Types | Required by PROJECT.md; catch sensor-unit and status mistakes early. |
| Expo Router | ~58.0.31 | File-based nav + web URLs | Official, web-capable; Native Tabs are stable in SDK 58 but brand-custom JS tabs are a better fit here. |
| React Native Web | 0.21.0 | Browser target | Locked; install with `react-dom` via `npx expo install`. |
| Supabase | Cloud + `@supabase/supabase-js` 2.119.0 | Auth, Postgres, Edge Functions | Locked backend. Latest JS SDK (2026-11-04). Expo now has `eas integrations:supabase:connect`. |
| Node.js | ≥ 22.13 | Tooling | SDK 58 + supabase-js 2.110+ dropped Node 20. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| expo-notifications | SDK 58 aligned | Push token + local presentation | v1 push (decided). Needs EAS `projectId`. |
| expo-device | SDK 58 aligned | Detect real device vs simulator | Skip token registration on simulators/web. |
| expo-constants | SDK 58 aligned | Read EAS projectId | Required by `getExpoPushTokenAsync`. |
| expo-secure-store / expo-sqlite | SDK 58 aligned | Auth session persistence | Official Expo+Supabase path uses `expo-sqlite` via the connect integration. |
| @supabase/supabase-js | 2.119.0 | Client | Auth + PostgREST + invoke Edge Functions. |
| zustand | 5.x | Client UI state | Selected property, filters, optimistic alert status. Tiny vs Redux. |
| @tanstack/react-query | 5.x | Server cache | Sensor lists, histories, alerts; retry/offline-ish UX. |
| react-native-gifted-charts | ≥ 1.4.49 | Line/bar charts | Works in Expo Go; SVG-based. Pair with `react-gifted-charts` on web if RN SVG event warnings persist. |
| react-native-svg | Expo-aligned | Chart rendering | Peer of gifted-charts. |
| expo-haptics | SDK 58 aligned | Tactile feedback | Confirm mark-as-read / save on device (no-op on web). |
| @expo/vector-icons | bundled | Minimal icons | Prefer a small set of agri-readable icons. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| create-expo-app (tabs template) | Scaffold | Then reshape to 5 custom tabs + auth group. |
| EAS Build / EAS Submit | Dev client + store builds | Push tokens need a real build / EAS project, not only Expo Go on web. |
| eas integrations:supabase:connect | Wire Supabase keys | Writes `EXPO_PUBLIC_SUPABASE_URL` and publishable key; enable RLS immediately. |
| supabase CLI | Migrations, seed, Edge Functions | Keep schema in `supabase/migrations`, seed in `supabase/seed.sql`. |
| Expo Doctor | SDK alignment | After adding packages, `npx expo install --fix`. |
| TypeScript + ESLint (expo config) | Quality | Strict mode for domain types (`SensorStatus`, `Severity`). |

## Installation

```bash
# App (from empty repo)
npx create-expo-app@latest . --template tabs
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
npx expo install react-native-web react-dom
npx expo install expo-notifications expo-device expo-haptics react-native-svg

# Backend client + state
npx expo install @supabase/supabase-js expo-sqlite
npm install zustand @tanstack/react-query react-native-gifted-charts

# Align versions to SDK 58
npx expo install --fix
```

Pin Expo packages with `npx expo install`, not raw npm versions.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Expo Router + custom tab bar | React Navigation only | Never for new Expo apps — duplicates what Router wraps. |
| Custom JS tab bar | Expo Router NativeTabs | NativeTabs if we drop web visual parity and want iOS Liquid Glass. Brand (large agri targets, dark green) favors custom tabs on all platforms. |
| gifted-charts | victory-native 43 | Victory is Skia + Reanimated 4; web needs Skia canvas bootstrap and a dev client. Avoid for RN Web-first demo. |
| gifted-charts | victory (web) + native fork | Two implementations — worse than one SVG library with a web fallback. |
| Zustand + React Query | Redux Toolkit | Only if the team already standardizes on RTK. Overkill here. |
| Supabase | Firebase | User locked Supabase. Firebase would duplicate Auth+DB+FCM with worse SQL for time-series. |
| Edge Function → Expo Push API | OneSignal / FCM direct | Extra vendor; Expo Push is enough for v1. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Bare React Native CLI | Loses EAS, Router web, and Expo push helpers | Expo SDK 58 |
| Chart.js / Recharts only | DOM canvas; poor RN native | gifted-charts (+ web twin if needed) |
| victory-native as only chart | Fragile Skia-on-web | gifted-charts |
| AsyncStorage for auth session | Tokens in plaintext-ish storage | Official Expo Supabase session (sqlite/secure) |
| Service-role key in the app | Full DB bypass | Anon/publishable key + RLS; service role only in Edge Functions |
| Direct `supabase.from` in screens | Inconsistent demo data + hard ESP32 swap | `src/services/*` repositories |
| Real weather/ML APIs as truth | PROJECT.md forbids presenting fake science | Seeded rows + `is_demo` flag |
| NativeWind/Tailwind as the design system | Extra web/native styling mismatch risk for a custom agri look | StyleSheet + tokens (`theme.ts`) |
| Importing `@react-navigation/*` in app code | Broken on SDK 56+ with Expo Router | `expo-router` entry points |

## Stack Patterns by Variant

**If web is the primary classroom/demo surface:**
- Use Expo Router JS tabs (not NativeTabs)
- Gifted-charts with a Platform.select web implementation if press handlers warn
- Push is a no-op on web with an in-app banner explaining that

**If focusing on a physical Android phone in the field:**
- EAS development build early (push + notifications channel)
- Larger hit targets (min 48dp), high-contrast tokens, sun-readable type scale

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Expo SDK 58 | RN 0.88, React 19.3, RN Web 0.21 | Do not mix SDK 57 packages |
| expo-router ~58 | No `@react-navigation/*` app imports | Codemod if a template still imports them |
| @supabase/supabase-js 2.119 | Node ≥ 22 | Matches Expo 58 Node requirement |
| supabase-js + Expo | expo-sqlite session | Use the 2026 Expo “Using Supabase” guide, not old AsyncStorage snippets |
| react-native-gifted-charts ≥ 1.4.49 | react-native-svg (Expo) | Older versions spam web responder warnings |

## Sources

- https://docs.expo.dev/versions/latest — SDK 58.0.0 matrix (HIGH)
- https://docs.expo.dev/router/installation/ — Router + web deps (HIGH)
- https://docs.expo.dev/guides/using-supabase — official Expo↔Supabase connect (HIGH)
- https://docs.expo.dev/push-notifications/push-notifications-setup/ — tokens + projectId (HIGH)
- https://supabase.com/docs/guides/functions/examples/push-notifications?platform=expo — Edge Function → Expo Push (HIGH)
- https://www.npmjs.com/package/@supabase/supabase-js — 2.119.0 (HIGH)
- Gifted-charts author wiki + issues #609 — web vs native packages (MEDIUM)
- victory-native npm 43.0.1 — Skia/web caveats (MEDIUM)

---
*Stack research for: mobile agri-IoT monitoring*
*Researched: 2026-11-11*
