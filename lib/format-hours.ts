/**
 * Shared helpers for the working-hours analytics surface. The API returns raw
 * `totalMinutes` (integer) everywhere; the frontend is the single place that
 * renders `Xh Ym`, so nothing is rounded twice (per the handoff doc).
 */

/** `240 → "4h 0m"`, `0 → "0h 0m"`, `75 → "1h 15m"`. Negatives clamp to 0. */
export function formatMinutes(totalMinutes: number): string {
  const m = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h}h ${min}m`;
}

/**
 * Render a `byPeriod[].period` key for display. The key is NOT an ISO date —
 * it is `"2026-06"` (month) or `"2026-W23"` (ISO week). Passing either to
 * `new Date()` yields `Invalid Date`, so we parse the parts ourselves.
 *
 * - month `"2026-06"` → localized `"Jun 2026"`
 * - week  `"2026-W23"` → `"W23 2026"`
 * - anything unexpected → returned verbatim (never a fabricated date)
 */
export function formatPeriodLabel(period: string, locale: string): string {
  const weekMatch = /^(\d{4})-W(\d{1,2})$/.exec(period);
  if (weekMatch) {
    const [, year, week] = weekMatch;
    return `W${Number(week)} ${year}`;
  }

  const monthMatch = /^(\d{4})-(\d{2})$/.exec(period);
  if (monthMatch) {
    const [, year, month] = monthMatch;
    // Build a date from the parts (UTC, day 1) — safe, unlike new Date(period).
    const d = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
    return Number.isNaN(d.getTime())
      ? period
      : d.toLocaleDateString(locale, {
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        });
  }

  return period;
}
