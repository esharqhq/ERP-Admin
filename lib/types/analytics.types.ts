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

export interface AdminHomeDto {
  totals: AdminHomeTotals;
  statusBreakdown: StatusBreakdownItem[];
  topWorkers: TopWorkerItem[];
  trend: TrendPoint[];
  revenueSeries: RevenuePoint[];
}
