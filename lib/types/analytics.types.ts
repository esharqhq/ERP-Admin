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

/* ------------------------------------------------------------------ *
 * Worker working-hours analytics — GET /api/analytics/admin/hours
 * (handoff doc: worker-hours-frontend-handoff.md, verified e2e 2026-06-12).
 *
 * IMPORTANT — "time on site", NOT billable hours: `checkoutAt` is stamped on
 * ALL of a task's workers at once when the owner accepts it (DONE), so a worker
 * who finished early is credited until the whole task closed (backend gap
 * G_TruePerWorkerCheckout). Surface the numbers as "time on site" only.
 *
 * The API returns `totalMinutes` (integer) everywhere — the FE formats `Xh Ym`
 * client-side so nothing rounds twice (see `formatMinutes` in lib/format-hours).
 * ------------------------------------------------------------------ */

export type HoursGranularity = "week" | "month";

/** Query params for the admin/owner aggregate endpoints (all optional). */
export interface WorkerHoursQuery {
  /** YYYY-MM-DD, inclusive lower bound on the shift's scheduled date. */
  from?: string;
  /** YYYY-MM-DD, inclusive upper bound. */
  to?: string;
  /** Bucket size for `byPeriod`. Defaults to `month` server-side. */
  granularity?: HoursGranularity;
  /** Narrow to one worker. */
  workerId?: string;
  /** Narrow to one property. */
  propertyId?: string;
}

/** `period` is `"2026-06"` (month) or `"2026-W23"` (ISO week) — NOT an ISO date. */
export interface HoursPeriodBucket {
  period: string;
  totalMinutes: number;
}

export interface HoursPropertyBucket {
  propertyId: string;
  propertyName: string;
  totalMinutes: number;
}

/** `byWorker` is sorted by `totalMinutes` desc by the backend. */
export interface HoursWorkerBucket {
  workerId: string;
  workerName: string;
  totalMinutes: number;
  shiftsCounted: number;
}

/**
 * Shape returned by `admin/hours` and `owner/hours`. No `byTaskGroup` /
 * per-shift drill-down on the aggregate (that lives only on the worker-self
 * DTO — backend gap G_AggregateGroupDrilldown).
 */
export interface WorkerHoursAggregateDto {
  totalMinutes: number;
  shiftsCounted: number;
  workerCount: number;
  byWorker: HoursWorkerBucket[];
  byPeriod: HoursPeriodBucket[];
  byProperty: HoursPropertyBucket[];
}
