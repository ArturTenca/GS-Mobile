const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function dayMonth(d: Date): string {
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

function hourMinute(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toMs(ts: string | number): number {
  return typeof ts === 'number' ? ts : Date.parse(ts);
}

/** "agora" / "há N min" / "há N h" / "em dd/MM às HH:mm". Negative diffs clamp to "agora". */
export function formatRelative(ts: string | number, now: number): string {
  const t = toMs(ts);
  const diff = Math.max(0, now - t);
  if (diff < MINUTE) return 'agora';
  if (diff < HOUR) return `há ${Math.floor(diff / MINUTE)} min`;
  if (diff < DAY) return `há ${Math.floor(diff / HOUR)} h`;
  const d = new Date(t);
  return `em ${dayMonth(d)} às ${hourMinute(d)}`;
}

export function formatUpdatedAgo(ts: string | number | null, now: number): string {
  if (ts == null) return 'Sem leituras recentes';
  const rel = formatRelative(ts, now);
  if (rel === 'agora') return 'Atualizado agora';
  return `Atualizado ${rel}`;
}

export function formatDateTime(ts: string | number): string {
  const d = new Date(toMs(ts));
  return `${dayMonth(d)}/${d.getFullYear()} às ${hourMinute(d)}`;
}
