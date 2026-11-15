# Phase 1: App Shell, Auth & Demo Farm - Pattern Map

**Mapped:** 2026-11-11
**Files analyzed:** 52 new files (greenfield Expo app; no files modified)
**Analogs found:** 40 / 52 (all analogs live in the read-only reference `Projeto_entrega-main/Projeto_entrega-main/`, referred to below as `GEMMA/`)

`GEMMA` = `c:\Users\artur\Downloads\GS-Mobile\Projeto_entrega-main\Projeto_entrega-main`. All Gemma paths below are relative to `GEMMA/src` unless they start with `supabase/` or `skills/`. Gemma domain code and `.cursor/` were ignored (D-18).

Global translation rules (apply to every port):
- `className` and Tailwind strings become `StyleSheet` styles driven by `useTheme().colors` from `src/theme/tokens.ts`. No hex outside `tokens.ts`.
- `div/p/span/button/input/label` become `View/Text/Pressable/TextInput`. `onClick` becomes `onPress`. `onChange(event.target.value)` becomes `onChangeText(value)`. `aria-*` and `role` become `accessibilityRole/State/Label`.
- `window.setTimeout/setInterval/clearInterval` become global `setTimeout/setInterval/clearInterval`.
- `import.meta.env.VITE_*` becomes `process.env.EXPO_PUBLIC_*` (literal access).
- `react-router-dom` (`NavLink`, `useNavigate`, `useLocation`, `Outlet`) becomes `expo-router` (`router`, `Stack.Protected`, `expo-router/js-tabs`).
- Copy uses the final strings in UI-SPEC "Copywriting Contract". "Email" becomes "E-mail" (Gemma wrote "Email").
- Weights: only `Inter_400Regular` and `Inter_600SemiBold` in Phase 1 (UI-SPEC A6). Gemma `font-medium` maps to 600.

## File Classification

| New File | Role | Data Flow | Closest Analog (GEMMA) | Match |
|----------|------|-----------|------------------------|-------|
| `src/lib/security/limits.ts` | utility | transform | `src/lib/security/limits.ts` | exact (copy) |
| `src/lib/security/sanitize.ts` | utility | transform | `src/lib/security/sanitize.ts` | exact (copy) |
| `src/lib/security/validate.ts` (validateLogin + validateSignup + validateNewPassword) | utility | transform | `src/lib/security/validateLogin.ts` | exact (extend) |
| `src/lib/supabase.ts` | config/client | request-response | `src/lib/supabase.ts` | exact (adapt) |
| `src/lib/queryClient.ts` | config | CRUD | none | no analog |
| `src/features/auth/AuthProvider.tsx` | provider | request-response | `src/features/auth/AuthProvider.tsx` | exact (extend) |
| `src/features/auth/authErrors.ts` (`mapAuthError`) | utility | transform | inline error strings in AuthProvider.tsx lines 90-99 | partial |
| `src/features/auth/loginCooldown.ts` (pure state machine) + `.test.ts` | utility | event-driven | `src/features/auth/useLoginRateLimit.ts` | role-match (reduce) |
| `src/features/auth/useLoginRateLimit.ts` | hook | event-driven | `src/features/auth/useLoginRateLimit.ts` | exact (reduce) |
| `src/features/auth/authLinks.ts` (parse recovery URL) | utility | transform | none | no analog |
| `src/features/theme/ThemeProvider.tsx` | provider | event-driven | `src/features/theme/ThemeProvider.tsx` | exact (adapt) |
| `src/theme/tokens.ts`, `src/theme/fonts.ts` | config | transform | `src/index.css` (`@theme` + `html.dark`) | role-match |
| `src/components/layout/DatabaseGate.tsx` | component | request-response | `src/components/layout/DatabaseGate.tsx` | exact (adapt) |
| `src/components/layout/AppColumn.tsx` | component | layout | `src/components/layout/AppShell.tsx` | role-match |
| `src/components/layout/TabBar.tsx` | component | event-driven | `src/components/layout/BottomNavigation.tsx` | role-match |
| `src/components/layout/ScreenContainer.tsx`, `ScreenHeader.tsx` | component | layout | `AppShell.tsx` (`<main className="px-6 pb-28 pt-6">`) | partial |
| `src/components/brand/Logo.tsx` | component | static | `src/components/brand/Logo.tsx` (web SVG, replaced) | partial |
| `src/components/ui/Button.tsx` | component | event-driven | `src/components/ui/Button.tsx` | exact (rewrite) |
| `src/components/ui/Input.tsx` | component | event-driven | `src/components/ui/Input.tsx` | exact (rewrite) |
| `src/components/ui/Card.tsx` | component | static | `src/components/ui/Card.tsx` | exact |
| `src/components/ui/Badge.tsx` (+ `StatusBadge`, `DemoBadge`) | component | static | `src/components/ui/Badge.tsx` | exact / role-match |
| `src/components/ui/Tabs.tsx` | component | event-driven | `src/components/ui/Tabs.tsx` | exact |
| `src/components/ui/Modal.tsx` | component | event-driven | `src/components/ui/Modal.tsx` | exact (rewrite) |
| `src/components/ui/LoadingState.tsx` | component | static | `src/components/ui/LoadingState.tsx` | exact |
| `src/components/ui/EmptyState.tsx` | component | static | `src/components/ui/EmptyState.tsx` | exact |
| `src/components/ui/ErrorState.tsx` | component | static | `DatabaseUnavailable.tsx` (icon circle + title + desc + retry) | role-match |
| `src/components/ui/DatabaseUnavailable.tsx` | component | static | `src/components/ui/DatabaseUnavailable.tsx` | exact (rewrite) |
| `src/components/ui/ErrorBoundary.tsx` | component | event-driven | `src/components/ui/ErrorBoundary.tsx` | exact (adapt) |
| `src/components/ui/Select.tsx`, `Textarea.tsx` | component | event-driven | `src/components/ui/Select.tsx`, `Textarea.tsx` | exact (rewrite) |
| `src/components/ui/Text.tsx`, `Notice.tsx`, `AsyncBoundary.tsx` | component | static | none (new per UI-SPEC) | no analog |
| `src/app/_layout.tsx` | provider/route | request-response | `src/main.tsx` provider order + `ProtectedRoute.tsx` | role-match |
| `src/app/(auth)/index.tsx` | screen | request-response | `src/pages/LoginPage.tsx` | exact (rewrite) |
| `src/app/reset-password.tsx` | screen | request-response | `src/pages/LoginPage.tsx` (layout shell only) | partial |
| `src/app/(app)/(tabs)/_layout.tsx` | route | event-driven | `BottomNavigation.tsx` + `AppShell.tsx` | role-match |
| `src/app/(app)/(tabs)/index.tsx`, `perfil.tsx` | screen | CRUD (read) | none (Gemma pages are domain) | no analog |
| `src/app/(app)/(tabs)/monitoramento.tsx`, `alertas.tsx`, `analises.tsx` | screen | static | `EmptyState.tsx` usage | partial |
| `src/services/producers.ts`, `properties.ts`, `ServiceError` | service | CRUD | `src/features/*/api.ts` (domain; try/catch + friendly message convention only) | partial |
| `src/hooks/useCurrentProperty.ts`, `useProducer.ts` | hook | CRUD | none | no analog |
| `supabase/migrations/001_schema.sql`, `002_rls.sql`, `003_demo_farm.sql` | migration | batch | `supabase/migrations/001..003_*.sql` (conventions only) | partial |
| `.env.example`, `app.json`, `tsconfig.json`, `package.json`, ESLint config | config | n/a | `.env.example`, `tsconfig*.json` in GEMMA root (not read) | partial |
| `*.test.ts` for sanitize/validate/cooldown/authErrors/authLinks | test | transform | none in Gemma | no analog (use jest-expo per RESEARCH) |

