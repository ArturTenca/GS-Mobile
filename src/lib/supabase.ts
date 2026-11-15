import 'expo-sqlite/localStorage/install';

import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

// Literal expressions are required so Expo can inline EXPO_PUBLIC_* values at build time.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const HEALTH_TIMEOUT_MS = 8_000;

function createAppClient() {
  if (!isSupabaseConfigured) {
    return createClient('https://unavailable.invalid', 'unavailable', {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: localStorage,
      autoRefreshToken: true,
      persistSession: true,
      // PKCE: recovery links carry `?code=`, exchanged explicitly in reset-password.tsx.
      // The code verifier lives in this device's storage, so a link minted elsewhere fails.
      // URL pickup is off on every platform: no session is ever taken from a URL fragment.
      flowType: 'pkce',
      detectSessionInUrl: false,
    },
  });
}

export const supabase = createAppClient();

if (Platform.OS !== 'web' && isSupabaseConfigured) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      void supabase.auth.startAutoRefresh();
    } else {
      void supabase.auth.stopAutoRefresh();
    }
  });
}

export type DatabaseAvailability =
  | { available: true }
  | { available: false; reason: 'missing_config' | 'invalid_config' | 'unreachable' };

export async function checkDatabaseAvailability(): Promise<DatabaseAvailability> {
  if (!isSupabaseConfigured) {
    return { available: false, reason: 'missing_config' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);

  try {
    // Public Auth settings: 200 only when the project key is valid, 401/403 when it is
    // wrong or revoked. That separates "bad configuration" from "server unreachable".
    const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      method: 'GET',
      headers: {
        apikey: supabaseAnonKey,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    if (response.ok) {
      return { available: true };
    }
    if (response.status === 401 || response.status === 403) {
      return { available: false, reason: 'invalid_config' };
    }
    return { available: false, reason: 'unreachable' };
  } catch {
    return { available: false, reason: 'unreachable' };
  } finally {
    clearTimeout(timeoutId);
  }
}
