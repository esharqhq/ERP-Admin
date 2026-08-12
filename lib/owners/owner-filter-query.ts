import type { OwnerListQuery } from "@/lib/types/owner.types";
import { countRangeError, rangeError } from "@/lib/ui/filter-validation";

/**
 * Turns the owners table's filter bag into a typed query.
 *
 * The bag is keyed by **wire param name**, so the mapping below is 1:1 and
 * greppable — these key names are the API's, not ours. `countryId` is the one
 * exception: it scopes which cities the picker offers and is **never sent**,
 * because `companyCityId` is the only city param the route accepts.
 */
export const OWNER_FILTER_KEYS = [
  "status",
  "onboardingStatus",
  "ownerType",
  "countryId",
  "companyCityId",
  "registeredFrom",
  "registeredTo",
  "lastOrderedFrom",
  "lastOrderedTo",
  "neverOrdered",
  "propertyCountMin",
  "propertyCountMax",
  "taskCountMin",
  "taskCountMax",
] as const;

/** Sent as-is when non-blank. Deliberately excludes `countryId`. */
const TEXT_KEYS = [
  "status",
  "onboardingStatus",
  "ownerType",
  "companyCityId",
  "registeredFrom",
  "registeredTo",
  "lastOrderedFrom",
  "lastOrderedTo",
] as const;

const COUNT_KEYS = [
  "propertyCountMin",
  "propertyCountMax",
  "taskCountMin",
  "taskCountMax",
] as const;

type Result = { ok: true; query: Partial<OwnerListQuery> } | { ok: false };

/**
 * Refuses locally what the server would refuse anyway, so an admin sees the reason
 * beside the input rather than a toast over an unchanged table. Returning
 * `{ ok: false }` instead of throwing keeps the caller a plain render.
 */
export function buildOwnerFilterQuery(values: Record<string, string>): Result {
  const v = (k: string) => values[k] ?? "";

  if (rangeError(v("registeredFrom"), v("registeredTo"))) return { ok: false };
  if (rangeError(v("lastOrderedFrom"), v("lastOrderedTo"))) return { ok: false };
  if (countRangeError(v("propertyCountMin"), v("propertyCountMax"))) return { ok: false };
  if (countRangeError(v("taskCountMin"), v("taskCountMax"))) return { ok: false };

  // An owner who has never ordered has no date to compare against, so this pair is
  // a contradiction rather than an empty result: `400 invalid_filter_value`.
  if (v("neverOrdered") === "true" && (v("lastOrderedFrom") || v("lastOrderedTo"))) {
    return { ok: false };
  }

  const query: Partial<OwnerListQuery> = {};
  const write = query as Record<string, unknown>;

  for (const k of TEXT_KEYS) {
    if (v(k)) write[k] = v(k);
  }
  // `!== ""` rather than truthiness: `0` is a real bound — "owners with no tasks"
  // is `taskCountMax=0`, and a truthiness check would drop it.
  for (const k of COUNT_KEYS) {
    if (v(k) !== "") write[k] = Number(v(k));
  }

  // Only ever set from an explicit choice. A blank must NOT become `false`:
  // `false` returns only owners who have ordered, hiding the never-ordered group.
  if (v("neverOrdered") === "true") query.neverOrdered = true;
  else if (v("neverOrdered") === "false") query.neverOrdered = false;

  return { ok: true, query };
}

/**
 * Changing the country invalidates the chosen city — cities are unique per country
 * and referenced by id, so yesterday's city id means nothing under a new country.
 *
 * This matters more than a tidiness fix: an unrecognised `companyCityId` returns an
 * **empty page rather than an error**, so a stale id would read as "this country
 * has no matching owners" instead of as a mistake.
 */
export function clearCityOnCountryChange(
  values: Record<string, string>,
  countryId: string,
): Record<string, string> {
  if ((values.countryId ?? "") === countryId) return values;
  return { ...values, countryId, companyCityId: "" };
}
