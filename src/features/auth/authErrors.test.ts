import { AUTH_MESSAGES, mapAuthError } from './authErrors';

describe('mapAuthError', () => {
  it.each([
    ['invalid_credentials', 'E-mail ou senha inválidos.'],
    ['user_already_exists', 'Este e-mail já tem conta. Entre ou recupere a senha.'],
    ['weak_password', 'Senha fraca. Use letras e números.'],
    ['over_request_rate_limit', 'Muitas tentativas. Aguarde um pouco e tente de novo.'],
    ['over_email_send_rate_limit', 'Muitos pedidos de e-mail. Aguarde alguns minutos.'],
  ])('maps %s', (code, msg) => {
    expect(mapAuthError({ code, message: 'raw server text' })).toBe(msg);
  });
  it('falls back to offline message without leaking raw text', () => {
    expect(mapAuthError({ message: 'TypeError: Failed to fetch', status: 0 })).toBe(AUTH_MESSAGES.offline);
    expect(mapAuthError(null)).toBe(AUTH_MESSAGES.offline);
    expect(mapAuthError({ code: 'weird', message: 'secret db detail' })).not.toContain('secret');
  });
});
