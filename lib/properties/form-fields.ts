/**
 * Server-side `[Range(...)]` upper bounds on the three optional property
 * measures, mirrored here so the form refuses out-of-range input instead of
 * trading a round-trip for a 400. Kept next to the parser so the two cannot
 * drift apart.
 */
export const FLOOR_MAX = 500;
export const ROOM_MAX = 1000;
export const AREA_MAX = 1_000_000;

export interface ParsedNumber {
  ok: boolean;
  /** The parsed value, `null` for a blank input **and** for a rejected one. */
  value: number | null;
}

/**
 * Parse an optional numeric form field.
 *
 * Blank means "no value" and is valid — `floorCount`, `roomCount` and `areaSqm`
 * are all nullable since F-02c, and null is genuinely different from 0 (an
 * unrecorded area vs. a recorded area of zero).
 *
 * A rejected value reports `value: null` as well as `ok: false`, so a caller
 * that forgets to check `ok` submits a cleared field rather than a bad number.
 */
export function parseOptionalNumber(
  raw: string,
  { max, integer }: { max: number; integer: boolean },
): ParsedNumber {
  if (raw.trim() === "") return { ok: true, value: null };

  // `Number("12abc")` is NaN but `parseFloat("12abc")` is 12 — use the strict
  // one, so trailing junk is a validation error rather than a silent truncation.
  const n = Number(raw);
  if (!Number.isFinite(n)) return { ok: false, value: null };
  if (integer && !Number.isInteger(n)) return { ok: false, value: null };
  if (n < 0 || n > max) return { ok: false, value: null };

  return { ok: true, value: n };
}
