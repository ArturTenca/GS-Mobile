import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { DatabaseUnavailable } from '@/components/ui/DatabaseUnavailable';
import { LoadingState } from '@/components/ui/LoadingState';
import { useTheme } from '@/features/theme/ThemeProvider';
import { checkDatabaseAvailability, isSupabaseConfigured } from '@/lib/supabase';

export function DatabaseGate({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const [status, setStatus] = useState<'checking' | 'ok' | 'error' | 'invalid_config'>(
    isSupabaseConfigured ? 'checking' : 'error',
  );
  const [retrying, setRetrying] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
      }),
    [colors],
  );

  const verify = useCallback(async (isRetry = false) => {
    if (isRetry) {
      setRetrying(true);
    } else {
      setStatus('checking');
    }
    const result = await checkDatabaseAvailability();
    setStatus(result.available ? 'ok' : result.reason === 'invalid_config' ? 'invalid_config' : 'error');
    setRetrying(false);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    void verify();
  }, [verify]);

  if (status === 'checking') {
    return (
      <View style={styles.loading}>
        <LoadingState message="Conectando ao servidor…" />
      </View>
    );
  }

  if (status === 'error') {
    if (!isSupabaseConfigured) {
      return (
        <DatabaseUnavailable
          title="Configuração pendente"
          description="Configure as variáveis do Supabase no arquivo .env para usar o app."
        />
      );
    }
    return <DatabaseUnavailable onRetry={() => void verify(true)} retrying={retrying} />;
  }

  if (status === 'invalid_config') {
    // Wrong or revoked project key: retrying will not help until the .env is fixed.
    return (
      <DatabaseUnavailable
        title="Configuração inválida"
        description="A chave do Supabase no arquivo .env não foi aceita pelo servidor. Confira as variáveis e abra o app de novo."
        onRetry={() => void verify(true)}
        retrying={retrying}
      />
    );
  }

  return <>{children}</>;
}
