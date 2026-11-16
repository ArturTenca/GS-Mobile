import { sanitizeCause } from '@/security/taint/sinks';

export class ServiceError extends Error {
  // Somente {name, code}: a causa original pode carregar dados pessoais (D-04).
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'ServiceError';
    this.cause = sanitizeCause(cause);
  }
}
