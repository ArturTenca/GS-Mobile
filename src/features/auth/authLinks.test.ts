import {
  classifyRecoveryUrl,
  getRecoveryCode,
  isValidAuthCode,
  parseAuthParams,
  parseQueryParams,
} from './authLinks';

describe('parseAuthParams', () => {
  it('parses hash params from a deep link', () => {
    expect(
      parseAuthParams('agroalerta://reset-password#access_token=a&refresh_token=b&type=recovery'),
    ).toEqual({ access_token: 'a', refresh_token: 'b', type: 'recovery' });
  });

  it('merges query and hash params', () => {
    expect(parseAuthParams('https://x.test/reset-password?a=1#b=2')).toEqual({ a: '1', b: '2' });
  });

  it('decodes percent escapes and plus signs', () => {
    expect(parseAuthParams('app://x#msg=Link+expirado%21')).toEqual({ msg: 'Link expirado!' });
  });

  it('ignores malformed pairs and never throws', () => {
    expect(() => parseAuthParams('app://x#a=%E0%A4%A&b=ok&&=')).not.toThrow();
    expect(parseAuthParams('app://x#a=%E0%A4%A&b=ok').b).toBe('ok');
  });

  it('handles an empty string', () => {
    expect(parseAuthParams('')).toEqual({});
  });
});

describe('parseQueryParams', () => {
  it('ignores the fragment', () => {
    expect(parseQueryParams('https://x.test/reset-password?a=1#code=evil')).toEqual({ a: '1' });
    expect(parseQueryParams('agroalerta://reset-password#code=evil')).toEqual({});
  });
});

describe('isValidAuthCode', () => {
  it('accepts uuid-like codes and rejects empty, oversized or odd values', () => {
    expect(isValidAuthCode('3f1c2b9e-7a1d-4c2e-9b1a-1234567890ab')).toBe(true);
    expect(isValidAuthCode('')).toBe(false);
    expect(isValidAuthCode(undefined)).toBe(false);
    expect(isValidAuthCode('a'.repeat(513))).toBe(false);
    expect(isValidAuthCode('abc def')).toBe(false);
    expect(isValidAuthCode('abc<script>')).toBe(false);
  });
});

describe('classifyRecoveryUrl', () => {
  it('returns code for a PKCE recovery link (native and web)', () => {
    expect(classifyRecoveryUrl('agroalerta://reset-password?code=3f1c2b9e-7a1d')).toBe('code');
    expect(classifyRecoveryUrl('https://app.test/reset-password?code=abc123')).toBe('code');
  });

  it('returns error for error or error_code params', () => {
    expect(classifyRecoveryUrl('x://r#error=access_denied&error_code=otp_expired')).toBe('error');
    expect(classifyRecoveryUrl('x://r?error_code=otp_expired')).toBe('error');
    expect(classifyRecoveryUrl('x://r?code=abc&error=access_denied')).toBe('error');
  });

  it('ignores implicit-flow fragment tokens (no session injection)', () => {
    expect(
      classifyRecoveryUrl('agroalerta://reset-password#access_token=a&refresh_token=b&type=recovery'),
    ).toBe('none');
    expect(classifyRecoveryUrl('agroalerta://reset-password#code=abc')).toBe('none');
  });

  it('returns none otherwise', () => {
    expect(classifyRecoveryUrl('x://r?code=')).toBe('none');
    expect(classifyRecoveryUrl('x://r')).toBe('none');
    expect(classifyRecoveryUrl('')).toBe('none');
  });
});

describe('getRecoveryCode', () => {
  it('returns the code only for a valid PKCE link', () => {
    expect(getRecoveryCode('agroalerta://reset-password?code=abc-123')).toBe('abc-123');
    expect(getRecoveryCode('x://r#access_token=a&refresh_token=b&type=recovery')).toBeNull();
    expect(getRecoveryCode('x://r?code=abc&error_code=otp_expired')).toBeNull();
  });
});
