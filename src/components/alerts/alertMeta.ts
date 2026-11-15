import {
  CircleCheck,
  CircleDot,
  Eye,
  Info,
  OctagonAlert,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react-native';

import type { Colors } from '@/theme/tokens';
import type { AlertSeverity, AlertStatus } from '@/types/database';

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
