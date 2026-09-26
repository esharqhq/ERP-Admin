/**
 * What the activity log asks the server for — and how to tell a short answer from
 * a truncated one.
 *
 * `GET /api/admin/audit-log` (`AdminController.cs:242-268`) filters on the server
 * by `action`, `targetEntity`, `targetId`, `actorId`, `fromUtc` and `toUtc`, newest
 * first, and returns **at most 200 rows** with no total and no `hasMore`. The page
 * used to fetch unfiltered and filter by action on the client, so an action whose
 * rows were all older than the newest 200 read as "no entries" — the same screen as
 * a real empty result. Every narrowing therefore goes to the server.
 */

import type { AuditLogFilters } from "@/lib/services/audit.service";

/** The server's ceiling on one response. A full page means older rows may exist. */
export const AUDIT_ROW_CAP = 200;

/**
 * The actions the filter offers, as message keys (`audit.actions.*`).
 *
 * Not all 88 `AuditAction` members — only the ones that already have a label in
 * both languages, so no option prints a humanized fallback.
 */
export const AUDIT_FILTER_ACTIONS = [
  "ADMIN_CREATED", "ADMIN_MODIFIED", "ADMIN_DEACTIVATED", "ADMIN_ROLE_CHANGED",
  "KYC_APPROVED", "KYC_REJECTED", "OWNER_KYC_RESET_TO_PENDING",
  "OWNER_DEACTIVATED",
  "WORKER_APPROVED", "WORKER_REJECTED", "WORKER_DEACTIVATED",
  "WORKER_DOC_APPROVED", "WORKER_DOC_REJECTED",
  "PROPERTY_DEACTIVATED_BY_ADMIN", "PROPERTY_RESTORED", "PROPERTY_CREATED_BY_ADMIN",
  "ROLE_PERMISSION_ADDED", "ROLE_PERMISSION_REMOVED",
  "WORKER_CONTRACT_FORCE_DEACTIVATED",
  "WORKER_LEAVE_REQUEST_APPROVED", "WORKER_LEAVE_REQUEST_REJECTED",
  "WORKER_TASK_RATED",
  // F-07 ·9a/·9b and ·10 — the rows whose metadata the list reads out.
  "WORKER_TASK_ASSIGNED", "TASK_GROUP_CREATED_BY_ADMIN",
] as const;

/**
 * Every action with a label — the offered ones plus the two property-docs
 * verdicts. Those admin routes were deleted, so filtering by them can only ever
 * return history; but that history still exists, and its rows keep their label.
 */
export const AUDIT_LABELLED_ACTIONS = [
  ...AUDIT_FILTER_ACTIONS,
  "PROPERTY_DOCS_APPROVED",
  "PROPERTY_DOCS_REJECTED",
] as const;

/**
 * `KYC_APPROVED` → `KycApproved`.
 *
 * ⚠ The `action` param binds to the C# enum **by member name** (or number). The
 * UPPER_SNAKE message key is refused with a problem-details `400`, so it must never
 * reach the wire. Every member is the PascalCase of the same words — acronyms
 * included (`Kyc`, not `KYC`) — which the test checks against the frozen list.
 */
export function toActionMember(snake: string): string {
  return snake
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("");
}

/** The page's filter state. `action` is a message key or `"all"`; days are local `YYYY-MM-DD` or `""`. */
export interface AuditFilterInput {
  action: string;
  from: string;
  to: string;
}

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A local day's edge as an instant. Built from the three parts, never
 * `new Date("2026-09-01")` — a bare date string parses as **UTC** and lands on the
 * previous day west of Greenwich (see `lib/ui/date-range.ts`).
 */
function dayEdge(key: string, end: boolean): string | undefined {
  if (!DAY_KEY.test(key)) return undefined;
  const [y, m, d] = key.split("-").map(Number);
  const at = end
    ? new Date(y, m - 1, d, 23, 59, 59, 999)
    : new Date(y, m - 1, d, 0, 0, 0, 0);
  return at.toISOString();
}

/**
 * The query for one filter state. Omits what is not set, so "all" and an empty
 * range send no param at all.
 *
 * The days are the admin's own, the bounds are instants: `fromUtc` is the start of
 * the first local day and `toUtc` the **last millisecond** of the last one — never
 * that day's midnight, which would drop the whole day the admin picked. The same
 * rule as `lib/tasks/dispatch-window.ts`.
 */
export function buildAuditQuery(input: AuditFilterInput): AuditLogFilters {
  const query: AuditLogFilters = {};
  if (input.action && input.action !== "all") {
    query.action = toActionMember(input.action);
  }
  const fromUtc = dayEdge(input.from, false);
  if (fromUtc) query.fromUtc = fromUtc;
  const toUtc = dayEdge(input.to, true);
  if (toUtc) query.toUtc = toUtc;
  return query;
}

/** Whether any server-side narrowing is on — decides the empty state's wording. */
export function hasAuditFilter(input: AuditFilterInput): boolean {
  return Boolean((input.action && input.action !== "all") || input.from || input.to);
}

/**
 * True when the response filled the cap, so older matching rows may exist that
 * were not sent. Reads the rows **the server returned**, never a client-searched
 * subset of them.
 */
export function isCapped(rows: readonly unknown[]): boolean {
  return rows.length >= AUDIT_ROW_CAP;
}
