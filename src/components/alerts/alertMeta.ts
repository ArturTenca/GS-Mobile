import CircleCheck from 'lucide-react-native/icons/circle-check';
import CircleDot from 'lucide-react-native/icons/circle-dot';
import CloudLightning from 'lucide-react-native/icons/cloud-lightning';
import CloudRain from 'lucide-react-native/icons/cloud-rain';
import Droplets from 'lucide-react-native/icons/droplets';
import Eye from 'lucide-react-native/icons/eye';
import Info from 'lucide-react-native/icons/info';
import OctagonAlert from 'lucide-react-native/icons/octagon-alert';
import Sprout from 'lucide-react-native/icons/sprout';
import Thermometer from 'lucide-react-native/icons/thermometer';
import TriangleAlert from 'lucide-react-native/icons/triangle-alert';
import WifiOff from 'lucide-react-native/icons/wifi-off';
import type { LucideIcon } from 'lucide-react-native';

import type { Colors } from '@/theme/tokens';
import type { AlertCategory, AlertSeverity, AlertStatus } from '@/types/database';

export type MetaBadgeVariant = 'default' | 'success' | 'warning' | 'error';

export interface SeverityMeta {
  label: string;
  icon: LucideIcon;
  badge: MetaBadgeVariant;
  /** Theme color keys for the lead circle (resolved by the consumer via useTheme). */
  circleBg: keyof Colors;
  circleFg: keyof Colors;
}

export interface StatusMeta {
  label: string;
  icon: LucideIcon;
  badge: MetaBadgeVariant;
}

export const SEVERITY_META: Record<AlertSeverity, SeverityMeta> = {
  critical: {
    label: 'Crítico',
    icon: OctagonAlert,
    badge: 'error',
    circleBg: 'errorSoft',
    circleFg: 'error',
  },
  warning: {
    label: 'Atenção',
    icon: TriangleAlert,
    badge: 'warning',
    circleBg: 'warningSoft',
    circleFg: 'warningText',
  },
  info: {
    label: 'Informativo',
    icon: Info,
    badge: 'default',
    circleBg: 'background',
    circleFg: 'textMuted',
  },
};

export const STATUS_META: Record<AlertStatus, StatusMeta> = {
  novo: { label: 'Novo', icon: CircleDot, badge: 'default' },
  visualizado: { label: 'Visualizado', icon: Eye, badge: 'default' },
  resolvido: { label: 'Resolvido', icon: CircleCheck, badge: 'success' },
};

export function getSeverityLabel(severity: AlertSeverity): string {
  return SEVERITY_META[severity].label;
}

export function getStatusLabel(status: AlertStatus): string {
  return STATUS_META[status].label;
}

export interface CategoryMeta {
  label: string;
  icon: LucideIcon;
  notificationDescription: string;
}

export const CATEGORY_META: Record<AlertCategory, CategoryMeta> = {
  temperature_high: {
    label: 'Temperatura alta',
    icon: Thermometer,
    notificationDescription: 'Quando a temperatura passa do limite máximo.',
  },
  soil_moisture_low: {
    label: 'Solo seco',
    icon: Sprout,
    notificationDescription: 'Quando a umidade do solo fica abaixo do limite mínimo.',
  },
  air_humidity_high: {
    label: 'Umidade do ar alta',
    icon: Droplets,
    notificationDescription: 'Quando a umidade do ar passa do limite máximo.',
  },
  heavy_rain: {
    label: 'Chuva forte',
    icon: CloudRain,
    notificationDescription: 'Quando a previsão indica chance alta de chuva forte.',
  },
  unfavorable_weather: {
    label: 'Clima desfavorável',
    icon: CloudLightning,
    notificationDescription: 'Quando o tempo pode prejudicar a lavoura.',
  },
  sensor_offline: {
    label: 'Sensor sem sinal',
    icon: WifiOff,
    notificationDescription: 'Quando um sensor fica mais de 2 horas sem enviar dados.',
  },
};

export const CATEGORY_ORDER: AlertCategory[] = [
  'temperature_high',
  'soil_moisture_low',
  'air_humidity_high',
  'heavy_rain',
  'unfavorable_weather',
  'sensor_offline',
];

export function getCategoryLabel(category: AlertCategory): string {
  return CATEGORY_META[category].label;
}
