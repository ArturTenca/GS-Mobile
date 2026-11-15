import { isSensorOffline, rangeViolation } from '@/lib/sensorStatus';

import {
  alertAction,
  alertLine,
  isMeasurementCategory,
  lastActivityMs,
  NO_SENSORS_COPY,
  NORMAL_COPY,
  OFFLINE_ACTION,
  offlineLine,
  RANK,
  readingAction,
  readingLine,
  violationMagnitude,
} from './reasons';
import type { ConditionAlert, ConditionInput, ConditionResult, Reason } from './types';

const isPending = (a: ConditionAlert) => a.status === 'novo' || a.status === 'visualizado';

/**
 * Pure condition derivation (D-01..D-07). `now` is injected and every timestamp is
 * expected to be already demo-anchored by the service layer.
 */
export function deriveCondition(input: ConditionInput): ConditionResult {
  const { now, sensors, thresholds } = input;
  const pending = input.alerts.filter(isPending);
  const sensorById = new Map(sensors.map((s) => [s.id, s]));

  const withActivity = sensors.map((s) => {
    const activity = lastActivityMs(s);
    return { sensor: s, activity, offline: isSensorOffline(activity, now) };
  });
  const onlineCount = withActivity.filter((x) => !x.offline).length;
  const offlineCount = withActivity.length - onlineCount;

  // Alert reasons: critical > warning > info, newest first within equal severity.
  const alertReasons: Reason[] = [...pending]
    .sort((a, b) => {
      const sev = RANK[a.severity] - RANK[b.severity];
      return sev !== 0 ? sev : Date.parse(b.triggeredAt) - Date.parse(a.triggeredAt);
    })
    .map((a) => {
      const area = a.sensorId ? (sensorById.get(a.sensorId)?.areaName ?? null) : null;
      return {
        kind: 'alert' as const,
        rank: RANK[a.severity],
        line: alertLine(a, area),
        action: alertAction(a),
        alertId: a.id,
        sensorId: a.sensorId ?? undefined,
        at: Date.parse(a.triggeredAt),
      };
    });

  const measurementAlertSensors = new Set(
    pending.filter((a) => a.sensorId && isMeasurementCategory(a.category)).map((a) => a.sensorId),
  );
  const offlineAlertSensors = new Set(
    pending.filter((a) => a.sensorId && a.category === 'sensor_offline').map((a) => a.sensorId),
  );

  // Out-of-range readings (online sensors only), worst first.
  const readingEntries: { reason: Reason; magnitude: number }[] = [];
  for (const { sensor, offline } of withActivity) {
    if (offline || !sensor.latest) continue;
    const range = thresholds[sensor.type];
    const dir = rangeViolation(sensor.latest.value, range);
    if (!dir || !range) continue;
    if (measurementAlertSensors.has(sensor.id)) continue;
    readingEntries.push({
      magnitude: violationMagnitude(sensor.latest.value, dir, range),
      reason: {
        kind: 'reading',
        rank: RANK.reading,
        line: readingLine(sensor.type, dir, sensor.areaName || sensor.name),
        action: readingAction(sensor.type, dir),
        sensorId: sensor.id,
        at: Date.parse(sensor.latest.recordedAt),
      },
    });
  }
  readingEntries.sort((a, b) => b.magnitude - a.magnitude);

  // Offline sensors, longest offline first.
  const offlineReasons: Reason[] = withActivity
    .filter((x) => x.offline && !offlineAlertSensors.has(x.sensor.id))
    .sort((a, b) => (a.activity ?? -Infinity) - (b.activity ?? -Infinity))
    .map((x) => ({
      kind: 'offline' as const,
      rank: RANK.offline,
      line: offlineLine(x.sensor.name),
      action: OFFLINE_ACTION,
      sensorId: x.sensor.id,
      at: x.activity ?? 0,
    }));

  const reasons = [...alertReasons, ...readingEntries.map((e) => e.reason), ...offlineReasons];

  const hasCritical = pending.some((a) => a.severity === 'critical');
  const status = hasCritical ? 'critico' : reasons.length > 0 ? 'atencao' : 'normal';

  const activities = withActivity.map((x) => x.activity).filter((n): n is number => n != null);
  const lastReadingAt = activities.length
    ? new Date(Math.max(...activities)).toISOString()
    : null;

  const result: ConditionResult = {
    status,
    primary: reasons[0] ?? null,
    extraCount: Math.max(0, reasons.length - 1),
    reasons,
    onlineCount,
    offlineCount,
    pendingCount: pending.length,
    sensorCount: sensors.length,
    lastReadingAt,
  };
  if (status === 'normal') {
    result.normalCopy = sensors.length === 0 ? { ...NO_SENSORS_COPY } : { ...NORMAL_COPY };
  }
  return result;
}
