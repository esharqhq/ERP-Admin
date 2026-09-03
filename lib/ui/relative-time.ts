/**
 * How long ago something happened, as an `Intl.RelativeTimeFormat` pair.
 *
 * Pure and React-free: it picks the **unit**, and the component formats it in the
 * page's locale. Splitting it that way is what stops "2 h ago" being an English
 * string assembled in a component — the German admin reads "vor 2 Std." from the
 * same number, and the choice of *which* unit is the only part with a rule in it.
 *
 * `lastSeenAt` is the field this exists for: the workers table's dormancy signal,
 * where `null` means **never signed in**, not "unknown", and is drawn as its own
 * word rather than as an age.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

export interface RelativeAge {
  /** Always negative or zero — these are all in the past. */
  value: number;
  unit: Intl.RelativeTimeFormatUnit;
}

/**
 * `null` for a missing timestamp, an unparseable one, or before the clock is
 * known (`now === 0`, the server snapshot from `useToday`/`useClock`).
 *
 * A **future** timestamp is clamped to "now" rather than rendered as "in 3 hours".
 * These are all records of something that already happened; a clock skew of a few
 * seconds between server and browser is the usual cause, and "in 4 seconds" reads
 * as a bug where "now" reads as the truth it is.
 *
 * The ladder stops at years and never says "13 months". Each rung switches at the
 * point where the smaller unit stops being informative — nobody reads "90 minutes
 * ago" and thinks faster than they read "an hour ago".
 */
export function relativeAge(
  iso: string | null | undefined,
  now: number,
): RelativeAge | null {
  if (!iso || !now) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;

  const elapsed = Math.max(0, now - then);

  if (elapsed < MINUTE) return { value: 0, unit: "minute" };
  if (elapsed < HOUR) return { value: -Math.floor(elapsed / MINUTE), unit: "minute" };
  if (elapsed < DAY) return { value: -Math.floor(elapsed / HOUR), unit: "hour" };
  if (elapsed < WEEK) return { value: -Math.floor(elapsed / DAY), unit: "day" };
  if (elapsed < MONTH) return { value: -Math.floor(elapsed / WEEK), unit: "week" };
  if (elapsed < YEAR) return { value: -Math.floor(elapsed / MONTH), unit: "month" };
  return { value: -Math.floor(elapsed / YEAR), unit: "year" };
}

/**
 * The formatted string, or `null` when there is nothing to format.
 *
 * `numeric: "auto"` so the zero rung renders the language's own word for *now*
 * ("this minute" / "in dieser Minute") instead of "in 0 minutes".
 */
export function formatRelativeAge(
  iso: string | null | undefined,
  now: number,
  locale: string,
): string | null {
  const age = relativeAge(iso, now);
  if (!age) return null;
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
    age.value,
    age.unit,
  );
}

/**
 * A short absolute day — `27 Aug 2026`.
 *
 * Used wherever a relative age would be less useful than a date: a registration,
 * a sign-in months back. Returns an em dash rather than `Invalid Date` so a bad
 * value degrades to a blank cell.
 */
export function formatDay(
  iso: string | null | undefined,
  locale: string,
): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString(locale, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}
