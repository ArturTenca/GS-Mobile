// Hand-written row types mirroring supabase/migrations/001_schema.sql.

export type SensorType = 'temperature' | 'air_humidity' | 'soil_moisture';
export type AlertCategory =
  | 'temperature_high'
  | 'soil_moisture_low'
  | 'air_humidity_high'
  | 'heavy_rain'
  | 'unfavorable_weather'
  | 'sensor_offline';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertStatus = 'novo' | 'visualizado' | 'resolvido';

export interface Producer {
  id: string;
  full_name: string;
  onboarding_completed_at: string | null;
  created_at: string;
}

export interface GeoJsonPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface Property {
  id: string;
  owner_id: string;
  name: string;
  city: string | null;
  state: string | null;
  is_demo: boolean;
  created_at: string;
  cep?: string | null;
  address?: string | null;
  neighborhood?: string | null;
  main_crop?: string | null;
  boundary?: GeoJsonPolygon | null;
  center_lat?: number | null;
  center_lng?: number | null;
  area_ha?: number | null;
  /** Set by generate_demo_dataset (migration 007); undefined before 007 counts as null. */
  demo_data_generated_at?: string | null;
}

export interface Sensor {
  id: string;
  property_id: string;
  area_id: string | null;
  name: string;
  type: SensorType;
  unit: string;
  last_seen_at: string | null;
  is_demo: boolean;
  created_at: string;
  lat?: number | null;
  lng?: number | null;
  coverage_radius_m?: number | null;
}

export interface Alert {
  id: string;
  property_id: string;
  sensor_id: string | null;
  reading_id: number | null;
  category: AlertCategory;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  description: string;
  recommendation: string;
  triggered_at: string;
  is_demo: boolean;
}

export interface Threshold {
  sensor_type: SensorType;
  min_value: number | null;
  max_value: number | null;
}

export interface ClimateSnapshot {
  id: string;
  property_id: string;
  condition: string;
  description: string;
  temperature_c: number | null;
  humidity_pct: number | null;
  rain_probability_pct: number | null;
  observed_at: string;
  is_demo: boolean;
}

export interface PlantingArea {
  id: string;
  property_id: string;
  name: string;
}

/** Row of the latest-reading view (migration 005). */
export interface LatestReadingRow {
  sensor_id: string;
  recorded_at: string;
  value: number | string;
  is_demo: boolean;
}

export interface HomeSummary {
  propertyId: string;
  propertyName: string;
  isDemo: boolean;
  sensorCount: number;
  pendingAlertCount: number;
}

export interface ProducerProfile {
  id: string;
  fullName: string;
  onboardingCompletedAt: string | null;
}
