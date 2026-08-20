import { toLocalDateKey } from "@/lib/tasks/weekly-rows";

/** `month` is 0-indexed, matching `Date` — not 1-indexed like an ISO key. */
export interface YearMonth {
  year: number;
  month: number;
}

export interface MonthGridCell {
  /** `YYYY-MM-DD`, local. */
  key: string;
  /** Day of ITS OWN month, so a padding cell reads 29 rather than 0. */
  day: number;
  inMonth: boolean;
}

const CELLS = 42;

/**
 * Six weeks of dates covering one month, Monday first.
 *
 * Always 42 cells, even for a 28-day February that starts on a Monday and would
 * fit in four rows: a grid that changes height as the admin pages through months
 * makes the button under it jump.
 *
 * Padding cells carry the neighbouring months' real dates rather than nulls —
 * a nullable key would have to be guarded at every call site, and the dates are
 * genuinely selectable if the admin wants the 1st of next month.
 */
export function monthGrid({ year, month }: YearMonth): MonthGridCell[] {
  const first = new Date(year, month, 1);
  // `getDay()` is Sunday-based (0..6); this repo's calendars run Monday-first.
  const lead = (first.getDay() + 6) % 7;

  const cells: MonthGridCell[] = [];
  for (let i = 0; i < CELLS; i++) {
    const d = new Date(year, month, 1 - lead + i);
    cells.push({
      key: toLocalDateKey(d),
      day: d.getDate(),
      inMonth: d.getMonth() === month && d.getFullYear() === year,
    });
  }
  return cells;
}

/** `new Date(y, m + delta, 1)` normalises the year rollover for us. */
export function shiftMonth({ year, month }: YearMonth, delta: number): YearMonth {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

/** The `YearMonth` a `YYYY-MM-DD` key belongs to. */
export function monthOf(key: string): YearMonth {
  const [year, month] = key.split("-").map(Number);
  return { year, month: month - 1 };
}

/** Whether a key falls inside a month — the same test `monthGrid` uses for `inMonth`. */
export function isInMonth(key: string, { year, month }: YearMonth): boolean {
  const ym = monthOf(key);
  return ym.year === year && ym.month === month;
}

/**
 * Monday-first weekday abbreviations in `locale` — `Mon Tue …` for `en`,
 * `Mo Di …` for `de`.
 *
 * Derived rather than translated: these are data, not copy, so `Intl` already
 * knows them for every locale and an i18n key per weekday per language would be
 * seven strings to keep in sync for no gain. Both this repo's calendars used to
 * hardcode the German list, which an English admin then had to read.
 *
 * The anchor is computed, not a magic Monday: `(getDay() + 6) % 7` is the same
 * Sunday-to-Monday shift `monthGrid` applies, so the two cannot drift apart.
 */
export function weekdayLabels(locale: string): string[] {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const monday = new Date();
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return fmt.format(d);
  });
}

/**
 * Both arguments are `YYYY-MM-DD`, which sorts lexicographically in date order —
 * so this needs no parsing, and cannot drift by a timezone.
 */
export function isPastDay(key: string, todayKey: string): boolean {
  return key < todayKey;
}

/**
 * Toggles `key` in or out of `dates`, returning a new sorted-ascending array.
 *
 * `YYYY-MM-DD` sorts lexicographically, so `.sort()` needs no parsing. Kept
 * sorted because a later screen derives a date range from `dates[0]` /
 * `dates.at(-1)` — those have to be the real first and last day regardless of
 * click order.
 */
export function toggleDate(dates: string[], key: string): string[] {
  const next = dates.includes(key)
    ? dates.filter((d) => d !== key)
    : [...dates, key];
  return next.sort();
}