## Pattern Assignments

### `src/lib/security/limits.ts` (utility, transform)

**Analog:** `GEMMA/src/lib/security/limits.ts` lines 1-9. Copy, drop Gemma-only constants, add `NAME_MAX` and `PASSWORD_MIN`.
```typescript
export const INPUT_LIMITS = {
  EMAIL_MAX: 254,
  PASSWORD_MAX: 128,
  NOME_MAX: 120,
  // drop ENDERECO_MAX, TELEFONE_MAX, OBSERVACOES_MAX, QUANTIDADE_MAX
} as const
// ADD: NAME_MAX (rename NOME_MAX), PASSWORD_MIN: 8 (UI-SPEC A4)
```

### `src/lib/security/sanitize.ts` (utility, transform)

**Analog:** `GEMMA/src/lib/security/sanitize.ts` lines 1-20. Copy verbatim.
```typescript
import { INPUT_LIMITS } from './limits'
export function stripControlCharacters(value: string): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
}
export function sanitizeEmailInput(value: string): string {
  return stripControlCharacters(value).trim().slice(0, INPUT_LIMITS.EMAIL_MAX)
}
export function sanitizePasswordInput(value: string): string {
  return stripControlCharacters(value).slice(0, INPUT_LIMITS.PASSWORD_MAX)
}
export function sanitizeTextField(value: string, maxLength: number): string {
  return stripControlCharacters(value).slice(0, maxLength)
}
```
Use `sanitizeTextField(value, INPUT_LIMITS.NAME_MAX)` for the signup name.

### `src/lib/security/validate.ts` (utility, transform)

