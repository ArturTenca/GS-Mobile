import { supabase } from '@/lib/supabase';
import { ServiceError } from '@/services/ServiceError';
import type { SensorType } from '@/types/database';

export type FarmSensor = {
  id: string;
  name: string;
  type: SensorType;
  unit: string;
  lastSeenAt: string | null;
  isDemo: boolean;
  lat: number | null;
  lng: number | null;
  coverageRadiusM: number | null;
};

export type RegisterSensorInput = {
  propertyId: string;
  name: string;
  type: SensorType;
  lat: number;
  lng: number;
  radiusM: number;
};

const MSG_LOAD = 'Não foi possível carregar os sensores.';
const MSG_OUTSIDE = 'O ponto precisa estar dentro da fazenda. Toque em Mudar local e escolha outro lugar.';
const MSG_LIMIT = 'Esta fazenda já tem o máximo de 30 sensores. Escolha outra fazenda na etapa 1.';
const MSG_REGISTER = 'Não foi possível registrar o sensor. Verifique sua internet e toque em Registrar sensor de novo.';

type Row = {
  id: string;
  name: string;
  type: SensorType;
  unit: string;
  last_seen_at: string | null;
  is_demo: boolean;
  lat: number | string | null;
  lng: number | string | null;
  coverage_radius_m: number | string | null;
};

function num(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function listFarmSensors(propertyId: string): Promise<FarmSensor[]> {
  try {
    const { data, error } = await supabase
      .from('sensors')
      .select('id,name,type,unit,last_seen_at,is_demo,lat,lng,coverage_radius_m')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: true });
    if (error) throw new ServiceError(MSG_LOAD, error);
    return ((data as Row[] | null) ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      unit: r.unit,
      lastSeenAt: r.last_seen_at,
      isDemo: r.is_demo,
      lat: num(r.lat),
      lng: num(r.lng),
      coverageRadiusM: num(r.coverage_radius_m),
    }));
  } catch (e) {
    if (e instanceof ServiceError) throw e;
    throw new ServiceError(MSG_LOAD, e);
  }
}

/** Sensors are created only through the server-validated register_sensor RPC (D-12, D-13). */
export async function registerSensor(input: RegisterSensorInput): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('register_sensor', {
      p_property: input.propertyId,
      p_name: input.name,
      p_type: input.type,
      p_lat: input.lat,
      p_lng: input.lng,
      p_radius_m: input.radiusM,
    });
    if (error) {
      const code = (error as { code?: string }).code;
      if (code === '23514') throw new ServiceError(MSG_OUTSIDE, error);
      if (code === '54000') throw new ServiceError(MSG_LIMIT, error);
      throw new ServiceError(MSG_REGISTER, error);
    }
    if (typeof data !== 'string' || !data) throw new ServiceError(MSG_REGISTER);
    return data;
  } catch (e) {
    if (e instanceof ServiceError) throw e;
    throw new ServiceError(MSG_REGISTER, e);
  }
}
