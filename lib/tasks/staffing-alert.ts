// lib/tasks/staffing-alert.ts

import type { TaskItemDto } from "@/lib/types/task.types";

export interface StaffingAlertRow {
  task: TaskItemDto;
  /** Carried by the `?staffing=Critical` answer — under six hours to start. */
  critical: boolean;
}

export interface StaffingAlert {
  /** Short-handed days starting within 24 h — the critical ones included. */
  within24h: number;
  /** Short-handed days starting within 6 h. */
  within6h: number;
  /**
   * `within24h - within6h` — the 6–24 h band. What the card shows beside
   * `within6h`, because two nested counts side by side read as additive.
   */
  within6to24h: number;
  /** Soonest first, cut to the limit. */
  rows: StaffingAlertRow[];
  /** How many of `within24h` the cut left out. */
  hidden: number;
}

/**
 * The home card's reading of the admin "Critical list"
 * (`GET /api/tasks/admin?staffing=Warning|Critical`, F-07 ·8).
 *
 * ⚠ **The server decides who is short-handed; this only arranges the answer.**
 * `staffing=` counts active workers with `TaskStaffing.OccupiesSlot`, the same
 * rule the 82/83 notifications use, so the card and the bell agree. Nothing
 * here recounts staffing from `workers`.
 *
 * ⚠ The horizons are **nested** — `Warning` includes the critical days. The two
 * reads are separate requests, though, so a day can cross the six-hour line
 * between them and sit in `critical` without being in `warning`. It is merged
 * in rather than dropped: losing the most urgent row is the one failure a
 * worklist must not have.
 *
 * The server orders furthest-first (`OrderByDescending(ScheduledAt)`); the card
 * wants the soonest first.
 */
export function staffingAlert(
  warning: TaskItemDto[],
  critical: TaskItemDto[],
  limit: number,
): StaffingAlert {
  const criticalIds = new Set(critical.map((t) => t.id));
  const byId = new Map<string, TaskItemDto>();
  for (const t of warning) byId.set(t.id, t);
  for (const t of critical) if (!byId.has(t.id)) byId.set(t.id, t);

  const all = [...byId.values()].sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
  );

  return {
    within24h: all.length,
    within6h: criticalIds.size,
    within6to24h: all.length - criticalIds.size,
    rows: all.slice(0, limit).map((task) => ({ task, critical: criticalIds.has(task.id) })),
    hidden: Math.max(0, all.length - limit),
  };
}
