import { getForecast } from '@/services/weather';

const ERR = 'Não foi possível carregar a previsão.';

function payload() {
  return {
    timezone: 'America/Sao_Paulo',
    current: {
      time: '2026-11-12T14:30',
      temperature_2m: 27.4,
      relative_humidity_2m: 62,
      weather_code: 2,
      wind_speed_10m: 12.3,
      precipitation: 0,
    },
    daily: {
      time: ['2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18'],
      weather_code: [2, 61, 3, 0, 95, 80, 1],
      temperature_2m_max: [30, 28, 27, 31, 29, 26, 30],
      temperature_2m_min: [18, 17, 16, 19, 18, 17, 18],
      precipitation_probability_max: [10, 80, 20, 0, 90, null, 5],
    },
  };
}

const mockFetch = jest.fn();

beforeEach(() => {
  mockFetch.mockReset();
  (globalThis as { fetch: unknown }).fetch = mockFetch;
});

function ok(body: unknown) {
  mockFetch.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(body) });
}

describe('getForecast', () => {
  it('builds the Open-Meteo URL with rounded coordinates and D-05 params', async () => {
    ok(payload());
    await getForecast(-22.905678, -47.061234);
    const url = new URL(mockFetch.mock.calls[0][0] as string);
    expect(`${url.origin}${url.pathname}`).toBe('https://api.open-meteo.com/v1/forecast');
    expect(url.searchParams.get('latitude')).toBe('-22.91');
    expect(url.searchParams.get('longitude')).toBe('-47.06');
    expect(url.searchParams.get('current')).toBe(
      'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation',
    );
    expect(url.searchParams.get('daily')).toBe(
      'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    );
    expect(url.searchParams.get('timezone')).toBe('auto');
    expect(url.searchParams.get('forecast_days')).toBe('7');
    expect(url.searchParams.has('apikey')).toBe(false);
  });

  it('maps a valid payload', async () => {
    ok(payload());
    const r = await getForecast(-22.9, -47.06);
    expect(r.timezone).toBe('America/Sao_Paulo');
    expect(r.current).toEqual({
      temperatureC: 27.4,
      humidityPct: 62,
      windKmh: 12.3,
      precipitationMm: 0,
      weatherCode: 2,
      time: '2026-11-12T14:30',
    });
    expect(r.days).toHaveLength(7);
    expect(r.days[0]).toEqual({ date: '2026-11-12', weatherCode: 2, maxC: 30, minC: 18, rainProbabilityPct: 10 });
    expect(r.days[5].rainProbabilityPct).toBeNull();
  });

  it('throws on HTTP non-ok', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: true, reason: 'bad' }),
    });
    await expect(getForecast(1, 2)).rejects.toThrow(ERR);
  });

  it('throws on network failure', async () => {
    mockFetch.mockRejectedValue(new TypeError('Network request failed'));
    await expect(getForecast(1, 2)).rejects.toThrow(ERR);
  });

  it('throws on abort', async () => {
    const e = new Error('aborted');
    e.name = 'AbortError';
    mockFetch.mockRejectedValue(e);
    await expect(getForecast(1, 2)).rejects.toThrow(ERR);
  });

  it('passes an abort signal', async () => {
    ok(payload());
    await getForecast(1, 2);
    expect(mockFetch.mock.calls[0][1]).toEqual(expect.objectContaining({ signal: expect.anything() }));
  });

  it('throws when blocks are missing', async () => {
    const p = payload() as Record<string, unknown>;
    delete p.current;
    ok(p);
    await expect(getForecast(1, 2)).rejects.toThrow(ERR);
    const q = payload() as Record<string, unknown>;
    delete q.daily;
    ok(q);
    await expect(getForecast(1, 2)).rejects.toThrow(ERR);
  });

  it('throws when daily arrays have different lengths', async () => {
    const p = payload();
    p.daily.temperature_2m_min = [18, 17];
    ok(p);
    await expect(getForecast(1, 2)).rejects.toThrow(ERR);
  });

  it('throws on non-finite numbers', async () => {
    const p = payload() as unknown as { current: Record<string, unknown> };
    p.current.temperature_2m = 'hot';
    ok(p);
    await expect(getForecast(1, 2)).rejects.toThrow(ERR);
    const q = payload() as unknown as { daily: { temperature_2m_max: unknown[] } };
    q.daily.temperature_2m_max[2] = null;
    ok(q);
    await expect(getForecast(1, 2)).rejects.toThrow(ERR);
  });

  it('throws on non-array daily fields', async () => {
    const p = payload() as unknown as { daily: Record<string, unknown> };
    p.daily.weather_code = 'x';
    ok(p);
    await expect(getForecast(1, 2)).rejects.toThrow(ERR);
  });

  it('throws on invalid JSON', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: () => Promise.reject(new SyntaxError('x')) });
    await expect(getForecast(1, 2)).rejects.toThrow(ERR);
  });

  it('throws on non-finite coordinates without calling fetch', async () => {
    await expect(getForecast(NaN, 2)).rejects.toThrow(ERR);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
