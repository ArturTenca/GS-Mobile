import { ServiceError } from '@/services/ServiceError';
import { saveThresholds } from '@/services/thresholds';

const mockUpsert = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({ upsert: (...a: unknown[]) => mockUpsert(...a) }),
  },
}));

const PID = '11111111-1111-4111-8111-111111111111';

beforeEach(() => mockUpsert.mockReset());

describe('saveThresholds', () => {
  it('upserts three rows with onConflict', async () => {
    mockUpsert.mockResolvedValue({ error: null });
    await saveThresholds(PID, [
      { type: 'temperature', min: null, max: 35 },
      { type: 'air_humidity', min: null, max: 90 },
      { type: 'soil_moisture', min: 30, max: null },
    ]);
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    const [payload, opts] = mockUpsert.mock.calls[0];
    expect(payload).toEqual([
      { property_id: PID, sensor_type: 'temperature', min_value: null, max_value: 35 },
      { property_id: PID, sensor_type: 'air_humidity', min_value: null, max_value: 90 },
      { property_id: PID, sensor_type: 'soil_moisture', min_value: 30, max_value: null },
    ]);
    expect(opts).toEqual({ onConflict: 'property_id,sensor_type' });
  });

  it('wraps supabase errors in a ServiceError with the pt-BR message', async () => {
    mockUpsert.mockResolvedValue({ error: { message: 'boom' } });
    await expect(saveThresholds(PID, [])).rejects.toBeInstanceOf(ServiceError);
    await expect(saveThresholds(PID, [])).rejects.toThrow(
      'Não foi possível salvar os limites. Verifique sua internet e tente de novo.',
    );
  });

  it('rejects a non-uuid property id without calling the db', async () => {
    await expect(saveThresholds('nope', [])).rejects.toBeInstanceOf(ServiceError);
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});
