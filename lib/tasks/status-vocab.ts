/**
 * The five day states, as this panel names them.
 *
 * ⚠ Deliberately NOT built on `normalizeStatus` (`lib/types/task.types.ts:185`).
 * That helper is a generic `trim().toLowerCase()` used at 51 call sites across
 * fifteen unrelated enums — message types, priorities, outcomes, document and
 * ticket statuses, tab names. Teaching it task vocabulary would leak day-state
 * meaning into all of them.
 */
export type TaskStateKey =
  | "pending"
  | "checkedIn"
  | "inReview"
  | "done"
  | "cancelled";

/**
 * ⚠ Both spellings of the two renamed states are here on purpose. F-07 ·0
 * (2026-09-17) changed `"Active"` → `"CheckedIn"` and `"Review"` → `"InReview"`
 * on `TaskItemDto.status`, on `TaskStatusDto.status` — which is every transition
 * response — and on the admin attendance export's `taskStatus` column. The
 * server sends only the new words; a cached response or an old fixture can
 * still carry the old ones.
 */
const WORDS: Record<string, TaskStateKey> = {
  pending: "pending",
  active: "checkedIn",
  checkedin: "checkedIn",
  review: "inReview",
  inreview: "inReview",
  done: "done",
  cancelled: "cancelled",
  canceled: "cancelled",
};

/**
 * ⚠ `null` is a real answer, not a failure. The day states are not a closed set:
 * this is the second time they have moved, and slice ·5 adds a disputed state.
 * Callers render an unknown word rather than guessing which of the five it meant.
 */
export function canonicalTaskStatus(
  raw: string | null | undefined,
): TaskStateKey | null {
  const key = (raw ?? "").trim().toLowerCase();
  return WORDS[key] ?? null;
}
