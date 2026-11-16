import { AUTH_MESSAGES, isNetworkError, mapAuthError } from './authErrors';

describe('mapAuthError', () => {
  it.each([
    ['invalid_credentials', 'E-mail ou senha inválidos.'],
    [
      'user_already_exists',
      'Não foi possível criar a conta com esses dados. Se já tiver cadastro, entre ou recupere a senha.',
    ],
    ['weak_password', 'Senha fraca. Use letras e números.'],
    ['over_request_rate_limit', 'Muitas tentativas. Aguarde um pouco e tente de novo.'],
    ['over_email_send_rate_limit', 'Muitos pedidos de e-mail. Aguarde alguns minutos.'],
    ['email_not_confirmed', 'Confirme seu e-mail antes de entrar.'],
    ['same_password', 'Use uma senha diferente da atual.'],
    ['otp_expired', 'Link expirado. Peça um novo.'],
    ['session_expired', 'Link expirado. Peça um novo.'],
    ['flow_state_expired', 'Link expirado. Peça um novo.'],
    ['signup_disabled', 'Não foi possível concluir agora. Tente mais tarde.'],
    ['user_banned', 'Não foi possível concluir agora. Tente mais tarde.'],
    ['validation_failed', 'Informe um e-mail válido.'],
    ['email_address_invalid', 'Informe um e-mail válido.'],
  ])('maps %s', (code, msg) => {
    expect(mapAuthError({ code, message: 'raw server text' })).toBe(msg);
  });

  it('user_already_exists does not confirm that the account exists', () => {
    expect(mapAuthError({ code: 'user_already_exists' })).not.toContain('já tem conta');
  });

  it('unknown code is neutral, never offline, and does not leak raw text', () => {
    const msg = mapAuthError({ code: 'something_new', message: 'secret db detail', status: 400 });
    expect(msg).toBe('Algo deu errado. Tente de novo.');
    expect(msg).not.toBe(AUTH_MESSAGES.offline);
    expect(msg).not.toContain('secret');
    expect(mapAuthError(null)).toBe(AUTH_MESSAGES.generic);
  });

  it('5xx maps to unavailable', () => {
    expect(mapAuthError({ status: 503 })).toBe(AUTH_MESSAGES.unavailable);
  });

  it('AuthRetryableFetchError and status 0 are offline', () => {
    expect(mapAuthError({ name: 'AuthRetryableFetchError', status: 0 })).toBe(AUTH_MESSAGES.offline);
    expect(mapAuthError({ message: 'TypeError: Failed to fetch', status: 0 })).toBe(AUTH_MESSAGES.offline);
    expect(isNetworkError({ name: 'AuthRetryableFetchError' })).toBe(true);
    expect(isNetworkError({ status: 400 })).toBe(false);
    expect(isNetworkError(null)).toBe(false);
  });
});
