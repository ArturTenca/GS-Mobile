import { polygonAreaHa, ringIsSimple, type LatLng } from '@/lib/geo';
import type { LocationPrecision } from '@/services/geocoding';

export const MAX_VERTICES = 200;

const BRAZIL_CENTER: LatLng = { lat: -14.2, lng: -51.9 };

function hectares(ha: number): string {
  return ha.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pointsLabel(n: number): string {
  if (n === 0) return 'Nenhum ponto marcado';
  return n === 1 ? '1 ponto marcado' : `${n} pontos marcados`;
}

export function farmMapStatus(n: number, areaHa: number): string {
  if (n < 3) return pointsLabel(n);
  return `${n} pontos · ${hectares(areaHa)} ha`;
}

export function farmMapSpoken(n: number, areaHa: number): string {
  if (n < 3) return `${pointsLabel(n)}.`;
  return `${pointsLabel(n)}. Área de ${hectares(areaHa)} hectares.`;
}

export type InitialMapView = { center: LatLng; zoom: number; notice: string | null };

export function initialMapView(
  location: { lat: number | null; lng: number | null; precision: LocationPrecision } | null,
  cityName: string,
): InitialMapView {
  const none: InitialMapView = {
    center: BRAZIL_CENTER,
    zoom: 4,
    notice: 'Não encontramos o local do CEP. Aproxime o mapa até a sua fazenda.',
  };
  if (!location || location.lat === null || location.lng === null || location.precision === 'none') return none;
  const center = { lat: location.lat, lng: location.lng };
  switch (location.precision) {
    case 'street':
      return { center, zoom: 16, notice: null };
    case 'approx':
    case 'postcode':
      return {
        center,
        zoom: 15,
        notice: 'Localização aproximada. Arraste o mapa até a sua fazenda antes de marcar os pontos.',
      };
    default:
      return {
        center,
        zoom: 13,
        notice: `Mostrando o centro de ${cityName}. Arraste e aproxime o mapa até a sua fazenda.`,
      };
  }
}

export function canContinue(points: LatLng[]): boolean {
  if (points.length < 3 || points.length > MAX_VERTICES) return false;
  if (!ringIsSimple(points)) return false;
  return polygonAreaHa(points) > 0;
}
