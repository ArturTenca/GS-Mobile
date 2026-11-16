import type { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { AUTH_MESSAGES, isNetworkError, mapAuthError } from '@/features/auth/authErrors';
import { clearUserScopedState } from '@/features/auth/sessionCleanup';
import { queryClient } from '@/lib/queryClient';
import { safeLog } from '@/security/taint/sinks';
import {
  validateLoginCredentials,
  validateNewPassword,
  validateSignup,
  type SignupField,
} from '@/lib/security/validate';
import { supabase } from '@/lib/supabase';

/** `code`: server error code (for UX decisions like the login cooldown); never shown to the user. */
type ActionResult = { error: string | null; code?: string };
/** `notice`: non-error follow-up for the user (e.g. "check your e-mail" after signup). */
type SignUpResult = ActionResult & { notice?: string; field?: SignupField };

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<ActionResult>;
  signUp: (name: string, email: string, password: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<ActionResult>;
  updatePassword: (password: string) => Promise<ActionResult>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const lastUserId = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initSession() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;
        if (error) {
          safeLog('error', 'Erro ao validar sessão');
          setSession(null);
        } else {
          setSession(data.session);
        }
      } catch {
        if (!mounted) return;
        safeLog('error', 'Erro ao validar sessão');
        setSession(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void initSession();

    let subscription: { unsubscribe: () => void } | null = null;
    try {
      const {
        data: { subscription: authSubscription },
      } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        if (!mounted) return;
        setSession(nextSession);
        setLoading(false);
      });
      subscription = authSubscription;
    } catch {
      safeLog('error', 'Erro ao observar sessão');
    }

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Cache is per owner: drop it whenever the authenticated user changes or signs out.
  const userId = session?.user?.id ?? null;
  useEffect(() => {
    if (lastUserId.current !== userId) {
      queryClient.clear();
      lastUserId.current = userId;
    }
  }, [userId]);

  const signIn = useCallback(async (email: string, password: string): Promise<ActionResult> => {
    const validation = validateLoginCredentials(email, password);
    if (!validation.ok) return { error: validation.error };
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: validation.email,
        password: validation.password,
      });
      if (error) return { error: mapAuthError(error), code: error.code };
      return { error: null };
    } catch {
      return { error: AUTH_MESSAGES.offline };
    }
  }, []);

  const signUp = useCallback(
    async (name: string, email: string, password: string): Promise<SignUpResult> => {
      const validation = validateSignup(name, email, password);
      if (!validation.ok) return { error: validation.error, field: validation.field };
      try {
        const { data, error } = await supabase.auth.signUp({
          email: validation.email,
          password: validation.password,
          options: { data: { name: validation.name } },
        });
        if (error) return { error: mapAuthError(error) };
        if (!data.session) {
          // Developer hint only; the farmer sees a plain "check your e-mail" message.
          safeLog(
            'warn',
            '[auth] signUp returned no session: "Confirm email" is enabled in Supabase Auth (D-02 expects it off).',
          );
          return { error: null, notice: AUTH_MESSAGES.confirmEmailSent };
        }
        return { error: null };
      } catch {
        return { error: AUTH_MESSAGES.offline };
      }
    },
    [],
  );

  const signOut = useCallback(async () => {
    // A failed server revoke (e.g. offline) leaves the session in storage, so always
    // fall back to a local sign-out that drops the persisted tokens on this device.
    let dropLocal = false;
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        safeLog('error', 'Erro ao encerrar sessão');
        dropLocal = true;
      }
    } catch {
      safeLog('error', 'Erro ao encerrar sessão');
      dropLocal = true;
    }
    if (dropLocal) {
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch {
        safeLog('error', 'Erro ao limpar sessão local');
      }
    }
    const previousUserId = lastUserId.current;
    setSession(null);
    clearUserScopedState(previousUserId);
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<ActionResult> => {
    const validation = validateLoginCredentials(email, 'x');
    if (!validation.ok) return { error: validation.error };
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(validation.email, {
        redirectTo: Linking.createURL('reset-password'),
      });
      if (error?.code === 'over_email_send_rate_limit') {
        return { error: AUTH_MESSAGES.emailRateLimit };
      }
      if (error && isNetworkError(error)) return { error: AUTH_MESSAGES.offline };
      if (error && typeof error.status === 'number' && error.status >= 500) {
        return { error: AUTH_MESSAGES.unavailable };
      }
      // Anti-enumeration: any other server answer is reported as success.
    } catch {
      // The request never completed: do not claim a link was sent.
      return { error: AUTH_MESSAGES.offline };
    }
    return { error: null };
  }, []);

  const updatePassword = useCallback(async (password: string): Promise<ActionResult> => {
    const validation = validateNewPassword(password);
    if (!validation.ok) return { error: validation.error };
    try {
      const { error } = await supabase.auth.updateUser({ password: validation.password });
      if (error) return { error: mapAuthError(error) };
      return { error: null };
    } catch {
      return { error: AUTH_MESSAGES.offline };
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      signIn,
      signUp,
      signOut,
      resetPassword,
      updatePassword,
    }),
    [session, loading, signIn, signUp, signOut, resetPassword, updatePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
}
