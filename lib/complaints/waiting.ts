import type { TaskItemDto } from "@/lib/types/task.types";

/**
 * The backend's own escalation timer (`task-lifecycle.md` §0e "If nobody
 * decides"): after 48 hours a second urgent ticket opens and senior admins are
 * told. Mirrored so the queue flags the same complaints the bell does. The day
 * does NOT close on it.
 */
export const ESCALATION_HOURS = 48;

const HOUR = 3_600_000;

/** Whole hours since `raisedAt`, or `null` when it is unknown. Never negative. */
export function hoursWaiting(
  raisedAt: string | null | undefined,
  now: Date,
): number | null {
  if (!raisedAt) return null;
  const at = Date.parse(raisedAt);
  if (Number.isNaN(at)) return null;
  return Math.max(0, Math.floor((now.getTime() - at) / HOUR));
}

/** Strictly past 48 hours — at exactly 48 the backend has not fired yet. */
export function isEscalated(raisedAt: string | null | undefined, now: Date): boolean {
  if (!raisedAt) return false;
  const at = Date.parse(raisedAt);
  if (Number.isNaN(at)) return false;
  return now.getTime() - at > ESCALATION_HOURS * HOUR;
}

/**
 * A queue row. `raisedAt` is not on the list response (`complaint` is `null`
 * there), so it arrives from a per-day read: `undefined` while that read is in
 * flight, `null` when it failed or found no complaint.
 */
export interface ComplaintQueueRow {
  task: TaskItemDto;
  raisedAt: string | null | undefined;
}

/**
 * Oldest complaint first — the one closest to (or past) escalation is the one
 * to clear. Rows whose moment is unknown go last, by their day, so a slow read
 * never pushes a known-old complaint down.
 */
export function sortQueue(rows: ComplaintQueueRow[]): ComplaintQueueRow[] {
  const at = (r: ComplaintQueueRow) => (r.raisedAt ? Date.parse(r.raisedAt) : Number.NaN);
  return [...rows].sort((a, b) => {
    const x = at(a);
    const y = at(b);
    const xKnown = !Number.isNaN(x);
    const yKnown = !Number.isNaN(y);
    if (xKnown && yKnown) return x - y;
    if (xKnown) return -1;
    if (yKnown) return 1;
    return Date.parse(a.task.scheduledAt) - Date.parse(b.task.scheduledAt);
  });
}
