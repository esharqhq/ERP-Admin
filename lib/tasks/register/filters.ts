import type { RegisterRow } from "@/lib/tasks/register/rows";
import { addDays, fromDayKey, toDayKey, weekOf } from "@/lib/ui/week";

/** Mirrors components/ui/filter-bar.tsx parseMulti; kept local so lib/ imports no component. */
function parseMulti(value: string | undefined): string[] {
  return (value ?? "").split(",").filter(Boolean);
}

/** Every wire param the register's filter band owns (spec §4). */
export const REGISTER_BAND_KEYS = [
  "from", "to", "startAfter", "startBefore", "overdue", "repeating",
  "status", "staffing", "checkedIn",
  "property", "city", "owner", "walkIn",
  "profession", "reqMin", "reqMax", "ratingMin",
] as const;

/**
 * How the set is drawn (`view=calendar`) and which Monday the calendar is on
 * (`week`). In the URL beside the band so a pasted link reopens the same week in
 * the same drawing — but they narrow nothing, so they are **not filters**: see
 * `bandValues` / `isBandFiltered` / `bandResetPatch`.
 */
export const REGISTER_VIEW_KEYS = ["view", "week"] as const;

/**
 * Everything `useTableUrlState` reads as a filter key — one mechanism owns the
 * URL. ⚠ That hook counts every key in `isFiltered` and clears every key in
 * `resetFilters`, so the page hands the shell the band-only versions below.
 */
export const REGISTER_FILTER_KEYS = [...REGISTER_BAND_KEYS, ...REGISTER_VIEW_KEYS] as const;

const VIEW_KEYS: readonly string[] = REGISTER_VIEW_KEYS;

/** The filter values without the view keys — what the band and its chips narrow by. */
export function bandValues(values: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(values).filter(([k]) => !VIEW_KEYS.includes(k)));
}

/**
 * `useTableUrlState.isFiltered` minus the view keys. Without this, switching to
 * the calendar alone would make an empty window read "Nothing matches these
 * filters" and offer a Clear that clears nothing.
 */
export function isBandFiltered(values: Record<string, string>, search: string): boolean {
  return Object.keys(bandValues(values)).length > 0 || search.trim().length > 0;
}

/** "Clear filters" as one URL write: every band key, never the drawing or the week. */
export function bandResetPatch(): Record<string, string> {
  return Object.fromEntries(REGISTER_BAND_KEYS.map((k) => [k, ""]));
}

/**
 * The saved views (design 01) as the table's tabs. A tab also sets the **default
 * window** — "Unstaffed today" is about today, "Short of a body" about the next
 * seven days — and an explicit date range in the band overrides it.
 */
export const REGISTER_TABS = ["thisWeek", "today", "unstaffed", "short", "next7"] as const;
export type RegisterTab = (typeof REGISTER_TABS)[number];
export const DEFAULT_REGISTER_TAB: RegisterTab = "thisWeek";

export interface RegisterWindow {
  fromKey: string;
  toKey: string;
  fromIso: string;
  toIso: string;
}

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

function bounds(fromKey: string, toKey: string): RegisterWindow {
  const f = fromDayKey(fromKey);
  const t = fromDayKey(toKey);
  // ⚠ Local parts, and the LAST millisecond: the server compares scheduledTo
  // inclusively against a timestamp (`task.service.ts` getAdminTasksInRange).
  const from = new Date(f.getFullYear(), f.getMonth(), f.getDate(), 0, 0, 0, 0);
  const to = new Date(t.getFullYear(), t.getMonth(), t.getDate(), 23, 59, 59, 999);
  return { fromKey, toKey, fromIso: from.toISOString(), toIso: to.toISOString() };
}

export function resolveWindow(
  tab: string,
  values: Record<string, string>,
  todayKey: string,
): RegisterWindow {
  const from = values.from && DAY_KEY.test(values.from) ? values.from : null;
  const to = values.to && DAY_KEY.test(values.to) ? values.to : null;
  if (from || to) return bounds(from ?? to!, to ?? from!);
  const today = fromDayKey(todayKey);
  switch (tab) {
    case "today":
    case "unstaffed":
      return bounds(todayKey, todayKey);
    case "short":
    case "next7":
      return bounds(todayKey, toDayKey(addDays(today, 6)));
    default: {
      const week = weekOf(todayKey, todayKey);
      return bounds(week.dayKeys[0], week.dayKeys[6]);
    }
  }
}

export function tabMatches(tab: string, row: RegisterRow, todayKey: string): boolean {
  switch (tab) {
    case "today":
      return row.dayKey === todayKey;
    case "unstaffed":
      return row.unstaffedToday;
    case "short":
      return row.assignable;
    default:
      return true;
  }
}

export type StaffingBucket = "none" | "short" | "full" | "over";

export function staffingBucket(row: RegisterRow): StaffingBucket {
  if (row.over > 0) return "over";
  if (row.staffing.covered) return "full";
  return row.staffing.filled === 0 ? "none" : "short";
}

export interface RegisterLookups {
  cityByProperty: ReadonlyMap<string, string>;
  /** `useWalkInOwnerId()`: undefined while pending, null when there is none. */
  walkInOwnerId: string | null | undefined;
}

function num(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Everything except the date (which is the server window) and the tab (which
 * the page applies). An absent or empty value means "any".
 */
export function matchesRegister(
  row: RegisterRow,
  values: Record<string, string>,
  lookups: RegisterLookups,
): boolean {
  if (values.startAfter && row.startTime !== "–" && row.startTime < values.startAfter) return false;
  if (values.startAfter && row.startTime === "–") return false;
  if (values.startBefore && (row.startTime === "–" || row.startTime >= values.startBefore)) return false;
  if (values.overdue === "true" && row.status !== "Overdue") return false;
  if (values.repeating === "true" && !row.repeating) return false;
  if (values.checkedIn === "true" && !row.hasCheckin) return false;

  const statuses = parseMulti(values.status);
  if (statuses.length && !statuses.includes(row.status)) return false;
  const buckets = parseMulti(values.staffing);
  if (buckets.length && !buckets.includes(staffingBucket(row))) return false;

  const properties = parseMulti(values.property);
  if (properties.length && !properties.includes(row.task.propertyId)) return false;
  if (values.city && lookups.cityByProperty.get(row.task.propertyId) !== values.city) return false;
  if (values.owner && row.ownerId !== values.owner) return false;
  if (values.walkIn === "true" && (!lookups.walkInOwnerId || row.ownerId !== lookups.walkInOwnerId)) {
    return false;
  }

  const professions = parseMulti(values.profession);
  if (professions.length && !professions.some((p) => row.professionIds.includes(p))) return false;
  const reqMin = num(values.reqMin);
  if (reqMin !== null && row.staffing.required < reqMin) return false;
  const reqMax = num(values.reqMax);
  if (reqMax !== null && row.staffing.required > reqMax) return false;
  const ratingMin = num(values.ratingMin);
  if (ratingMin !== null && (row.ratingFloor === null || row.ratingFloor < ratingMin)) return false;
  return true;
}

/** `needle` arrives lower-cased and trimmed (the shell's contract). */
export function matchesSearch(row: RegisterRow, needle: string): boolean {
  return [row.title, row.task.propertyName, row.task.id]
    .some((v) => (v ?? "").toLowerCase().includes(needle));
}

export const REGISTER_ROW_CAP = 5000;

/** Receiving exactly the ceiling means "at least this many" — the list is truncated. */
export function isCapped(count: number): boolean {
  return count >= REGISTER_ROW_CAP;
}
