import type { PeriodKey } from '@/features/charts/periods';
import type { SeriesPoint } from '@/features/charts/series';

// Static PT-BR names: Hermes does not reliably ship pt-BR locale data.
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DAY = 86_400_000;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function localDayStart(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * X-axis labels, one per point ('' when unlabeled), in device-local time.
 * 24h: "08h" every 6 hours; 7d: weekday at each day start; 30d: "dd/MM" every 7th day.
 */
export function buildXLabels(points: SeriesPoint[], period: PeriodKey): string[] {
  const labels: string[] = [];
  if (points.length === 0) return labels;
  const firstDay = localDayStart(new Date(points[0].t));
  let prevKey: number | null = null;

  for (const p of points) {
    const d = new Date(p.t);
    const dayStart = localDayStart(d);
    if (period === '24h') {
      const key = dayStart * 100 + d.getHours();
      const isFirst = key !== prevKey;
      prevKey = key;
      labels.push(isFirst && d.getHours() % 6 === 0 ? `${pad2(d.getHours())}h` : '');
      continue;
    }
    const isFirst = dayStart !== prevKey;
    prevKey = dayStart;
    if (!isFirst) {
      labels.push('');
      continue;
    }
    if (period === '7d') {
      labels.push(WEEKDAYS[d.getDay()]);
      continue;
    }
    // Math.round absorbs 23/25 h DST days.
    const dayIndex = Math.round((dayStart - firstDay) / DAY);
    labels.push(dayIndex % 7 === 0 ? `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}` : '');
  }
  return labels;
}
