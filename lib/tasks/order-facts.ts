// lib/tasks/order-facts.ts

import type { TaskGroupClosureCountsDto } from "@/lib/types/task.types";

/**
 * The read-back of what an order carries (F-07 ·7 / ·12 / ·3) — the booking
 * page and the walk-in sheet word these the same way.
 */

/**
 * `ownerProvidesTools`, as a message key. `null` is a booking from before the
 * question existed (F-07 ·7, 2026-09-23), and an older payload may omit the
 * field outright — both read "not specified". ⚠ Never "no": `false` is an
 * answer ("we bring them"); `null` is the absence of one.
 */
export function toolsAnswerKey(
  value: boolean | null | undefined,
): "owner" | "company" | "unspecified" {
  if (value === true) return "owner";
  if (value === false) return "company";
  return "unspecified";
}

/**
 * The `orderFields` message for each tools answer. Owner and company reuse the
 * create form's own option labels (`OrderExtrasFields`), so the read-back says
 * exactly what was chosen.
 */
export const TOOLS_MESSAGE = {
  owner: "toolsOwner",
  company: "toolsCompany",
  unspecified: "toolsUnspecified",
} as const;

/**
 * `kind` (F-07 ·12), as a message key — or `null` for a word we cannot name,
 * which the caller prints verbatim (or not at all when absent). The set is not
 * closed, and a guessed label is worse than the raw word.
 */
export function kindKey(kind: string | null | undefined): "booking" | "single" | null {
  if (kind === "Booking") return "booking";
  if (kind === "SingleTask") return "single";
  return null;
}

/** The `orderFields` message for each known kind. */
export const KIND_MESSAGE = {
  booking: "kindBooking",
  single: "kindSingle",
} as const;

export type ClosureKey = keyof TaskGroupClosureCountsDto;

/** Fixed, so the row never reorders as the counts change. */
const CLOSURE_ORDER: readonly ClosureKey[] = [
  "ownerAccepted",
  "autoAccepted",
  "closedForced",
  "closedReplacement",
];

export interface ClosureTally {
  /** All four reasons, zeros kept, in `CLOSURE_ORDER`. */
  rows: { key: ClosureKey; count: number }[];
  /**
   * Done days that none of the four covers — days closed before 2026-09-21,
   * when no reason was recorded. Each reason is a close, and a close ends in
   * `Done` (`task-lifecycle.md` §0d — "a cancel is not a close"; a complaint's
   * two rulings, §0e), so the remainder is exactly those days.
   * ⚠ Not a discrepancy, and never to be worded as one.
   */
  unexplained: number;
}

/**
 * How a booking's finished days closed. `null` when there is nothing to say:
 * no `closed` object (a booking that closed before ·3) or every count at zero.
 */
export function closureTally(
  closed: TaskGroupClosureCountsDto | undefined,
  daysDone: number | undefined,
): ClosureTally | null {
  if (!closed) return null;
  const rows = CLOSURE_ORDER.map((key) => ({ key, count: closed[key] ?? 0 }));
  const sum = rows.reduce((acc, r) => acc + r.count, 0);
  if (sum === 0) return null;
  return { rows, unexplained: Math.max(0, (daysDone ?? 0) - sum) };
}
