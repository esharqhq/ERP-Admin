import { parseMulti } from "@/components/ui/filter-bar";
import type {
  WorkerAgencySource,
  WorkerListQuery,
} from "@/lib/types/worker.types";
import { countRangeError, rangeError } from "@/lib/ui/filter-validation";

/**
 * The workers table's filter bag → a typed query, the same shape as
 * `buildOwnerFilterQuery`.
 *
 * **All twenty-two, and the count is the point.** The previous version modelled
 * twelve, the page exposed none of them, and it still sent `?onTask=` — which
 * stopped being a parameter on 2026-08-27 and is now an **unknown query key**.
 * Unknown keys are ignored by design on every admin table, so that request came
 * back `200` with the **whole unfiltered set** and the screen looked fine. That
 * is the failure mode this file exists to end, and it is why the rename is a
 * rewrite rather than an alias.
 *
 * Everything here is a wire-param name. The bag's keys are the API's keys, so the
 * mapping stays 1:1 and greppable and the URL an admin copies is the query the
 * server ran.
 */
export const WORKER_FILTER_KEYS = [
  // Identity & stage
  "status",
  "onboardingStatus",
  // Capability
  "professionIds",
  "ratingMin",
  "includeUnrated",
  "experienceMin",
  "experienceMax",
  "completedMin",
  "completedMax",
  // Contract & workload
  "hasActiveContract",
  "booked",
  "startingSoon",
  "idleWeek",
  "availableOn",
  // Location & agency
  "countryId",
  "cityId",
  "agencyId",
  "agencySource",
  // Dormancy
  "neverLoggedIn",
  "lastSeenFrom",
  "lastSeenTo",
  "registeredFrom",
  "registeredTo",
] as const;

/** Passed through as written — the bag already holds the wire's own strings. */
const TEXT_KEYS = [
  "status",
  "onboardingStatus",
  "availableOn",
  "countryId",
  "cityId",
  "agencyId",
  "agencySource",
  "lastSeenFrom",
  "lastSeenTo",
  "registeredFrom",
  "registeredTo",
] as const;

const COUNT_KEYS = [
  "experienceMin",
  "experienceMax",
  "completedMin",
  "completedMax",
] as const;

/**
 * `bool?` in the API. Omitting is a **third state**, never the same as `false` —
 * `?neverLoggedIn=false` is "everyone who has been seen", which is a different
 * population from "no opinion". So the bag carries `""` | `"true"` | `"false"`
 * and only the last two reach the query.
 */
const BOOL_KEYS = [
  "hasActiveContract",
  "booked",
  "startingSoon",
  "idleWeek",
  "neverLoggedIn",
] as const;

type Result = { ok: true; query: Partial<WorkerListQuery> } | { ok: false };

/**
 * `{ ok: false }` is *"the server would refuse this"*, not *"this failed"*. The
 * caller draws the sentence and sends the previous query rather than firing a
 * request it knows returns `400 invalid_filter_value`.
 */
export function buildWorkerFilterQuery(values: Record<string, string>): Result {
  const v = (k: string) => values[k] ?? "";

  if (rangeError(v("registeredFrom"), v("registeredTo"))) return { ok: false };
  if (rangeError(v("lastSeenFrom"), v("lastSeenTo"))) return { ok: false };
  if (countRangeError(v("experienceMin"), v("experienceMax"))) return { ok: false };
  if (countRangeError(v("completedMin"), v("completedMax"))) return { ok: false };

  /*
    The one refusal that is a *combination* rather than a range. `NULL <= x` is
    false in SQL, so a never-seen worker can never satisfy a `lastSeen` bound —
    the pair describes the empty set and the server says so with a 400. `false`
    plus a bound is fine and genuinely useful: "seen, and seen in this window".

    The band also draws these two inputs disabled while it holds, so this is the
    backstop for a hand-edited URL rather than the only guard.
  */
  if (v("neverLoggedIn") === "true" && (v("lastSeenFrom") || v("lastSeenTo"))) {
    return { ok: false };
  }

  // 0–5 inclusive; anything else is `400 invalid_filter_value`.
  const rating = v("ratingMin") === "" ? null : Number(v("ratingMin"));
  if (rating !== null && (!Number.isFinite(rating) || rating < 0 || rating > 5)) {
    return { ok: false };
  }

  const query: Partial<WorkerListQuery> = {};
  const write = query as Record<string, unknown>;

  for (const k of TEXT_KEYS) {
    if (v(k)) write[k] = v(k);
  }
  // `!== ""` rather than truthiness: `0` is a real bound — "has completed
  // nothing" is `completedMax=0`, which truthiness would drop.
  for (const k of COUNT_KEYS) {
    if (v(k) !== "") write[k] = Number(v(k));
  }
  for (const k of BOOL_KEYS) {
    if (v(k) === "true") write[k] = true;
    else if (v(k) === "false") write[k] = false;
  }

  /*
    Repeatable and match-any. The band carries a multi-select as one comma-joined
    param, so this reads it back through the same helper the control writes with
    — the two cannot drift into different separators. `workerService` serializes
    the array as repeated keys (`paramsSerializer: { indexes: null }`).
  */
  const professions = parseMulti(v("professionIds"));
  if (professions.length > 0) query.professionIds = professions;

  if (rating !== null) query.ratingMin = rating;

  /*
    Only meaningful **beside** a threshold: it decides whether unrated workers are
    kept alongside the `ratingMin` set. Sent alone it describes a set nobody
    narrowed, so it would put a param in the URL that changes nothing.
  */
  if (rating !== null && v("includeUnrated")) {
    query.includeUnrated = v("includeUnrated") === "true";
  }

  return { ok: true, query };
}

/**
 * The agency pair, written together.
 *
 * `agencySource=Independent` means *no confirmed link*, so pairing it with a named
 * agency is an empty page rather than an error — a filter that silently returns
 * nothing and looks broken. Picking either arm clears the other.
 */
export function reconcileAgencyFilters(
  values: Record<string, string>,
  key: "agencyId" | "agencySource",
  value: string,
): Record<string, string> {
  if (key === "agencyId") {
    // A named agency is by definition "via agency"; keeping `Independent`
    // alongside it would ask for both at once.
    return {
      agencyId: value,
      agencySource: value && values.agencySource === "Independent" ? "" : (values.agencySource ?? ""),
    };
  }
  return {
    agencySource: value,
    agencyId: value === "Independent" ? "" : (values.agencyId ?? ""),
  };
}

/** Narrowing helper for the select's options, so the union stays honest. */
export function isAgencySource(value: string): value is WorkerAgencySource {
  return value === "Independent" || value === "ViaAgency";
}
