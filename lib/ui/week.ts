/**
 * Monday-first weeks, ISO week numbers, and locale weekday labels.
 *
 * Pure and React-free. `hooks/use-week-navigation.ts` does some of this already
 * and cannot be reused: it holds the week in `useState` (the Matrix needs it in
 * the URL, beside the filters) and its labels are a hardcoded German `KW` / `Mo` /
 * `So`. That is the same defect `055ccf1 fix(calendar)` removed from the picker —
 * a German string rendered on an English screen — so this replaces it rather than
 * wrapping it.
 *
 * Every date here is a **local calendar day**, handled as a `YYYY-MM-DD` key.
 * Instants are the wrong type for "which day is this": west of Greenwich a UTC
 * midnight is the previous local date, and the server sends `scheduledDate` as a
 * local calendar date, so comparing keys is the only correct comparison.
 */

/** A local calendar day, `YYYY-MM-DD`. The one format where lexical order is chronological. */
export type DayKey = string;

const pad = (n: number) => String(n).padStart(2, "0");

export function toDayKey(d: Date): DayKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parsed as a **local** date, never `new Date("2026-09-01")` — that is UTC midnight. */
export function fromDayKey(key: DayKey): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** The Monday of the week containing `d`. Weeks are Monday-first throughout. */
export function mondayOf(d: Date): Date {
  const dow = (d.getDay() + 6) % 7; // Mon = 0 … Sun = 6
  return addDays(d, -dow);
}

/**
 * ISO 8601 week number — the **Thursday rule**: a week belongs to the year that
 * holds its Thursday. Without it, 1 January lands in week 1 of the wrong year
 * roughly three years in seven.
 */
export function isoWeek(d: Date): number {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - dow + 3); // that week's Thursday
  const firstThursday = new Date(date.getFullYear(), 0, 4);
  firstThursday.setDate(
    firstThursday.getDate() - ((firstThursday.getDay() + 6) % 7) + 3,
  );
  return (
    1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * 86_400_000))
  );
}

export interface Week {
  /** Monday, as the key the URL carries. */
  startKey: DayKey;
  /** Seven local dates, Monday → Sunday. */
  days: Date[];
  /** The same seven as keys, for comparing against a server `scheduledDate`. */
  dayKeys: DayKey[];
  isoWeek: number;
}

/** The week containing `anchor` (a day key, or today when absent/unparseable). */
export function weekOf(anchor: DayKey | null | undefined, todayKey: DayKey): Week {
  const base = anchor && /^\d{4}-\d{2}-\d{2}$/.test(anchor) ? anchor : todayKey;
  const monday = mondayOf(fromDayKey(base));
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  return {
    startKey: toDayKey(monday),
    days,
    dayKeys: days.map(toDayKey),
    isoWeek: isoWeek(monday),
  };
}

/** The Monday `n` weeks away, as a key — what a pager button writes. */
export function shiftWeek(startKey: DayKey, weeks: number): DayKey {
  return toDayKey(addDays(fromDayKey(startKey), weeks * 7));
}

/**
 * Short weekday names, Monday-first, in the reading locale.
 *
 * From `Intl`, never a literal array. A hardcoded list is wrong in the other
 * language and wrong again in a locale whose week starts on Sunday — this one is
 * deliberately Monday-first because the grid is, but the *names* are the
 * platform's.
 */
export function weekdayLabels(locale: string): string[] {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: "short" });
  // 2024-01-01 was a Monday; any known Monday works as the anchor.
  const monday = new Date(2024, 0, 1);
  return Array.from({ length: 7 }, (_, i) => fmt.format(addDays(monday, i)));
}

/** `31.08 – 06.09`, in the reading locale's own day/month order. */
export function weekRangeLabel(week: Week, locale: string): string {
  const fmt = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit" });
  return `${fmt.format(week.days[0])} – ${fmt.format(week.days[6])}`;
}
