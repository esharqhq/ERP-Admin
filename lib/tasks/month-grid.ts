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

/**
 * Both arguments are `YYYY-MM-DD`, which sorts lexicographically in date order —
 * so this needs no parsing, and cannot drift by a timezone.
 */
export function isPastDay(key: string, todayKey: string): boolean {
  return key < todayKey;
}
