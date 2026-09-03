/**
 * The date-range filter's two presets and the arithmetic behind them.
 *
 * Pure and separate from the control because the interesting part is calendar
 * arithmetic — month ends, year ends, leap days — and because `matchPreset` is
 * what decides which pill is lit, which is the one piece of this a reader would
 * otherwise have to infer from JSX.
 *
 * Every key here is a **local** `YYYY-MM-DD`, the same shape the wire uses and
 * `useTodayKey` returns. `""` means *no bound* on a range and *no clock yet* on a
 * today key; it is passed through rather than parsed, because `new Date("")` is an
 * `Invalid Date` and every formatter downstream would print `NaN`.
 */

export interface DateRange {
  /** `YYYY-MM-DD`, or `""` for an open lower bound. */
  from: string;
  /** `YYYY-MM-DD`, or `""` for an open upper bound. */
  to: string;
}

/** In the order the pill strip prints them, as the design draws it. */
export const DATE_RANGE_PRESETS = ["7d", "30d", "90d"] as const;
export type DateRangePreset = (typeof DATE_RANGE_PRESETS)[number];

/** How many calendar days each preset spans, **including today**. */
const SPAN: Record<DateRangePreset, number> = { "7d": 7, "30d": 30, "90d": 90 };

/**
 * `key` moved by `delta` days, still local, still `YYYY-MM-DD`.
 *
 * Built through the `Date` constructor rather than by string maths so month
 * lengths, leap days and year ends are the platform's problem. Constructed from
 * the three parts, never `new Date("2026-08-31")` — a bare date string is parsed
 * as **UTC**, which lands on the previous day west of Greenwich.
 */
export function shiftDay(key: string, delta: number): string {
  if (!key) return "";
  const [y, m, d] = key.split("-").map(Number);
  const at = new Date(y, m - 1, d + delta);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
}

/**
 * The range a preset names, anchored on `todayKey`.
 *
 * **Today counts as one of the days.** "7 d" is today and the six before it, not
 * today and the seven before it — the second reading spans eight calendar days and
 * would quietly return a day more than the label promises.
 */
export function presetRange(preset: DateRangePreset, todayKey: string): DateRange {
  if (!todayKey) return { from: "", to: "" };
  return { from: shiftDay(todayKey, -(SPAN[preset] - 1)), to: todayKey };
}

/**
 * Which preset `range` **is**, or `null` for a hand-picked one.
 *
 * Re-derived against the current day every time rather than stored, so a pill
 * cannot keep claiming "7 d" the morning after it was set — the stored range is
 * still the same two dates, but it no longer ends today, and a lit pill would
 * describe a window the query does not.
 */
export function matchPreset(range: DateRange, todayKey: string): DateRangePreset | null {
  if (!todayKey || !range.from || !range.to) return null;
  for (const preset of DATE_RANGE_PRESETS) {
    const candidate = presetRange(preset, todayKey);
    if (candidate.from === range.from && candidate.to === range.to) return preset;
  }
  return null;
}