**Analog:** `GEMMA/src/lib/security/validateLogin.ts` lines 1-50 (result union + early-return validation).
```typescript
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export type LoginValidationResult =
  | { ok: true; email: string; password: string }
  | { ok: false; error: string }

export function validateLoginCredentials(email: string, password: string): LoginValidationResult {
  const sanitizedEmail = sanitizeEmailInput(email)
  const sanitizedPassword = sanitizePasswordInput(password)
  if (!sanitizedEmail || !sanitizedPassword) return { ok: false, error: 'Preencha email e senha.' }
  if (sanitizedEmail.length > INPUT_LIMITS.EMAIL_MAX) return { ok: false, error: 'Email muito longo.' }
  if (sanitizedPassword.length > INPUT_LIMITS.PASSWORD_MAX) return { ok: false, error: 'Senha muito longa.' }
  if (!isValidEmailFormat(sanitizedEmail)) return { ok: false, error: 'Informe um email válido.' }
  return { ok: true, email: sanitizedEmail.toLowerCase(), password: sanitizedPassword }
}
```
Change: replace strings with UI-SPEC copy ("Preencha e-mail e senha.", "E-mail muito longo.", "Informe um e-mail válido."). Add `validateSignup(name,email,password)` (errors "Informe seu nome.", "Nome muito longo.", "Use pelo menos 8 caracteres.") and `validateNewPassword(pw)` reusing the same helpers. Login does NOT enforce PASSWORD_MIN (existing accounts); signup and reset do.

---

### `src/lib/supabase.ts` (client + health check, request-response)

**Analog:** `GEMMA/src/lib/supabase.ts` lines 1-70. Target shape is RESEARCH Pattern 3.

**Config / unconfigured fallback pattern** (Gemma lines 3-23, keep structure):
```typescript
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)
function createAppClient(): SupabaseClient {
  if (!isSupabaseConfigured) {
    return createClient('https://unavailable.invalid', 'unavailable', {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    })
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
  })
}
```
**Health check (keep verbatim)** (Gemma lines 33-65): `DatabaseAvailability` union (`missing_config | unreachable`), `AbortController` + 8s timeout, `GET ${url}/rest/v1/` with `apikey` and `Bearer` headers, reachable when `response.ok || 400 || 401 || 403 || 406`.

**Must change:**
- `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` becomes `process.env.EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` (literal access, `?.trim() ?? ''`).
- First line `import 'expo-sqlite/localStorage/install'`; pass `storage: localStorage` in `auth`.
- `detectSessionInUrl: Platform.OS === 'web'` (Gemma hardcoded `true`).
- `window.setTimeout/clearTimeout` becomes global.
- Add `AppState` listener to `startAutoRefresh/stopAutoRefresh` on native.

---

### `src/features/auth/AuthProvider.tsx` (provider, request-response)

**Analog:** `GEMMA/src/features/auth/AuthProvider.tsx` (139 lines). Keep the structure; extend.

**Context + init pattern** (lines 14-75): `AuthContextValue {user, session, loading, signIn, signOut}`, `createContext<... | null>(null)`, `mounted` flag, `getSession()` in try/catch/finally, `onAuthStateChange` subscription also sets `loading=false`, cleanup unsubscribes. Keep verbatim (the `console.error('Erro ao validar sessão')` messages never log the error object, which matches the CYBERSECURITY rule; keep).

**signIn pattern** (lines 77-101):
```typescript
const signIn = useCallback(async (email: string, password: string) => {
  const validation = validateLoginCredentials(email, password)
  if (!validation.ok) return { error: validation.error }
  try {
    const { error } = await supabase.auth.signInWithPassword({ email: validation.email, password: validation.password })
    if (error) return { error: 'Email ou senha inválidos.' }
    return { error: null }
  } catch {
    return { error: 'Não foi possível conectar ao banco de dados. Tente novamente mais tarde.' }
  }
}, [])
```
**signOut pattern** (lines 103-115): try/catch around `supabase.auth.signOut()`, then `setSession(null)` regardless.

**useAuth guard** (lines 131-139): throws `'useAuth deve ser usado dentro de AuthProvider'`. Keep.

**Must change:**
- Add to the context and implement with the same `{ error: string | null }` return shape and try/catch: `signUp(name,email,password)` (`supabase.auth.signUp({email,password,options:{data:{name}}})`; if `data.session === null` return the "Confirmação de e-mail ativa..." developer message), `resetPassword(email)` (`resetPasswordForEmail(email,{redirectTo: Linking.createURL('reset-password')})`; always report success), `updatePassword(pw)` (`auth.updateUser({password})`).
- Replace the catch-all error branch with `mapAuthError(error)` keyed on `error.code` (`invalid_credentials`, `user_already_exists`, `weak_password`, `over_request_rate_limit`, `over_email_send_rate_limit`, network). Login still returns the generic "E-mail ou senha inválidos." for credential errors.
- Network copy becomes UI-SPEC "Sem conexão. Verifique a internet e tente de novo."
- Add `queryClient.clear()` on logout at the call site (Perfil), not here.

---

### `src/features/auth/useLoginRateLimit.ts` (hook, event-driven)

**Analog:** `GEMMA/src/features/auth/useLoginRateLimit.ts` (lines 1-125). Keep only the cooldown subset.

