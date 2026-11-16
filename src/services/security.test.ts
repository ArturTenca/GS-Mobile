import { ServiceError } from '@/services/ServiceError';
import { clearEvents, peekEvents, recordEvent } from '@/security/taint/events';
import type { SecurityEvent } from '@/security/taint/events';
import {
  explainRisk,
  fetchAuditRows,
  flushPendingSecurityEvents,
  listSecurityEvents,
  recordSecurityEvents,
} from '@/services/security';

const mockRpc = jest.fn();
const mockInvoke = jest.fn();
const tables: Record<string, { data: unknown; error: unknown }> = {};
const mockLimit = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...a: unknown[]) => mockRpc(...a),
    functions: { invoke: (...a: unknown[]) => mockInvoke(...a) },
    from: (table: string) => {
      const result = () => Promise.resolve(tables[table] ?? { data: [], error: null });
      return {
        select: () => ({
          then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => result().then(res, rej),
          order: () => ({ limit: (...a: unknown[]) => mockLimit(...a) }),
        }),
      };
    },
  },
}));

const ev = (over: Partial<SecurityEvent> = {}): SecurityEvent => ({
  ruleId: 'cpf',
  category: 'identity',
  severity: 'critical',
  sink: 'db_at_rest',
  origin: 'sensors.name',
  action: 'detected',
  fingerprint: 'abcdef0123456789',
  preview: '***.***.***-00',
  occurrences: 1,
  ...over,
});

beforeEach(() => {
  mockRpc.mockReset();
  mockInvoke.mockReset();
  mockLimit.mockReset();
  for (const k of Object.keys(tables)) delete tables[k];
  clearEvents();
});

describe('recordSecurityEvents', () => {
  it('sends snake_case rows through the rpc', async () => {
    mockRpc.mockResolvedValue({ error: null });
    await recordSecurityEvents([ev()]);
    expect(mockRpc).toHaveBeenCalledWith('record_security_events', {
      p_events: [
        {
          rule_id: 'cpf',
          category: 'identity',
          severity: 'critical',
          sink: 'db_at_rest',
          origin: 'sensors.name',
          action: 'detected',
          fingerprint: 'abcdef0123456789',
          preview: '***.***.***-00',
          occurrences: 1,
        },
      ],
    });
  });

  it('chunks calls at 50 events', async () => {
    mockRpc.mockResolvedValue({ error: null });
    await recordSecurityEvents(Array.from({ length: 120 }, (_, i) => ev({ fingerprint: `fp-${String(i).padStart(8, '0')}` })));
    expect(mockRpc).toHaveBeenCalledTimes(3);
    expect(mockRpc.mock.calls[0][1].p_events).toHaveLength(50);
    expect(mockRpc.mock.calls[2][1].p_events).toHaveLength(20);
  });

  it('throws a ServiceError with a constant pt-BR message on rpc error', async () => {
    mockRpc.mockResolvedValue({ error: { message: 'raw db text 123.456.789-09' } });
    const p = recordSecurityEvents([ev()]);
    await expect(p).rejects.toBeInstanceOf(ServiceError);
    await expect(recordSecurityEvents([ev()])).rejects.toThrow('Não foi possível registrar os eventos de segurança.');
  });
});

describe('listSecurityEvents', () => {
  it('maps rows to camelCase ordered and limited', async () => {
    mockLimit.mockResolvedValue({
      data: [
        {
          id: '1',
          rule_id: 'cpf',
          category: 'identity',
          severity: 'critical',
          sink: 'db_write',
          origin: 'form.farmName',
          action: 'blocked',
          fingerprint: 'abcdef0123456789',
          preview: '***',
          occurrences: 2,
          first_seen_at: 'a',
          last_seen_at: 'b',
        },
      ],
      error: null,
    });
    const rows = await listSecurityEvents();
    expect(mockLimit).toHaveBeenCalledWith(200);
    expect(rows[0]).toMatchObject({ ruleId: 'cpf', lastSeenAt: 'b', occurrences: 2, action: 'blocked' });
  });

  it('wraps errors', async () => {
    mockLimit.mockResolvedValue({ data: null, error: { message: 'x' } });
    await expect(listSecurityEvents()).rejects.toThrow('Não foi possível carregar os dados de segurança.');
  });
});

describe('fetchAuditRows', () => {
  it('collects owner text columns with table.column origins', async () => {
    tables.producers = { data: [{ full_name: 'Maria' }], error: null };
    tables.properties = {
      data: [{ name: 'Sítio', address: null, neighborhood: 'Centro', city: 'X', main_crop: 'Café' }],
      error: null,
    };
    tables.sensors = { data: [{ name: 'S1' }], error: null };
    const rows = await fetchAuditRows();
    expect(rows).toContainEqual({ origin: 'producers.full_name', text: 'Maria' });
    expect(rows).toContainEqual({ origin: 'properties.main_crop', text: 'Café' });
    expect(rows).toContainEqual({ origin: 'sensors.name', text: 'S1' });
    expect(rows.some((r) => r.origin === 'properties.address')).toBe(false);
  });
});

describe('explainRisk', () => {
  const input = [{ rule_id: 'cpf', severity: 'critical', sink: 'db_at_rest', action: 'detected', count: 1 }];

  it('returns the invoke data when valid', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        items: [{ rule_id: 'cpf', titulo: 'T', risco_real: 'R', o_que_fazer: 'F', nivel: 'critico', source: 'ai' }],
      },
      error: null,
    });
    const out = await explainRisk(input);
    expect(out[0]).toMatchObject({ titulo: 'T', source: 'ai' });
  });

  it('falls back to templates on invoke error', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { status: 404 } });
    const out = await explainRisk(input);
    expect(out[0].source).toBe('template');
    expect(out[0].rule_id).toBe('cpf');
  });

  it('falls back on thrown errors and malformed data', async () => {
    mockInvoke.mockRejectedValue(new Error('network'));
    expect((await explainRisk(input))[0].source).toBe('template');
    mockInvoke.mockResolvedValue({ data: { items: [{ rule_id: 5 }] }, error: null });
    expect((await explainRisk(input))[0].source).toBe('template');
  });

  it('returns [] for no items without calling the function', async () => {
    expect(await explainRisk([])).toEqual([]);
    expect(mockInvoke).not.toHaveBeenCalled();
  });
});

describe('flushPendingSecurityEvents', () => {
  it('keeps events when the rpc fails and flushes them on success', async () => {
    recordEvent({
      ruleId: 'cpf',
      category: 'identity',
      severity: 'critical',
      sink: 'db_write',
      origin: 'form.farmName',
      action: 'blocked',
      preview: '***',
    });
    mockRpc.mockResolvedValueOnce({ error: { message: 'down' } });
    await flushPendingSecurityEvents();
    expect(peekEvents()).toHaveLength(1);
    mockRpc.mockResolvedValueOnce({ error: null });
    await flushPendingSecurityEvents();
    expect(peekEvents()).toHaveLength(0);
  });
});
