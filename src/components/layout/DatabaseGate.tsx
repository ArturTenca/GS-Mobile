import { useCallback, useEffect, useState, type ReactNode } from 'react';

import { DatabaseUnavailable } from '@/components/ui/DatabaseUnavailable';
import { checkDatabaseAvailability, isSupabaseConfigured } from '@/lib/supabase';

export function DatabaseGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'checking' | 'ok' | 'error' | 'invalid_config'>(
    isSupabaseConfigured ? 'checking' : 'error',
  );
  const [retrying, setRetrying] = useState(false);

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

  // Non-blocking: the app renders right away while the check runs in the background.
  // Only a failed check replaces the UI (each screen already shows its own loading state).

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
