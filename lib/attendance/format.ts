/**
 * Times, as the attendance screen draws them.
 *
 * Its own module because five of this screen's components render the same clock
 * face — the row, the check-in cell, the check-out cell, the detail timeline and
 * the phone card — and a copy of `toLocaleTimeString` in each is how two of them
 * end up disagreeing about whether an unparseable timestamp is a blank or a dash.
 */

/** The em dash every empty value on this screen renders as. Never a blank cell. */
export const EMPTY = "—";

/**
 * `HH:MM` in the admin's locale, or the em dash.
 *
 * A null timestamp and an unparseable one look the same on purpose: both mean
 * *"there is no time here"*, and the row has nothing useful to say about which.
 */
export function hhmm(iso: string | null | undefined, locale: string): string {
  if (!iso) return EMPTY;
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return EMPTY;
  return at.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

/** A day key (`YYYY-MM-DD`) written out for a heading — *"10 September 2026"*. */
export function longDate(dayKey: string, locale: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  if (!y || !m || !d) return dayKey;
  return new Date(y, m - 1, d).toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * The metres on a refusal, rounded.
 *
 * `lastRefusalDistanceMeters` is a `double` and arrives as `142.0`; nobody reads
 * a tenth of a metre off a phone's GPS fix. Rounded to a whole metre, and `null`
 * stays `null` — the caller drops the clause rather than printing `0 m`, which
 * would read as standing exactly on the target.
 */
export function metres(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null;
  return Math.round(value);
}
