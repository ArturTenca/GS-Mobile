import { toGeoJsonPolygon, type LatLng } from '@/lib/geo';
import { supabase } from '@/lib/supabase';
import { ServiceError } from '@/services/ServiceError';
import type { GeoJsonPolygon, Property } from '@/types/database';

export type Farm = Property;

export type CreateFarmInput = {
  id: string;
  name: string;
  cep: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  mainCrop: string;
  points: LatLng[];
};

const MSG_LOAD = 'Não foi possível carregar as fazendas.';
const MSG_SAVE = 'Não foi possível salvar a fazenda. Verifique sua internet e toque em Salvar fazenda de novo.';
const MSG_BOUNDARY = 'O limite da fazenda não é válido. Toque em Editar limite e marque os pontos de novo.';

type Row = Record<string, unknown>;

function num(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toFarm(r: Row): Farm {
  return {
    ...(r as unknown as Farm),
    boundary: (r.boundary as GeoJsonPolygon | null | undefined) ?? null,
    center_lat: num(r.center_lat),
    center_lng: num(r.center_lng),
    area_ha: num(r.area_ha),
  };
}

export async function listFarms(): Promise<Farm[]> {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new ServiceError(MSG_LOAD, error);
    return ((data as Row[] | null) ?? []).map(toFarm);
  } catch (e) {
    if (e instanceof ServiceError) throw e;
    throw new ServiceError(MSG_LOAD, e);
  }
}

/**
 * Inserts a user-owned farm. The server trigger computes the area and center
 * from the boundary, so those columns are intentionally never sent (D-07).
 * .select('*').single() surfaces RLS silent-zero results as errors (D-08).
 */
export async function createFarm(input: CreateFarmInput): Promise<Farm> {
  try {
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) throw new ServiceError(MSG_SAVE, authError);

    const { data, error } = await supabase
      .from('properties')
      .insert({
        id: input.id,
        owner_id: auth.user.id,
        name: input.name,
        cep: input.cep,
        address: input.address,
        neighborhood: input.neighborhood,
        city: input.city,
        state: input.state,
        main_crop: input.mainCrop,
        boundary: toGeoJsonPolygon(input.points),
        is_demo: false,
      })
      .select('*')
      .single();

    if (error) {
      const code = (error as { code?: string }).code;
      if (code === '23505') {
        // Idempotent retry: the same client id was already saved.
        const existing = await supabase.from('properties').select('*').eq('id', input.id).single();
        if (existing.error || !existing.data) throw new ServiceError(MSG_SAVE, existing.error);
        return toFarm(existing.data as Row);
      }
      if (code === '23514') throw new ServiceError(MSG_BOUNDARY, error);
      throw new ServiceError(MSG_SAVE, error);
    }
    if (!data) throw new ServiceError(MSG_SAVE);
    return toFarm(data as Row);
  } catch (e) {
    if (e instanceof ServiceError) throw e;
    throw new ServiceError(MSG_SAVE, e);
  }
}
