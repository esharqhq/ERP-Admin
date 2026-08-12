import type { WorkerListQuery } from "@/lib/types/worker.types";
import { countRangeError, rangeError } from "@/lib/ui/filter-validation";

/**
 * Turns the workers table's filter bag into a typed query, the same shape as
 * `buildOwnerFilterQuery`.
 *
 * `WorkerListQuery` models **thirteen** filters and the page exposed none of them —
 * it filtered `search` in the browser over one page of a paged result, so a search
 * only ever reached the 25 rows already on screen. `search` is a server param.
 *
 * Two fields are deliberately **not** here:
 *
 * - **`employeeType`** is an unconstrained `string` with no enum and no lookup
 *   endpoint, so there is nothing to populate a picker from. Deriving options from
 *   the rows would offer only the values on the current page, which is the bug this
 *   file exists to end.
 * - **`professionIds` is repeatable and this sends at most one.** The panel has no
 *   multi-select control, so the bag holds a single id and it is wrapped into a
 *   one-element array. Match-any with one member is exactly "this profession", so
 *   the reduction is honest — it just cannot express "either of two" yet.
 */
export const WORKER_FILTER_KEYS = [
  "status",
  "professionId",
  "ratingMin",
  "includeUnrated",
  "experienceMin",
  "experienceMax",
  "completedMin",
  "completedMax",
  "registeredFrom",
  "registeredTo",
  "hasActiveContract",
  "onTask",
] as const;

const TEXT_KEYS = ["status", "registeredFrom", "registeredTo"] as const;

const COUNT_KEYS = [
  "experienceMin",
  "experienceMax",
  "completedMin",
  "completedMax",
] as const;

/** `bool?` in the API — omitting is a third state, never the same as `false`. */
const BOOL_KEYS = ["hasActiveContract", "onTask"] as const;

type Result = { ok: true; query: Partial<WorkerListQuery> } | { ok: false };

export function buildWorkerFilterQuery(values: Record<string, string>): Result {
  const v = (k: string) => values[k] ?? "";

  if (rangeError(v("registeredFrom"), v("registeredTo"))) return { ok: false };
  if (countRangeError(v("experienceMin"), v("experienceMax"))) return { ok: false };
  if (countRangeError(v("completedMin"), v("completedMax"))) return { ok: false };

  const query: Partial<WorkerListQuery> = {};
  const write = query as Record<string, unknown>;

  for (const k of TEXT_KEYS) {
    if (v(k)) write[k] = v(k);
  }
  // `!== ""` rather than truthiness: `0` is a real bound — "workers who have
  // completed nothing" is `completedMax=0`.
  for (const k of COUNT_KEYS) {
    if (v(k) !== "") write[k] = Number(v(k));
  }
  for (const k of BOOL_KEYS) {
    if (v(k) === "true") write[k] = true;
    else if (v(k) === "false") write[k] = false;
  }

  // Repeatable param, one member. See the note above.
  if (v("professionId")) query.professionIds = [v("professionId")];

  // A threshold picked from a fixed list of options, so there is no range to
  // validate and no second bound — the API has `ratingMin` and no `ratingMax`.
  if (v("ratingMin") !== "") query.ratingMin = Number(v("ratingMin"));

  // Only meaningful alongside a threshold: it decides whether unrated workers are
  // kept *beside* the `ratingMin` set. Sent alone it would describe a set nobody
  // asked to narrow.
  if (v("ratingMin") !== "" && v("includeUnrated")) {
    query.includeUnrated = v("includeUnrated") === "true";
  }

  return { ok: true, query };
}
