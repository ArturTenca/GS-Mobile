import { getNotificationPrefs, saveNotificationPrefs } from '@/services/notifications';
import { ServiceError } from '@/services/ServiceError';

jest.mock('lucide-react-native', () => ({}));

const mockMaybeSingle = jest.fn();
const mockSingle = jest.fn();
const mockUpdate = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } }, error: null }) },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: () => mockMaybeSingle() }) }),
      update: (p: unknown) => {
        mockUpdate(p);
        return { eq: () => ({ select: () => ({ single: () => mockSingle() }) }) };
      },
    }),
  },
}));

const ALL = [
  'temperature_high',
  'soil_moisture_low',
  'air_humidity_high',
  'heavy_rain',
  'unfavorable_weather',
  'sensor_offline',
];

beforeEach(() => {
  mockMaybeSingle.mockReset();
  mockSingle.mockReset();
  mockUpdate.mockReset();
});

describe('getNotificationPrefs', () => {
  it('maps the row', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { notify_enabled: false, notify_categories: ['heavy_rain'] },
      error: null,
    });
    expect(await getNotificationPrefs()).toEqual({ enabled: false, categories: ['heavy_rain'] });
  });

  it('falls back to all categories when null', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { notify_enabled: true, notify_categories: null },
      error: null,
    });
    expect((await getNotificationPrefs()).categories).toEqual(ALL);
  });
});

describe('saveNotificationPrefs', () => {
  it('sends only the given fields', async () => {
    mockSingle.mockResolvedValue({
      data: { notify_enabled: false, notify_categories: ALL },
      error: null,
    });
    const saved = await saveNotificationPrefs({ enabled: false });
    expect(mockUpdate).toHaveBeenCalledWith({ notify_enabled: false });
    expect(saved).toEqual({ enabled: false, categories: ALL });
  });

  it('throws the pt-BR ServiceError on zero rows', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'no rows' } });
    await expect(saveNotificationPrefs({ enabled: true })).rejects.toBeInstanceOf(ServiceError);
    await expect(saveNotificationPrefs({ enabled: true })).rejects.toThrow(
      'Não foi possível salvar a preferência. Verifique sua internet e tente de novo.',
    );
  });
});
