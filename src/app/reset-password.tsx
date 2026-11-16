import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import CircleCheck from 'lucide-react-native/icons/circle-check';
import TriangleAlert from 'lucide-react-native/icons/triangle-alert';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/ui/LoadingState';
import { Notice } from '@/components/ui/Notice';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/features/auth/AuthProvider';
import { useInFlightLock } from '@/features/auth/inFlightLock';
import { classifyRecoveryUrl, getRecoveryCode } from '@/features/auth/authLinks';
import { useTheme } from '@/features/theme/ThemeProvider';
import { INPUT_LIMITS } from '@/lib/security/limits';
import { validateNewPassword } from '@/lib/security/validate';
import { supabase } from '@/lib/supabase';
import { radius, spacing } from '@/theme/tokens';

type Phase = 'verifying' | 'exchanging' | 'ready' | 'invalid' | 'success';

const SESSION_WAIT_MS = 4000;

/** Drop the one-time `?code=` from the browser address bar after a successful exchange. */
function clearCodeFromWebUrl() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    window.history.replaceState(window.history.state, '', window.location.pathname);
  } catch {
    // history API unavailable: harmless, the code is single-use
  }
}

export default function ResetPasswordScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session, loading, updatePassword, signOut } = useAuth();
  const url = Linking.useLinkingURL();

  const [phase, setPhase] = useState<Phase>('verifying');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const exchangedCode = useRef<string | null>(null);
  const mounted = useRef(true);
  const lock = useInFlightLock();
  const [pendingForgot, setPendingForgot] = useState(false);

  useEffect(() => {
    if (pendingForgot && !session) {
      router.replace({ pathname: '/', params: { mode: 'forgot' } });
    }
  }, [pendingForgot, session, router]);

  // PKCE recovery link (native deep link and web): `?code=` is exchanged for a session.
  // The exchange only succeeds on the device/browser that requested the reset.
  useEffect(() => {
    if (!url) return;
    const kind = classifyRecoveryUrl(url);
    if (kind === 'error') {
      setPhase((p) => (p === 'success' ? p : 'invalid'));
      return;
    }
    const code = getRecoveryCode(url);
    if (!code || exchangedCode.current === code) return;
    exchangedCode.current = code;
    setPhase((p) => (p === 'success' ? p : 'exchanging'));
    supabase.auth
      .exchangeCodeForSession(code)
      .then(({ error }) => {
        if (!mounted.current) return;
        if (!error) clearCodeFromWebUrl();
        setPhase((p) => (p === 'success' ? p : error ? 'invalid' : 'ready'));
      })
      .catch(() => {
        if (mounted.current) setPhase((p) => (p === 'success' ? p : 'invalid'));
      });
  }, [url]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // The form only unlocks after a successful code exchange in this screen visit
  // ('exchanging' -> 'ready' above). A pre-existing session never counts as recovery.
  // No recovery code shortly after loading finished means the link is unusable.
  useEffect(() => {
    if (loading || phase !== 'verifying') return;
    const id = setTimeout(() => {
      setPhase((p) => (p === 'verifying' ? 'invalid' : p));
    }, SESSION_WAIT_MS);
    return () => clearTimeout(id);
  }, [loading, phase]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        flex: { flex: 1, backgroundColor: colors.background },
        content: {
          flexGrow: 1,
          alignItems: 'center',
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.xxxl + insets.top,
          paddingBottom: spacing.xl + insets.bottom,
        },
        column: { width: '100%', maxWidth: 390, gap: spacing.xxl },
        brand: { alignItems: 'center' },
        form: { gap: spacing.lg, padding: spacing.sm },
        center: { alignItems: 'center', gap: spacing.md },
        centerText: { textAlign: 'center' },
        circle: {
          width: 48,
          height: 48,
          borderRadius: radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
        },
        warnCircle: { backgroundColor: colors.warningSoft },
        okCircle: { backgroundColor: colors.successSoft },
      }),
    [colors, insets.top, insets.bottom],
  );

  async function save() {
    if (saving || !lock.tryAcquire()) return;
    try {
      setFormError(null);
      setFieldError(null);
      setConfirmError(null);

      const v = validateNewPassword(password);
      if (!v.ok) {
        setFieldError(v.error);
        return;
      }
      if (password !== confirm) {
        setConfirmError('As senhas não conferem.');
        return;
      }
      setSaving(true);
      const { error } = await updatePassword(password);
      setSaving(false);
      if (error) {
        setFormError(error);
        return;
      }
      setPassword('');
      setConfirm('');
      setPhase('success');
    } finally {
      if (mounted.current) setSaving(false);
      lock.release();
    }
  }

  async function requestNewLink() {
    // Navigate from the effect below, once the auth guard has re-rendered without a session;
    // otherwise `/` still resolves to the (app) group and `mode=forgot` is lost.
    setPendingForgot(true);
    if (session) await signOut();
  }

  let body: ReactNode;
  if (phase === 'verifying' || phase === 'exchanging') {
    body = <LoadingState message="Validando link…" />;
  } else if (phase === 'ready') {
    body = (
      <View style={styles.form}>
        <Text variant="heading" weight="semibold">
          Definir nova senha
        </Text>
        <Text tone="muted">Crie uma senha nova para entrar no AgroAlerta.</Text>
        <Input
          label="Nova senha"
          value={password}
          onChangeText={setPassword}
          error={fieldError}
          helper="Mínimo de 8 caracteres, com letras e números."
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
          maxLength={INPUT_LIMITS.PASSWORD_MAX}
          editable={!saving}
        />
        <Input
          label="Confirmar senha"
          value={confirm}
          onChangeText={setConfirm}
          error={confirmError}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          maxLength={INPUT_LIMITS.PASSWORD_MAX}
          editable={!saving}
          onSubmitEditing={() => void save()}
        />
        {formError ? <Notice variant="error">{formError}</Notice> : null}
        <Button fullWidth loading={saving} loadingLabel="Salvando…" onPress={() => void save()}>
          Salvar nova senha
        </Button>
      </View>
    );
  } else if (phase === 'invalid') {
    body = (
      <View style={styles.form}>
        <View style={styles.center}>
          <View style={[styles.circle, styles.warnCircle]} importantForAccessibility="no" accessibilityElementsHidden>
            <TriangleAlert size={24} color={colors.warningText} />
          </View>
          <Text variant="heading" weight="semibold" accessibilityRole="alert" style={styles.centerText}>
            Link expirado ou inválido
          </Text>
          <Text tone="muted" style={styles.centerText}>
            Este link não vale mais. Peça um novo para redefinir sua senha.
          </Text>
        </View>
        <Button fullWidth onPress={() => void requestNewLink()}>
          Enviar novo link
        </Button>
        <Button variant="ghost" fullWidth onPress={() => router.replace('/')}>
          Voltar para entrar
        </Button>
      </View>
    );
  } else {
    body = (
      <View style={styles.form}>
        <View style={styles.center}>
          <View style={[styles.circle, styles.okCircle]} importantForAccessibility="no" accessibilityElementsHidden>
            <CircleCheck size={24} color={colors.successText} />
          </View>
          <Text variant="heading" weight="semibold" accessibilityRole="alert" style={styles.centerText}>
            Senha atualizada
          </Text>
          <Text tone="muted" style={styles.centerText}>
            Pronto! Você já está conectado.
          </Text>
        </View>
        <Button fullWidth onPress={() => router.replace('/')}>
          Ir para o início
        </Button>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.column}>
          <View style={styles.brand}>
            <Logo size={56} withWordmark stacked />
          </View>
          <Card variant="important">{body}</Card>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