**Constants + counters to keep** (lines 8-9, 12-13, 31-33, 99-104):
```typescript
const MAX_ATTEMPTS = 5
const COOLDOWN_MS = 30_000
// failedAttemptsRef.current += 1
// if (failedAttemptsRef.current >= MAX_ATTEMPTS) { failedAttemptsRef.current = 0; setLockedUntil(Date.now() + COOLDOWN_MS); setPhase('cooldown') }
```
**1s ticker to keep** (lines 41-52), swapping `window.setInterval/clearInterval` for globals. `remainingSeconds = Math.ceil((lockedUntil - now)/1000)`; `reset()` clears attempts and lock.

**Delete:** imports from `@/lib/security/loginRateLimitApi`, `phase` values `watch` and `ip_blocked`, `ipBlock` state, `blockIpForOneDay`, `checkIpBlockStatus`, `refreshIpBlock`, `blockMessage`, `isWatchMode`, `isIpBlocked`, the `loadIpStatus` effect (D-16). `recordFailure` becomes synchronous.

**Recommended split (RESEARCH Pattern 6):** pure functions `recordFailure(state, now)`, `remainingSeconds(state, now)`, `reset()` in `loginCooldown.ts` (unit-tested with jest); the hook only holds state and the ticker. Copy: "Muitas tentativas incorretas. Aguarde {n}s para tentar de novo."

---

### `src/features/theme/ThemeProvider.tsx` (provider, event-driven)

**Analog:** `GEMMA/src/features/theme/ThemeProvider.tsx` lines 1-63. Keep the context shape and error message style.

**Keep:**
```typescript
const ThemeContext = createContext<ThemeContextValue | null>(null)
export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme deve ser usado dentro de ThemeProvider')
  return context
}
```
**Change:** drop `storage.ts` imports (`applyThemeToDocument`, `readCachedTheme`, `writeCachedTheme` are DOM/localStorage). State becomes `override: ThemeMode | null`; `theme = override ?? useColorScheme() ?? 'light'`; value is `{ theme, colors: theme === 'dark' ? darkColors : lightColors, setTheme, toggleTheme }`. No toggle UI in Phase 1. Also supply `StatusBar` style from theme.

---

### `src/theme/tokens.ts` (config, transform)

