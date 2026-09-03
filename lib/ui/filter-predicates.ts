import { parseMulti } from "@/components/ui/filter-bar";

/**
 * The three predicates a client-mode table needs to turn a filter bag into a
 * `ClientSource.filter`.
 *
 * They live here rather than in each page because all three have a rule that is
 * easy to get subtly wrong, and getting it wrong shows up as a short list rather
 * than as an error:
 *
 * - an **absent** filter narrows nothing, and `0` or `""` are not absent;
 * - a **null row value** drops out of any bound rather than passing it;
 * - a date range compares **calendar days**, not instants.
 */

/**
 * A `multiSelect` value against one row's value. Match-**any**, the same as the
 * API's repeatable params.
 *
 * Empty members are ignored, because the value is a comma-joined string in a
 * hand-editable URL and `"a,,b"` is a real thing to receive.
 */
export function matchesAny(
  selected: string | undefined,
  value: string | null | undefined,
): boolean {
  const picked = parseMulti(selected);
  if (picked.length === 0) return true;
  return value != null && picked.includes(value);
}

/**
 * An ISO timestamp against an inclusive `YYYY-MM-DD` range.
 *
 * ⚠ Compared as **day strings**, never as instants. An admin who picks
 * 12 Aug – 12 Aug means that day; a timestamp of `2026-08-12T14:30:00Z` is inside
 * it, and comparing against the bound's midnight would exclude it.
 *
 * A row with no date **drops out** once either bound is set — the same rule SQL
 * applies to a `NULL` against a range, and what *"added last week"* means.
 */
export function withinDay(
  iso: string | null | undefined,
  from: string | undefined,
  to: string | undefined,
): boolean {
  if (!from && !to) return true;
  const day = iso?.slice(0, 10);
  if (!day) return false;
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

/**
 * A nullable number against an inclusive range.
 *
 * ⚠ Bounds are tested with `!== ""` rather than truthiness: `0` is a real bound —
 * *"properties with no recorded floor area at all"* is `max=0` — and a truthiness
 * check silently drops it. A non-numeric bound from a hand-edited URL is ignored
 * rather than compared as `NaN`, which would exclude every row.
 */
export function withinNumber(
  value: number | null | undefined,
  min: string | undefined,
  max: string | undefined,
): boolean {
  const lo = bound(min);
  const hi = bound(max);
  if (lo === null && hi === null) return true;
  if (value == null) return false;
  if (lo !== null && value < lo) return false;
  if (hi !== null && value > hi) return false;
  return true;
}

function bound(raw: string | undefined): number | null {
  if (raw === undefined || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}
