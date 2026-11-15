import { useLocalSearchParams } from 'expo-router';
import MailCheck from 'lucide-react-native/icons/mail-check';
import { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, type InputRef } from '@/components/ui/Input';
import { Notice } from '@/components/ui/Notice';
import { Tabs } from '@/components/ui/Tabs';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/features/auth/AuthProvider';
import { useLoginRateLimit } from '@/features/auth/useLoginRateLimit';
import { useTheme } from '@/features/theme/ThemeProvider';
import { INPUT_LIMITS } from '@/lib/security/limits';
import { sanitizeEmailInput, sanitizePasswordInput, sanitizeTextField } from '@/lib/security/sanitize';
import { validateLoginCredentials, validateSignup } from '@/lib/security/validate';
import { isSupabaseConfigured } from '@/lib/supabase';
import { radius, spacing } from '@/theme/tokens';

type Mode = 'login' | 'signup';
type Panel = 'tabs' | 'forgot' | 'sent';
type FieldErrors = { name?: string; email?: string; password?: string };

const RESEND_SECONDS = 60;

const TABS = [
  { id: 'login', label: 'Entrar' },
  { id: 'signup', label: 'Criar conta' },
];

export default function AuthScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { signIn, signUp, resetPassword } = useAuth();
  const params = useLocalSearchParams<{ mode?: string }>();
  const { isCooldown, remainingSeconds, recordFailure, reset } = useLoginRateLimit();

  const [mode, setMode] = useState<Mode>('login');
  const [panel, setPanel] = useState<Panel>(params.mode === 'forgot' ? 'forgot' : 'tabs');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sentEmail, setSentEmail] = useState('');
  const [resendLeft, setResendLeft] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [formNotice, setFormNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const nameRef = useRef<InputRef>(null);
  const emailRef = useRef<InputRef>(null);
  const passwordRef = useRef<InputRef>(null);

  useEffect(() => {
    if (params.mode === 'forgot') {
      setPanel('forgot');
      setEmail('');
      setFormError(null);
    }
  }, [params.mode]);

  const counting = resendLeft > 0;
  useEffect(() => {
    if (!counting) return;
    const id = setInterval(() => setResendLeft((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(id);
  }, [counting]);

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
        brand: { alignItems: 'center', gap: spacing.sm },
        form: { gap: spacing.lg, padding: spacing.sm },
        forgotLink: { alignSelf: 'flex-end', minHeight: 48, justifyContent: 'center' },
        center: { alignItems: 'center', gap: spacing.md },
        centerText: { textAlign: 'center' },
        circle: {
          width: 48,
          height: 48,
          borderRadius: radius.pill,
          backgroundColor: colors.successSoft,
          alignItems: 'center',
          justifyContent: 'center',
        },
      }),
    [colors, insets.top, insets.bottom],
  );

  const disabled = submitting || isCooldown;

  function changeMode(next: string) {
    setMode(next as Mode);
    setFieldErrors({});
    setFormError(null);
    setFormNotice(null);
    setPassword('');
  }

  async function submit() {
    if (disabled) return;
    setFormError(null);
    setFormNotice(null);
    setFieldErrors({});

    if (mode === 'login') {
      const v = validateLoginCredentials(email, password);
      if (!v.ok) {
        setFormError(v.error);
        return;
      }
      setSubmitting(true);
      const { error } = await signIn(email, password);
      setSubmitting(false);
      if (error) {
        recordFailure();
        setFormError(error);
        return;
      }
      reset();
      return;
    }

    const v = validateSignup(name, email, password);
    if (!v.ok) {
      const next: FieldErrors = {};
      if (v.error.includes('nome') || v.error.includes('Nome')) next.name = v.error;
      else if (v.error.includes('e-mail')) next.email = v.error;
      else next.password = v.error;
      setFieldErrors(next);
      (next.name ? nameRef : next.email ? emailRef : passwordRef).current?.focus();
      return;
    }
    setSubmitting(true);
    const { error, notice } = await signUp(name, email, password);
    setSubmitting(false);
    if (error) {
      setFormError(error);
      return;
    }
    if (notice) {
      // Account created but the server requires e-mail confirmation: guide to login.
      setMode('login');
      setPassword('');
      setFormNotice(notice);
      return;
    }
    // Stack.Protected switches to the app shell once the session exists.
  }

  async function sendLink() {
    if (submitting) return;
    setFormError(null);
    const target = panel === 'sent' ? sentEmail : email;
    setSubmitting(true);
    const { error } = await resetPassword(target);
    setSubmitting(false);
    if (error) {
      setFormError(error);
      return;
    }
    // Same confirmation whether or not the account exists (D-03, anti-enumeration).
    setSentEmail(target.trim());
    setResendLeft(RESEND_SECONDS);
    setPanel('sent');
  }

  function backToLogin() {
    setPanel('tabs');
    setMode('login');
    setFormError(null);
    setFieldErrors({});
  }

  const emailField = (
    <Input
      ref={emailRef}
      label="E-mail"
      value={email}
      onChangeText={(t) => setEmail(sanitizeEmailInput(t))}
      error={fieldErrors.email}
      keyboardType="email-address"
      autoCapitalize="none"
      autoCorrect={false}
      autoComplete="email"
      textContentType="emailAddress"
      returnKeyType={panel === 'forgot' ? 'send' : 'next'}
      maxLength={INPUT_LIMITS.EMAIL_MAX}
      editable={panel === 'tabs' ? !disabled : !submitting}
      onSubmitEditing={() => (panel === 'forgot' ? void sendLink() : passwordRef.current?.focus())}
    />
  );

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
            <Text tone="muted" style={{ textAlign: 'center' }}>
              Monitoramento e alertas da sua propriedade
            </Text>
          </View>

          <Card variant="important">
            {panel === 'forgot' ? (
              <View style={styles.form}>
                <Text variant="heading" weight="semibold">
                  Recuperar senha
                </Text>
                <Text tone="muted">
                  Informe seu e-mail. Vamos enviar um link para criar uma nova senha.
                </Text>
                {emailField}
                {formError ? <Notice variant="error">{formError}</Notice> : null}
                <Button fullWidth loading={submitting} loadingLabel="Enviando…" onPress={() => void sendLink()}>
                  Enviar link
                </Button>
                <Button variant="ghost" fullWidth onPress={backToLogin}>
                  Voltar para entrar
                </Button>
              </View>
            ) : panel === 'sent' ? (
              <View style={styles.form}>
                <View style={styles.center}>
                  <View style={styles.circle} importantForAccessibility="no" accessibilityElementsHidden>
                    <MailCheck size={24} color={colors.successText} />
                  </View>
                  <Text variant="heading" weight="semibold" accessibilityRole="alert" style={styles.centerText}>
                    Verifique seu e-mail
                  </Text>
                  <Text tone="muted" style={styles.centerText}>
                    {'Se houver uma conta com '}
                    <Text weight="semibold">{sentEmail}</Text>
                    {', enviamos um link para criar uma nova senha. Confira também o spam.'}
                  </Text>
                </View>
                {formError ? <Notice variant="error">{formError}</Notice> : null}
                <Button variant="secondary" fullWidth onPress={backToLogin}>
                  Voltar para entrar
                </Button>
                <Button
                  variant="ghost"
                  fullWidth
                  disabled={resendLeft > 0}
                  loading={submitting}
                  loadingLabel="Enviando…"
                  onPress={() => void sendLink()}
                >
                  {resendLeft > 0 ? `Reenviar em ${resendLeft}s` : 'Reenviar link'}
                </Button>
              </View>
            ) : (
              <View style={styles.form}>
                {!isSupabaseConfigured ? (
                  <Notice variant="warning">Login indisponível: configure o Supabase no arquivo .env.</Notice>
                ) : null}

                <Tabs tabs={TABS} active={mode} onChange={changeMode} />

                {mode === 'signup' ? (
                  <Input
                    ref={nameRef}
                    label="Nome"
                    value={name}
                    onChangeText={(t) => setName(sanitizeTextField(t, INPUT_LIMITS.NAME_MAX))}
                    error={fieldErrors.name}
                    autoCapitalize="words"
                    autoComplete="name"
                    textContentType="name"
                    returnKeyType="next"
                    maxLength={INPUT_LIMITS.NAME_MAX}
                    editable={!disabled}
                    onSubmitEditing={() => emailRef.current?.focus()}
                  />
                ) : null}

                {emailField}

                <Input
                  ref={passwordRef}
                  label="Senha"
                  value={password}
                  onChangeText={(t) => setPassword(sanitizePasswordInput(t))}
                  error={fieldErrors.password}
                  helper={mode === 'signup' ? 'Mínimo de 8 caracteres.' : undefined}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete={mode === 'signup' ? 'new-password' : 'password'}
                  textContentType={mode === 'signup' ? 'newPassword' : 'password'}
                  returnKeyType="go"
                  maxLength={INPUT_LIMITS.PASSWORD_MAX}
                  editable={!disabled}
                  onSubmitEditing={() => void submit()}
                />

                {mode === 'login' ? (
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel="Esqueci minha senha"
                    style={styles.forgotLink}
                    onPress={() => {
                      setFormError(null);
                      setFieldErrors({});
                      setPanel('forgot');
                    }}
                  >
                    <Text variant="label" weight="semibold" tone="primary">
                      Esqueci minha senha
                    </Text>
                  </Pressable>
                ) : null}

                {isCooldown ? (
                  <Notice variant="warning">
                    {`Muitas tentativas incorretas. Aguarde ${remainingSeconds}s para tentar de novo.`}
                  </Notice>
                ) : formError ? (
                  <Notice variant="error">{formError}</Notice>
                ) : formNotice ? (
                  <Notice variant="success">{formNotice}</Notice>
                ) : null}

                <Button
                  fullWidth
                  loading={submitting}
                  loadingLabel={mode === 'login' ? 'Entrando…' : 'Criando conta…'}
                  disabled={isCooldown}
                  onPress={() => void submit()}
                >
                  {mode === 'login' ? 'Entrar' : 'Criar conta'}
                </Button>
              </View>
            )}
          </Card>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
