const SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;
const LONG = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
] as const;

/**
 * Weekday index (0 = Sunday) of a plain `YYYY-MM-DD` date. The date is built from
 * its UTC parts, so the device timezone never shifts the day (D-06).
 */
function weekdayIndex(isoDate: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!m) return null;
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (!Number.isFinite(t)) return null;
  return new Date(t).getUTCDay();
}

/** "Hoje" for the first forecast entry, else "Seg", "Ter"... */
export function weekdayLabel(isoDate: string, index: number): string {
  if (index === 0) return 'Hoje';
  const i = weekdayIndex(isoDate);
  return i === null ? '' : SHORT[i];
}

/** "segunda-feira", "sábado"... ('' for malformed dates). */
export function weekdayLong(isoDate: string): string {
  const i = weekdayIndex(isoDate);
  return i === null ? '' : LONG[i];
}
