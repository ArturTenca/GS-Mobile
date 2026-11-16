export const AUTH_MESSAGES = {
  invalidCredentials: 'E-mail ou senha inválidos.',
  userExists:
    'Não foi possível criar a conta com esses dados. Se já tiver cadastro, entre ou recupere a senha.',
  weakPassword: 'Senha fraca. Use letras e números.',
  rateLimit: 'Muitas tentativas. Aguarde um pouco e tente de novo.',
  emailRateLimit: 'Muitos pedidos de e-mail. Aguarde alguns minutos.',
  offline: 'Sem conexão. Verifique a internet e tente de novo.',
  confirmEmailSent: 'Enviamos um e-mail para confirmar sua conta. Abra o link para entrar.',
  confirmEmail: 'Confirme seu e-mail antes de entrar.',
  samePassword: 'Use uma senha diferente da atual.',
  linkExpired: 'Link expirado. Peça um novo.',
  unavailable: 'Não foi possível concluir agora. Tente mais tarde.',
  generic: 'Algo deu errado. Tente de novo.',
  invalidEmail: 'Informe um e-mail válido.',
} as const;

type AuthErrorLike = { code?: string; message?: string; status?: number; name?: string };

/** Erro de transporte: a requisição não chegou ao servidor. */
export function isNetworkError(error: AuthErrorLike | null | undefined): boolean {
  if (!error) return false;
  return error.name === 'AuthRetryableFetchError' || error.status === 0;
}

/** Mapeia erros do Supabase Auth para texto fixo em PT-BR; nunca devolve texto bruto do servidor. */
export function mapAuthError(error: AuthErrorLike | null | undefined): string {
  switch (error?.code) {
    case 'invalid_credentials':
      return AUTH_MESSAGES.invalidCredentials;
    case 'user_already_exists':
      return AUTH_MESSAGES.userExists;
    case 'weak_password':
      return AUTH_MESSAGES.weakPassword;
    case 'over_request_rate_limit':
      return AUTH_MESSAGES.rateLimit;
    case 'over_email_send_rate_limit':
      return AUTH_MESSAGES.emailRateLimit;
    case 'email_not_confirmed':
      return AUTH_MESSAGES.confirmEmail;
    case 'same_password':
      return AUTH_MESSAGES.samePassword;
    case 'otp_expired':
    case 'session_expired':
    case 'flow_state_expired':
      return AUTH_MESSAGES.linkExpired;
    case 'signup_disabled':
    case 'user_banned':
      return AUTH_MESSAGES.unavailable;
    case 'validation_failed':
    case 'email_address_invalid':
      return AUTH_MESSAGES.invalidEmail;
    default:
      if (isNetworkError(error)) return AUTH_MESSAGES.offline;
      if (typeof error?.status === 'number' && error.status >= 500) return AUTH_MESSAGES.unavailable;
      return AUTH_MESSAGES.generic;
  }
}
