// Manual parsing: URLSearchParams is not reliable on Hermes. Never log URLs, codes or tokens.
export function parseAuthParams(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!url) return out;
  const hashIdx = url.indexOf('#');
  const beforeHash = hashIdx >= 0 ? url.slice(0, hashIdx) : url;
  const hash = hashIdx >= 0 ? url.slice(hashIdx + 1) : '';
  const qIdx = beforeHash.indexOf('?');
  const query = qIdx >= 0 ? beforeHash.slice(qIdx + 1) : '';
  for (const part of [query, hash]) {
    for (const pair of part.split('&')) {
      if (!pair) continue;
      const eq = pair.indexOf('=');
      const rawKey = eq >= 0 ? pair.slice(0, eq) : pair;
      const rawValue = eq >= 0 ? pair.slice(eq + 1) : '';
      try {
        const key = decodeURIComponent(rawKey.replace(/\+/g, ' '));
        if (!key) continue;
        out[key] = decodeURIComponent(rawValue.replace(/\+/g, ' '));
      } catch {
        // ignore malformed pair
      }
    }
  }
  return out;
}

/** Query-string params only (the PKCE `code` must never be read from the fragment). */
export function parseQueryParams(url: string): Record<string, string> {
  if (!url) return {};
  const hashIdx = url.indexOf('#');
  const beforeHash = hashIdx >= 0 ? url.slice(0, hashIdx) : url;
  return parseAuthParams(beforeHash);
}

export type RecoveryKind = 'code' | 'error' | 'none';

const CODE_MAX = 512;
const CODE_PATTERN = /^[A-Za-z0-9._~-]+$/;

export function isValidAuthCode(code: string | null | undefined): code is string {
  return typeof code === 'string' && code.length > 0 && code.length <= CODE_MAX && CODE_PATTERN.test(code);
}

/**
 * PKCE recovery link: `…/reset-password?code=<auth code>`.
 * Implicit-flow fragments (`#access_token=…`) are deliberately ignored: a session must only
 * come from exchanging a code whose verifier was stored on this device/browser.
 */
export function classifyRecoveryUrl(url: string): RecoveryKind {
  const p = parseAuthParams(url);
  if (p.error || p.error_code) return 'error';
  if (isValidAuthCode(parseQueryParams(url).code)) return 'code';
  return 'none';
}

export function getRecoveryCode(url: string): string | null {
  if (classifyRecoveryUrl(url) !== 'code') return null;
  return parseQueryParams(url).code;
}
