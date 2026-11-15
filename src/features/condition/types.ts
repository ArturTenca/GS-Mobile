import type { Status } from '@/components/ui/Badge';
import type { AlertCategory, AlertStatus, SensorType } from '@/types/database';

export type { Status };

export interface DeriveSensor {
  id: string;
  name: string;
  type: SensorType;
  areaName: string | null;
  lastSeenAt: string | null;
  isDemo?: boolean;
  latest: { value: number; recordedAt: string } | null;
}

export type ThresholdMap = Partial<
  Record<SensorType, { min: number | null; max: number | null }>
>;

export interface ConditionAlert {
  id: string;
  sensorId: string | null;
  category: AlertCategory;
  severity: 'critical' | 'warning' | 'info';
  status: AlertStatus;
  title: string;
  recommendation: string | null;
  triggeredAt: string;
}

export interface ConditionInput {
  now: number;
  sensors: DeriveSensor[];
  thresholds: ThresholdMap;
  alerts: ConditionAlert[];
}

export interface Reason {
  kind: 'alert' | 'reading' | 'offline';
  rank: number;
  line: string;
  action: string;
  alertId?: string;
  sensorId?: string;
  at: number;
}

export interface ConditionResult {
  status: Status;
  primary: Reason | null;
  extraCount: number;
  reasons: Reason[];
  onlineCount: number;
  offlineCount: number;
  pendingCount: number;
  sensorCount: number;
  lastReadingAt: string | null;
  normalCopy?: { line: string; action: string };
}
