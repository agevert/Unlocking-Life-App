/**
 * Calendar maths for ISO weeks and quarters.
 * Every date is a plain "YYYY-MM-DD" string and all arithmetic runs in UTC,
 * so results never shift with daylight saving or the server's time zone.
 */

export type Ymd = string;
export type WeekId = string; // "2026-W42"
export type QuarterKey = string; // "2026-Q4"

const DAY = 86_400_000;
const WEEK_RE = /^(\d{4})-W(\d{2})$/;
const QUARTER_RE = /^(\d{4})-Q([1-4])$/;

export function toUtc(d: Ymd): number {
  const [y, m, day] = d.split("-").map(Number);
  return Date.UTC(y, m - 1, day);
}

export function fromUtc(t: number): Ymd {
  return new Date(t).toISOString().slice(0, 10);
}

export function addDays(d: Ymd, n: number): Ymd {
  return fromUtc(toUtc(d) + n * DAY);
}

/** Today's date in a given IANA time zone. */
export function todayIn(timeZone: string, now: Date = new Date()): Ymd {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

/** 0 = Monday … 6 = Sunday */
export function weekday(d: Ymd): number {
  return (new Date(toUtc(d)).getUTCDay() + 6) % 7;
}

export function isoWeek(d: Ymd): { year: number; week: number } {
  const t = new Date(toUtc(d));
  t.setUTCDate(t.getUTCDate() - weekday(d) + 3); // Thursday of this week
  const year = t.getUTCFullYear();
  const jan4 = Date.UTC(year, 0, 4);
  const jan4Weekday = (new Date(jan4).getUTCDay() + 6) % 7;
  const week = 1 + Math.round(((t.getTime() - jan4) / DAY - 3 + jan4Weekday) / 7);
  return { year, week };
}

export function weekIdOf(d: Ymd): WeekId {
  const { year, week } = isoWeek(d);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export function isWeekId(s: string): s is WeekId {
  const m = WEEK_RE.exec(s);
  if (!m) return false;
  const w = Number(m[2]);
  if (w < 1 || w > 53) return false;
  return weekIdOf(weekMonday(s)) === s;
}

export function weekMonday(id: WeekId): Ymd {
  const m = WEEK_RE.exec(id);
  if (!m) throw new Error(`Invalid week id: ${id}`);
  const year = Number(m[1]);
  const w = Number(m[2]);
  const jan4 = fromUtc(Date.UTC(year, 0, 4));
  const firstMonday = addDays(jan4, -weekday(jan4));
  return addDays(firstMonday, (w - 1) * 7);
}

export function shiftWeek(id: WeekId, n: number): WeekId {
  return weekIdOf(addDays(weekMonday(id), n * 7));
}

export function weekNumber(id: WeekId): number {
  return Number(id.slice(6));
}

const fmtShort = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
export function formatDay(d: Ymd): string {
  return fmtShort.format(new Date(toUtc(d)));
}

export function weekRange(id: WeekId): string {
  const mon = weekMonday(id);
  return `${formatDay(mon)} – ${formatDay(addDays(mon, 6))}`;
}

/** The week a review is "about": Friday to Sunday it is the current week, otherwise the one before. */
export function defaultReviewWeek(today: Ymd): WeekId {
  const current = weekIdOf(today);
  return weekday(today) >= 4 ? current : shiftWeek(current, -1);
}

export type Quarter = {
  key: QuarterKey;
  year: number;
  q: number;
  start: Ymd;
  end: Ymd;
  days: number;
};

export function quarterOf(d: Ymd): Quarter {
  const [y, m] = d.split("-").map(Number);
  const q = Math.floor((m - 1) / 3) + 1;
  return quarterFromKey(`${y}-Q${q}`);
}

export function isQuarterKey(s: string): s is QuarterKey {
  return QUARTER_RE.test(s);
}

export function quarterFromKey(key: QuarterKey): Quarter {
  const m = QUARTER_RE.exec(key);
  if (!m) throw new Error(`Invalid quarter: ${key}`);
  const year = Number(m[1]);
  const q = Number(m[2]);
  const start = fromUtc(Date.UTC(year, (q - 1) * 3, 1));
  const end = fromUtc(Date.UTC(year, q * 3, 0));
  const days = Math.round((toUtc(end) - toUtc(start)) / DAY) + 1;
  return { key, year, q, start, end, days };
}

export function shiftQuarter(key: QuarterKey, n: number): QuarterKey {
  const { year, q } = quarterFromKey(key);
  const idx = year * 4 + (q - 1) + n;
  return `${Math.floor(idx / 4)}-Q${(idx % 4) + 1}`;
}

/** The quarter a week belongs to, decided by its Thursday (the ISO convention). */
export function quarterOfWeek(id: WeekId): Quarter {
  return quarterOf(addDays(weekMonday(id), 3));
}

/** 1-based day within the quarter, clamped to the quarter's length. */
export function dayOfQuarter(today: Ymd, quarter: Quarter): number {
  const n = Math.round((toUtc(today) - toUtc(quarter.start)) / DAY) + 1;
  return Math.min(quarter.days, Math.max(0, n));
}

/** Share of the quarter that has elapsed by the end of `today` (0–1). */
export function quarterPace(today: Ymd, quarter: Quarter): number {
  return dayOfQuarter(today, quarter) / quarter.days;
}

export function quarterWeeks(quarter: Quarter): WeekId[] {
  const weeks: WeekId[] = [];
  let w = weekIdOf(quarter.start);
  if (quarterOfWeek(w).key !== quarter.key) w = shiftWeek(w, 1);
  while (quarterOfWeek(w).key === quarter.key) {
    weeks.push(w);
    w = shiftWeek(w, 1);
  }
  return weeks;
}

export function quarterLabel(key: QuarterKey): string {
  const { year, q } = quarterFromKey(key);
  return `Q${q} ${year}`;
}
