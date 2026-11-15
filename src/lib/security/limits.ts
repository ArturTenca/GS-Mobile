/** Limites de tamanho para evitar payloads excessivos. */
export const INPUT_LIMITS = {
  EMAIL_MAX: 254,
  PASSWORD_MAX: 128,
  PASSWORD_MIN: 8,
  NAME_MAX: 120,
} as const;
