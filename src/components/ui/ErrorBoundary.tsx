import { Component, type ReactNode } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { Platform } from 'react-native';

import { DatabaseUnavailable } from '@/components/ui/DatabaseUnavailable';
import { safeLog } from '@/security/taint/sinks';

type ErrorBoundaryProps = { children: ReactNode };
type ErrorBoundaryState = { hasError: boolean };

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch() {
    safeLog('error', 'Erro inesperado na aplicação');
    // Safety net: never leave the error screen hidden behind the native splash.
    try {
      SplashScreen.hide();
    } catch {
      // splash already hidden or unavailable (web)
    }
  }

  private reload = () => {
    this.setState({ hasError: false });
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <DatabaseUnavailable
          title="Algo deu errado"
          description="Feche e abra o app de novo. Se continuar, tente mais tarde."
          retryLabel="Recarregar app"
          onRetry={this.reload}
        />
      );
    }
    return this.props.children;
  }
}
