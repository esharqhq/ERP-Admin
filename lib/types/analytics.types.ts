/**
 * Admin analytics home (backend ask #1: GET /api/analytics/admin/home).
 * Wire shape verified against the live API 2026-06-11 — camelCase, enums as
 * strings, `revenueSeries` always `[]` for now (no monetary data in the domain
 * yet; render the revenue widget as "coming soon").
 */

export interface AdminHomeTotals {
  workers: number;
  owners: number;
  properties: number;
  activeTasks: number;
}

/** One row per TaskGroup status, zero-filled (statuses with no groups still appear). */
export interface StatusBreakdownItem {
  status: string;
  count: number;
}

export interface TopWorkerItem {
  id: string;
  fullName: string;
  rating: number;
}

/** Exactly 30 contiguous days [today-29 … today], zero-filled. `date` is YYYY-MM-DD. */
export interface TrendPoint {
  date: string;
  created: number;
  completed: number;
}

/** Shape for when revenue lands; `revenueSeries` is `[]` until then. */
export interface RevenuePoint {
  date: string;
  amount: number;
}

/**
 * ⚠ Every array here is `nullable: true` on the wire, so none of them may be
 * dereferenced without a guard. Typing them as plain arrays is what let
 * `data?.statusBreakdown.reduce(...)` compile and then take the whole dashboard
 * down with a 500 the moment the field vanished.
 */
export interface AdminHomeDto {
  totals: AdminHomeTotals;
  /**
   * ⚠ Named `statusBreakdown` until the backend renamed it; measured as
   * `dayStatusBreakdown` on api.uyer.app 2026-09-21. Still one row per status
   * with the same `{status, count}` shape — the `day` prefix is the window it
   * counts over, not an extra dimension, so there is no per-day nesting.
   *
   * ⚠ The statuses it returns are **task** statuses (`Pending`, `CheckedIn`,
   * `InReview`, `Done`, `Cancelled`), not the four `TaskGroupStatusName`s the
   * card's copy still claims. `StatusDonut` has a colour for each (since
   * 2026-09-25), and a state it does not know falls back to `STATUS_FALLBACK` —
   * but the card's description is still wrong.
   */
  dayStatusBreakdown: StatusBreakdownItem[] | null;
  topWorkers: TopWorkerItem[] | null;
  trend: TrendPoint[] | null;
  revenueSeries: RevenuePoint[] | null;
}
