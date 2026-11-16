import { WEB_CSP, WEB_CSP_NOTES } from './webCsp';

describe('WEB_CSP', () => {
  it('is a single-line policy with the hardening directives', () => {
    expect(WEB_CSP).not.toMatch(/\n/);
    for (const d of ["default-src 'self'", "object-src 'none'", "base-uri 'self'", "frame-ancestors 'none'"]) {
      expect(WEB_CSP).toContain(d);
    }
  });

  it('allows the required connect hosts', () => {
    const connect = WEB_CSP.split('; ').find((d) => d.startsWith('connect-src')) ?? '';
    for (const h of [
      'https://*.supabase.co',
      'wss://*.supabase.co',
      'https://api.open-meteo.com',
      'https://brasilapi.com.br',
      'https://viacep.com.br',
      'https://nominatim.openstreetmap.org',
    ]) {
      expect(connect).toContain(h);
    }
  });

  it('allows OSM tiles in img-src and forbids eval in script-src', () => {
    const img = WEB_CSP.split('; ').find((d) => d.startsWith('img-src')) ?? '';
    const script = WEB_CSP.split('; ').find((d) => d.startsWith('script-src')) ?? '';
    expect(img).toContain('https://tile.openstreetmap.org');
    expect(script).not.toContain('eval');
  });

  it('documents header delivery', () => {
    expect(WEB_CSP_NOTES).toMatch(/header/i);
  });
});
