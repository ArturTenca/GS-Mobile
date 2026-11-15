export const AUTH_MESSAGES = {
  invalidCredentials: 'E-mail ou senha inválidos.',
  userExists: 'Este e-mail já tem conta. Entre ou recupere a senha.',
  weakPassword: 'Senha fraca. Use letras e números.',
  rateLimit: 'Muitas tentativas. Aguarde um pouco e tente de novo.',
  emailRateLimit: 'Muitos pedidos de e-mail. Aguarde alguns minutos.',
  offline: 'Sem conexão. Verifique a internet e tente de novo.',
  confirmEmailSent: 'Enviamos um e-mail para confirmar sua conta. Abra o link para entrar.',
} as const;

type AuthErrorLike = { code?: string; message?: string; status?: number };

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
    default:
      return AUTH_MESSAGES.offline;
  }
}
