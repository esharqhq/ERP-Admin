/**
 * Range rules shared by every filter panel. Pure and React-free so they can be
 * asserted directly — the panel renders their result, and the query mapper
 * refuses to build a request while one is non-null.
 *
 * Each of these is a `400 invalid_filter_value` the user can see coming, which is
 * why they are checked here rather than left to the server.
 */

/**
 * A blank bound means "open on that side" — never zero, never today.
 *
 * Date strings are compared lexically on purpose: these are `<input type="date">`
 * values, always `YYYY-MM-DD`, the one format where lexical and chronological
 * order coincide. Anything else must not reach here.
 */
export function rangeError(from: string, to: string): "order" | null {
  if (!from || !to) return null;
  return from > to ? "order" : null;
}

/** Same open-bound rule, plus the server's refusal of negative counts. */
export function countRangeError(
  min: string,
  max: string,
): "order" | "negative" | null {
  const lo = min === "" ? null : Number(min);
  const hi = max === "" ? null : Number(max);
  if ((lo !== null && lo < 0) || (hi !== null && hi < 0)) return "negative";
  if (lo !== null && hi !== null && lo > hi) return "order";
  return null;
}
