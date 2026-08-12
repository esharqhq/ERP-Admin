/**
 * Move the viewer's index by `delta`, wrapping at both ends so the arrows never
 * dead-end.
 *
 * The `+ length` is load-bearing: JavaScript's `%` keeps the sign of its left
 * operand, so a plain `(index - 1) % length` yields `-1` at the first photo and
 * indexes past the end of the array. Returns 0 for an empty list, where the
 * modulo would otherwise be `NaN`.
 */
export function stepIndex(index: number, delta: number, length: number): number {
  if (length <= 0) return 0;
  return (index + delta + length) % length;
}