**Analog:** `GEMMA/src/index.css` `@theme` block and `html.dark` overrides (not re-read in this pass; the UI-SPEC tables are the authoritative values and already include Gemma's series palette unchanged). Structure to mirror: same semantic key names as Gemma (`primary, text, success, warning, error, background, card, muted, border, series1..8, seriesOther`) with identical keys in `lightColors` and `darkColors`; radii 12/12/16. Planner: take values from UI-SPEC "Color" tables; spacing `xs..xxxl`, radius incl. `pill: 999`, `fonts`, `touch.min = 48` from UI-SPEC "Spacing Scale". Gemma's `muted` maps to `textMuted`, `secondary` (Gemma main text color) maps to `text`.

---

### `src/components/layout/DatabaseGate.tsx` (component, request-response)

**Analog:** `GEMMA/src/components/layout/DatabaseGate.tsx` lines 1-56. Copy the state machine verbatim.
```typescript
const [status, setStatus] = useState<'checking' | 'ok' | 'error'>(isSupabaseConfigured ? 'checking' : 'error')
const [retrying, setRetrying] = useState(false)
const verify = useCallback(async (isRetry = false) => {
  if (isRetry) setRetrying(true); else setStatus('checking')
  const result = await checkDatabaseAvailability()
  setStatus(result.available ? 'ok' : 'error'); setRetrying(false)
}, [])
useEffect(() => { if (!isSupabaseConfigured) return; void verify() }, [verify])
```
**Change:** `checking` branch renders `<View style={{flex:1, justifyContent:'center', backgroundColor: colors.background}}><LoadingState message="Conectando ao servidor…" /></View>`; `error` branch renders `DatabaseUnavailable` with `onRetry={() => void verify(true)}`; when `!isSupabaseConfigured` pass the "Configuração pendente" copy and no `onRetry` (UI-SPEC S7). `return children` stays.

---

### `src/components/ui/DatabaseUnavailable.tsx` (component, static)

**Analog:** `GEMMA/src/components/ui/DatabaseUnavailable.tsx` lines 1-67.

**Props to keep:** `onRetry?`, `retrying?`, `title?`, `description?`. **Layout to keep:** centered column max 390, `Logo` + wordmark above, `<Card variant="important">`, centered icon circle (`bg-error/10` becomes `colors.errorSoft`, 48 circle), title, description, `{onRetry ? <Button fullWidth onPress={onRetry} loading={retrying} disabled={retrying}>Tentar novamente</Button> : null}`.
**Change:** inline DB SVG becomes Lucide `CloudOff` (UI-SPEC) in `colors.error`; defaults become "Não foi possível conectar" / "O app abriu, mas o servidor não respondeu. Verifique sua internet e tente de novo."; loading label "Tentando…".

---

### `src/components/ui/ErrorBoundary.tsx` (component, event-driven)

**Analog:** `GEMMA/src/components/ui/ErrorBoundary.tsx` lines 1-41.
```typescript
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }
  static getDerivedStateFromError(): ErrorBoundaryState { return { hasError: true } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Erro inesperado na aplicação', error, info.componentStack) }
  render() { if (this.state.hasError) return <DatabaseUnavailable ... onRetry={...} />; return this.props.children }
}
```
**Change:** `onRetry` becomes `this.setState({ hasError: false })` (plus `window.location.reload()` only when `Platform.OS === 'web'`). Copy "Algo deu errado" / "Feche e abra o app de novo. Se continuar, tente mais tarde." / button "Recarregar app". A class component cannot call `useTheme`; DatabaseUnavailable (a function component) handles theming, so keep rendering it.

---

### `src/components/ui/Button.tsx` (component, event-driven)

**Analog:** `GEMMA/src/components/ui/Button.tsx` lines 1-62.

**Variants/sizes to keep** (lines 3-18): `'primary' | 'secondary' | 'danger' | 'ghost'`, `'md' | 'sm'`, props `variant, size, fullWidth, loading, disabled`. Semantics: `disabled={disabled || loading}`; loading shows spinner + label replacing children.
**Change:** `ButtonHTMLAttributes` becomes `PressableProps` + `onPress`; `type="submit"` has no RN equivalent, so forms call the submit handler via `onPress` and `onSubmitEditing`. `hover:` becomes `pressed` style (`primaryPressed`). `min-h-12`/`min-h-10` become `minHeight: 48/40` (+ `hitSlop` 4 for `sm`). Spinner becomes `ActivityIndicator` size 20. Loading label default "Carregando…" (Gemma "Carregando..."), overridable (e.g. "Entrando…"). Add `icon?`, `accessibilityRole="button"`, `accessibilityState={{disabled, busy: loading}}`. Danger fill token is `errorFill`, text `onPrimary` (Gemma used `text-white`).

---

### `src/components/ui/Input.tsx` (component, event-driven)

**Analog:** `GEMMA/src/components/ui/Input.tsx` lines 1-37. Props `label: string`, `error?: string`; layout is label (14 semibold) above field, error text below with `role="alert"`; border `border-error` vs `border-border`.
**Change:** `TextInput`; `label` is a `Text` (and `accessibilityLabel`); drop `useId`/`htmlFor`; error becomes `accessibilityLiveRegion="polite"` + `CircleAlert` icon row; focus state via `onFocus/onBlur` (2px `primaryText` border); add `helper?`, `secureTextEntry` with `Eye`/`EyeOff` 48x48 toggle ("Mostrar senha"/"Ocultar senha"); `onChange` becomes `onChangeText`; HTML attrs map: `autoComplete`, `keyboardType="email-address"`, `autoCapitalize="none"`, `autoCorrect={false}`, `textContentType`, `returnKeyType`. `maxLength` prop usage stays.

---

### `src/components/ui/Card.tsx`, `Badge.tsx`, `Tabs.tsx`

**Card** (`GEMMA/src/components/ui/Card.tsx` lines 1-27): `variant?: 'default' | 'important'`; base radius `--radius-card`, `important` radius `--radius-card-lg`, border + `bg-card` + `p-4`. Becomes `View` with `radius.card` / `radius.cardLg`, `borderWidth: 1`, `padding: 16`; optional `onPress` (Pressable) per UI-SPEC.

**Badge** (`Badge.tsx` lines 1-37): variants `default | success | warning | error | primary` with `bg-x/10 text-x`. Becomes `View+Text` pill, `{x}Soft` bg + `{x}Text` fg, add `alert` variant and optional leading Lucide `icon` (status never color-only). `StatusBadge` and `DemoBadge` (Lucide `FlaskConical`, "Dados demonstrativos") compose Badge.

**Tabs** (`Tabs.tsx` lines 1-32) API kept exactly: `{ tabs: Array<{id,label}>; active: string; onChange: (id) => void }`, container `role="tablist"`, each `role="tab"` + `aria-selected`. Becomes `View accessibilityRole="tablist"` + `Pressable accessibilityRole="tab" accessibilityState={{selected}}`; active segment `card` bg + 1px border + 2px `primary` bar; segment `minHeight 48`, container padding 4.

---

### `src/components/ui/Modal.tsx` (component, event-driven)

**Analog:** `GEMMA/src/components/ui/Modal.tsx` lines 1-48. API kept: `{ open, title, onClose, children }`; backdrop tap closes, panel stops propagation, header row = title + close button `aria-label="Fechar"`, `✕`.
**Change:** delete the `useEffect` that touches `document.body.style.overflow` and `window.addEventListener('keydown')`. Use RN `<Modal transparent animationType="fade" visible={open} onRequestClose={onClose}>` (handles Android back); backdrop `Pressable` with `colors.overlay`; inner `Pressable`/`View` swallows presses; close button `X` Lucide 48x48 `accessibilityLabel="Fechar"`; add web Escape via `Platform.OS==='web'` keydown only if needed (RN Web Modal usually covers it).

---

### `src/components/ui/LoadingState.tsx`, `EmptyState.tsx`

**LoadingState** (`LoadingState.tsx` lines 1-14): `{ message?: string }`, min height 200, spinner 32 + message 14 muted. Becomes `ActivityIndicator size="large" color={colors.primaryText}` + `Text`, `accessibilityRole="progressbar"`. Default message "Carregando…".

**EmptyState** (`EmptyState.tsx` lines 1-34): props `title, description?, actionLabel?, onAction?, icon?`; renders action as `Button variant="secondary" size="sm"` only when both `actionLabel && onAction`. Keep that condition. Title becomes Heading 20/600 `accessibilityRole="header"`; icon wrapped in a 48 circle.

**ErrorState** (new, shape copied from DatabaseUnavailable): `{title?, description?, onRetry, retrying?}`, `errorSoft` circle + `CloudOff`.

---

### `src/components/layout/TabBar.tsx` + `src/app/(app)/(tabs)/_layout.tsx` (component/route, event-driven)

**Analog:** `GEMMA/src/components/layout/BottomNavigation.tsx` lines 62-89 (item look) and 91-117 (nav container), plus RESEARCH Pattern 2 (the SDK 58 wiring).

**Look to copy** (item classes, lines 29-34 and container line ~100):
```
'flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 ... text-[10px] font-medium ...'
isActive ? 'text-primary' : 'text-muted hover:text-secondary'
nav: 'fixed bottom-0 ... border-t border-border bg-card/95 backdrop-blur-sm'   // aria-label="Navegação principal"
inner: 'items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)] pt-2'
```
**Translation:** `nav` becomes a normal-flow `View` (NOT absolute) with `backgroundColor: colors.card`, `borderTopWidth: 1`, `borderTopColor: colors.border`, `paddingTop: 8`, `paddingBottom: 8 + insets.bottom` (`useSafeAreaInsets`); drop `backdrop-blur` and the `fixed`. `NavLink isActive` becomes `state.index === index`. Items are `Pressable` `minHeight: 52`, `flex: 1`, icon in a 56x32 pill (`primarySoft` when active), Caption 12 label with `numberOfLines={1}`, `maxFontSizeMultiplier={1.2}`. `accessibilityRole="tab"`, `accessibilityState={{selected}}`.

**Delete from Gemma:** the whole `menuOpen` state, the center `-mt-7` round button, the `mobile-nav-sheet` dialog, `mobileLeft/mobileRight/pickItems`, the desktop/mobile split, the `document.body`/`window` keydown effect, `inert`, `NavIcons.tsx` (use Lucide `House, Activity, Bell, ChartLine, User`).

**Wiring (RESEARCH Pattern 2):**
```tsx
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs'   // NOT 'expo-router'
<Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false }}>
  <Tabs.Screen name="index" options={{ title: 'Início' }} /> ... monitoramento, alertas, analises, perfil
```
Press logic: `const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true }); if (!isFocused && !e.defaultPrevented) navigation.navigate(route.name, route.params);`

---

### `src/components/layout/AppColumn.tsx` (component, layout)

**Analog:** `GEMMA/src/components/layout/AppShell.tsx` lines 6-27.
```tsx
<div className="min-h-dvh bg-background">
  <div className="mx-auto min-h-dvh w-full max-w-[500px]"> <main className="px-6 pb-28 pt-6"> <Outlet /> </main> <BottomNavigation /> </div>
</div>
```
**Translation:** outer `View {flex:1, backgroundColor: colors.backgroundOuter, alignItems:'center'}`, inner `View {flex:1, width:'100%', maxWidth:500, backgroundColor: colors.background}`. Drop `isQuadro` special case, `Outlet`, `pb-28` (tab bar is in flow). Screen padding moves to `ScreenContainer` (16 horizontal, 16 top, 24 bottom, per UI-SPEC; Gemma used 24/24).

---

### `src/app/_layout.tsx` (root provider + guard, request-response)

**Analogs:** `GEMMA/src/main.tsx` (provider order Theme > ErrorBoundary > DatabaseGate > Auth > routes; not re-read, order documented in RESEARCH Porting Map) and `GEMMA/src/features/auth/ProtectedRoute.tsx` (replaced by `Stack.Protected`). Use RESEARCH Pattern 1 as the code template:
```tsx
<Stack screenOptions={{ headerShown: false }}>
  <Stack.Protected guard={!!session}><Stack.Screen name="(app)" /></Stack.Protected>
  <Stack.Protected guard={!session}><Stack.Screen name="(auth)" /></Stack.Protected>
  <Stack.Screen name="reset-password" />   // ungated
</Stack>
```
Provider stack: `SafeAreaProvider > ThemeProvider > ErrorBoundary > fonts/splash gate > DatabaseGate > QueryClientProvider > AuthProvider > AppColumn > Navigator`. Return `null` until `fontsLoaded && !loading`, then `SplashScreen.hide()`.

---

### `src/app/(auth)/index.tsx` (screen, request-response)

**Analog:** `GEMMA/src/pages/LoginPage.tsx` (190 lines). Copy flow and structure; rewrite markup.

**Structure to keep** (lines 96-107): centered column `max-w-[390px]`, brand block (`Logo` + app name + tagline) above `<Card variant="important">`.
**Not-configured banner to keep** (lines 108-113): when `!isSupabaseConfigured`, render a warning notice at the top of the card (becomes `<Notice variant="warning">Login indisponível: configure o Supabase no arquivo .env.</Notice>`).
**Submit flow to keep** (lines 46-92), minus IP-block calls:
```typescript
setError(null)
if (isCooldown) { setError(`Aguarde ${remainingSeconds}s antes de tentar novamente.`); return }   // keep, new copy
const validation = validateLoginCredentials(email, password)
if (!validation.ok) { setError(validation.error); return }
setLoading(true)
const result = await signIn(validation.email, validation.password)
if (result.error) { recordFailure(); setError(result.error); setLoading(false); return }
reset()   // cooldown reset
// navigation: NO navigate(). Stack.Protected switches groups when session appears.
```
**Inputs to keep** (lines 121-151): onChange sanitizes (`setEmail(sanitizeEmailInput(v))`, `setPassword(sanitizePasswordInput(v))`), `maxLength={INPUT_LIMITS.*_MAX}`, `disabled={formDisabled}` where `formDisabled = loading || !isConfigured || isLocked`.
**Cooldown notice** (lines 159-163): `Muitas tentativas incorretas. Aguarde {remainingSeconds}s.`, becomes `Notice warning`.

**Delete:** `useLocation/useNavigate/getSafeInternalPath/paths.ts`, `refreshIpBlock`, `isIpBlocked`, `isWatchMode`, `blockMessage`, `clearLocalLoginBlock`, `<form onSubmit>` (RN has no form; chain `returnKeyType` next/go and `onSubmitEditing`).
**Add:** `Tabs` ([Entrar | Criar conta], reuse `ui/Tabs`) with state `tab`; signup branch calls `signUp(name,email,password)` with `validateSignup`; forgot-password view (same route) calling `resetPassword`; 60s resend countdown; wrap in `KeyboardAvoidingView` + `ScrollView keyboardShouldPersistTaps="handled"`.

---

### `src/app/reset-password.tsx` (screen, request-response)

**Analog (layout shell only):** `LoginPage.tsx` lines 96-107 (logo + important card). No Gemma analog for the logic; use RESEARCH Pattern 4 (state machine `checking | ready | invalid | done`; native `Linking.useLinkingURL()` + manual hash parse + `supabase.auth.setSession`; web relies on `detectSessionInUrl`; `session` present means ready, none after ~4s means invalid; submit via `updatePassword` then `router.replace('/')`).

---

### `src/services/*` (service, CRUD)

**Analog:** none structurally in Gemma that is portable (its `features/*/api.ts` are domain). Convention to carry (CONTEXT code_context): "try/catch around every Supabase call with friendly messages". Use RESEARCH Pattern 8 (`ServiceError` with PT-BR message; only `src/services/**`, `src/features/auth/**`, `src/components/layout/DatabaseGate.tsx` import `@/lib/supabase`; enforce via ESLint `no-restricted-imports`). Planner should read one Gemma `api.ts` (e.g. `GEMMA/src/features/produtos/api.ts`) only for the try/catch/throw convention, not domain logic.

---

### `supabase/migrations/001_schema.sql`, `002_rls.sql`, `003_demo_farm.sql` (migration, batch)

**Analog (conventions only):** `GEMMA/supabase/migrations/001_extensions_and_enums.sql`, `002_schema.sql`, `003_rls_policies.sql`. SQL bodies come from RESEARCH Appendix A (dry-run verified; use near-verbatim).

**Conventions to copy:**
- Numbered ordered files `00N_<topic>.sql`, header comment `-- <Project> — 00N: <topic>` plus `-- Depende de: 002_schema.sql` (Gemma 003 header lines 1-2), run in the SQL Editor on a fresh project.
- `CREATE EXTENSION IF NOT EXISTS "pgcrypto";` and `CREATE TYPE public.<enum> AS ENUM (...)` in the first file.
- RLS: `ALTER TABLE public.<t> ENABLE ROW LEVEL SECURITY;` for every table in one block, then one policy per command named `<table>_<cmd>_<role>` with explicit `TO authenticated`:
```sql
CREATE POLICY "produtos_select_authenticated" ON public.produtos FOR SELECT TO authenticated USING (true);
CREATE POLICY "produtos_update_authenticated" ON public.produtos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
```
**Must change (D-17):** `USING (true)` becomes per-owner ownership via `(select auth.uid())` and the `private.is_property_owner()` helper (RESEARCH Appendix A); anon gets nothing; schema and RLS ship together (PITFALLS #6); `clone_demo_farm` lives in `private` schema with revoked EXECUTE; `public.ensure_demo_farm()` is the only client-callable function. Do NOT port `004_login_ip_blocks.sql`, `005_quadro.sql`, `006_financeiro.sql`, `setup_completo.sql`.

---

## Shared Patterns

### PT-BR, friendly, non-leaking errors
**Source:** `GEMMA/src/features/auth/AuthProvider.tsx` lines 37-47, 90-99, 108-111.
**Apply to:** AuthProvider, all services, screens.
Never surface raw Supabase error text; log fixed strings (`console.error('Erro ao validar sessão')`, no error object); return `{ error: string | null }` from auth actions; generic credential message.

### Input sanitize-on-change + validate-on-submit
**Source:** `GEMMA/src/pages/LoginPage.tsx` lines 132-134, 146-148, 67-72 plus `lib/security/*`.
**Apply to:** every auth form field (login, signup, forgot, reset).
```typescript
onChangeText={(v) => setEmail(sanitizeEmailInput(v))}
const validation = validateLoginCredentials(email, password)
if (!validation.ok) { setError(validation.error); return }
```

### Connection-error state
**Source:** `DatabaseGate.tsx` + `DatabaseUnavailable.tsx`.
**Apply to:** app root (gate), `ErrorBoundary`, `ErrorState`/`AsyncBoundary` for query failures (same icon circle + title + description + "Tentar novamente").

### Theme access
**Source:** `ThemeProvider.tsx` `useTheme()` (throws outside provider).
**Apply to:** every component. Pattern: `const { colors } = useTheme(); const styles = useMemo(() => makeStyles(colors), [colors])`. Never hardcode hex outside `tokens.ts`.

### Component variant maps
**Source:** `Button.tsx` `variantClasses/sizeClasses` and `Badge.tsx` `variantClasses` (a `Record<Variant, ...>` lookup).
**Apply to:** Button, Badge, Notice. Translate the Record values from class strings to style objects built from `colors`.

### Design rules (DESIGN.md)
**Apply to:** all UI: spacing 4/8/12/16/24/32/48, radius 12/16, min touch 48, transitions under 200ms, card = primary info + secondary info + quick action, icons only from Lucide (sizes 16/20/24).

### Security (CYBERSECURITY.md)
**Apply to:** repo setup: `.env`/`.env.local` ignored, `.env.example` committed with `EXPO_PUBLIC_SUPABASE_URL=` and `EXPO_PUBLIC_SUPABASE_ANON_KEY=`, no service-role key anywhere.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/lib/queryClient.ts`, `src/hooks/useCurrentProperty.ts`, `useProducer.ts` | config/hook | CRUD | Gemma has no React Query; use RESEARCH Pattern 8 |
| `src/features/auth/authLinks.ts` | utility | transform | No deep links in Gemma; RESEARCH Pattern 4 (manual query+hash parse, no `URLSearchParams` on Hermes) |
| `src/components/ui/Text.tsx`, `Notice.tsx`, `AsyncBoundary.tsx`, `StatusBadge`, `DemoBadge` | component | static | New in UI-SPEC |
| `src/app/(app)/(tabs)/index.tsx`, `perfil.tsx` | screen | read | Gemma pages are domain; follow UI-SPEC S4/S6 and `AsyncBoundary` |
| `src/components/brand/Logo.tsx` | component | static | Gemma Logo/wordmark are web SVG for a different brand; build leaf + 2 arcs with `react-native-svg` per UI-SPEC "Brand Mark" |
| Tests (`*.test.ts`) | test | transform | Gemma has no tests; `jest-expo` preset, pure-logic tests for sanitize/validate/cooldown/authErrors/authLinks |
| `jest`/ESLint config | config | n/a | Use RESEARCH install section |

## Notes for the planner

- UI-SPEC "Component Inventory" table rows for `Text` and `Badge` contain garbled text (merged cells containing a `Notice` variant fragment). Use the intended values: `Text` variants `caption|label|body|heading`, weights `regular|semibold`, tones `default|muted|primary|success|warning|error`; `Badge` variants `default|primary|success|warning|alert|error` plus `icon?`. The `Notice` row is correct on its own further down.
- Gemma's `font-medium` 500 maps to 600; Gemma's `Email` copy maps to `E-mail`.
- Gemma `LoginPage` navigates after success; the Expo app must not (guard-driven).
- Gemma had no `signUp`, `resetPassword`, `updatePassword`, tests, services layer, or per-owner RLS; those come from RESEARCH.
- Not re-read (large RESEARCH Appendix A, lines 423-1061 of 01-RESEARCH.md) holds the final SQL and test guidance; planner should read it directly for migrations.

## Metadata

**Analog search scope:** `GEMMA/src/{features/auth,features/theme,lib,components/ui,components/layout,pages/LoginPage.tsx}`, `GEMMA/supabase/migrations/001,003`
**Files read:** ~26 (Gemma) plus CONTEXT, UI-SPEC, RESEARCH (lines 1-422)
**Pattern extraction date:** 2026-11-11
