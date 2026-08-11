import type { PropertyCategoryRefDto } from "@/lib/types/lookup.types";

/**
 * Pure helpers behind the properties table. They live here rather than in the
 * page because `vitest.config.ts` covers `lib/**` and `hooks/**` only — logic
 * that can be wrong needs to be somewhere it can be tested.
 */

const blank = (s: string | null | undefined) => !s || !s.trim();

/**
 * The category name for the current locale. The backend stores both names and
 * marks both `[Required]`, so the fallbacks below should never fire — they
 * exist so a row that somehow carries a blank name renders its code instead of
 * an empty cell, which reads as a layout bug rather than as missing data.
 */
export function categoryName(
  category: Pick<PropertyCategoryRefDto, "code" | "nameDe" | "nameEn">,
  locale: string,
): string {
  const [preferred, fallback] = locale.startsWith("de")
    ? [category.nameDe, category.nameEn]
    : [category.nameEn, category.nameDe];

  if (!blank(preferred)) return preferred;
  if (!blank(fallback)) return fallback;
  return category.code;
}

/**
 * ⚠ Both bucket families below are **exclusive bands**, not cumulative windows:
 * a 3-day-old property is in `"7d"` and deliberately *not* in `"30d"`.
 *
 * That is forced by the filter mechanism, not a preference — `useTableFilters`
 * compares the selector's return value for equality, so a row can only ever
 * carry one bucket. Overlapping windows would mean picking the wider band
 * silently dropped rows the narrower one showed. The i18n labels are worded as
 * ranges ("7–30 days") so the UI matches the behaviour.
 *
 * Every value maps to some bucket, including nulls and unparseable dates. A
 * selector must never return `""` — that is how `useTableFilters` spells "no
 * filter", so an empty string would make the row match every selection.
 */
export const AREA_BUCKETS = ["unset", "lt100", "from100", "from500", "gt2000"] as const;
export type AreaBucket = (typeof AREA_BUCKETS)[number];

/** Bands are half-open `[lower, upper)`, in m². `null` is its own bucket, not a size. */
export function areaBucket(areaSqm: number | null | undefined): AreaBucket {
  if (areaSqm === null || areaSqm === undefined || Number.isNaN(areaSqm)) return "unset";
  if (areaSqm < 100) return "lt100";
  if (areaSqm < 500) return "from100";
  if (areaSqm < 2000) return "from500";
  return "gt2000";
}

export const CREATED_BUCKETS = ["7d", "30d", "365d", "older", "unknown"] as const;
export type CreatedBucket = (typeof CREATED_BUCKETS)[number];

/**
 * Age band for a `createdAt`. `now` is a parameter rather than a `Date.now()`
 * call so the bucket is a pure function of its inputs — otherwise every render
 * would recompute a new answer and the tests would depend on the wall clock.
 *
 * A timestamp in the future (clock skew between the API and the browser) lands
 * in the newest band rather than falling through to `"older"`.
 */
export function createdBucket(iso: string, now: number): CreatedBucket {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "unknown";

  const days = (now - t) / (24 * 60 * 60 * 1000);
  if (days < 7) return "7d";
  if (days < 30) return "30d";
  if (days < 365) return "365d";
  return "older";
}

/**
 * Owner id → display name, for the table's Owner column and its filter.
 *
 * `PropertyDto` carries only `bossOwnerUserId`, so the name comes from a
 * separate `GET /api/admin/owners/bosses` read and is joined client-side.
 * Owners with no usable name are omitted so the caller's own fallback renders,
 * rather than the cell going blank.
 */
export function ownerNameById(
  owners: { id: string; fullName: string }[] | undefined,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const o of owners ?? []) {
    if (!blank(o.fullName)) map.set(o.id, o.fullName.trim());
  }
  return map;
}
