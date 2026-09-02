import type { PropertyDto } from "@/lib/types/property.types";

/**
 * The four counts behind the properties summary strip, and the filter three of
 * its tiles apply.
 *
 * A list of 86 addresses cannot say which of them is missing something, which is
 * what the strip is for. Each tile is a defect an admin can act on today:
 *
 * - **no photos** — a worker sent there arrives blind.
 * - **no floor area** — a quote against it cannot be checked.
 * - **retired category** — the category was deactivated and this row still names it.
 * - **in the bin** — soft-deleted and restorable.
 *
 * Pure, and separate from the strip because the interesting part is the
 * predicates: two of them turn on the difference between *absent* and *zero*, and
 * a third on the difference between *not fetched* and *empty*.
 */

export interface PropertySummary {
  total: number;
  noPhotos: number;
  noArea: number;
  retiredCategory: number;
  /** From the deleted list's own read — a live row can never be in the bin. */
  inBin: number;
}

/** The wire-ish keys the three narrowing tiles own in the URL. */
export const SUMMARY_FILTER_KEYS = ["noPhotos", "noArea", "retired"] as const;

/**
 * ⚠ `media` is `null` when the request did **not** carry `?withMedia=true`, and
 * that is not the same as an empty gallery. Treating null as "no photos" would
 * report the whole table as defective the moment someone drops the parameter —
 * so the count is only ever taken from an array that actually arrived.
 */
function hasNoPhotos(p: PropertyDto): boolean {
  return Array.isArray(p.media) && p.media.length === 0;
}

/** `null` is *unrecorded*. A measured `0` is a value and is not a defect. */
function hasNoArea(p: PropertyDto): boolean {
  return p.areaSqm === null;
}

/**
 * `activeCategoryCodes` is the active-only lookup list, so "not in it" **is** the
 * retired predicate — deactivation is never applied retroactively, and a property
 * keeps the category it was filed under.
 *
 * ⚠ An **empty** set means the lookup has not arrived, not that every category is
 * retired. Answering "0" until it does is the only safe reading; the alternative
 * accuses the entire table for one paint.
 */
function isRetired(p: PropertyDto, activeCategoryCodes: Set<string>): boolean {
  if (activeCategoryCodes.size === 0) return false;
  return !activeCategoryCodes.has(p.category.code);
}

export function summarise(
  rows: PropertyDto[],
  activeCategoryCodes: Set<string>,
  binCount: number,
): PropertySummary {
  let noPhotos = 0;
  let noArea = 0;
  let retiredCategory = 0;

  for (const p of rows) {
    if (hasNoPhotos(p)) noPhotos++;
    if (hasNoArea(p)) noArea++;
    if (isRetired(p, activeCategoryCodes)) retiredCategory++;
  }

  return { total: rows.length, noPhotos, noArea, retiredCategory, inBin: binCount };
}

/**
 * Whether one row survives the summary tiles that are switched on.
 *
 * AND-combines, like every other dimension on this table, and combines with them
 * too — the tiles are filters in the URL rather than a separate mode, so a tile
 * click is a shareable link and the chips can clear it.
 */
export function matchesSummaryFilter(
  p: PropertyDto,
  values: Record<string, string>,
  activeCategoryCodes: Set<string>,
): boolean {
  return (
    triState(values.noPhotos, hasNoPhotos(p)) &&
    triState(values.noArea, hasNoArea(p)) &&
    triState(values.retired, isRetired(p, activeCategoryCodes))
  );
}

/**
 * Three states, not two: an absent value narrows nothing, `"true"` keeps the rows
 * that have the defect and `"false"` keeps the rows that do not.
 *
 * `false` is a real question the band offers — *"which properties DO have
 * photos"* — and it is not the same as omitting the filter, which is exactly the
 * distinction a checkbox cannot express. Anything else in the slot is treated as
 * absent, because the URL is hand-editable.
 */
function triState(value: string | undefined, has: boolean): boolean {
  if (value === "true") return has;
  if (value === "false") return !has;
  return true;
}
