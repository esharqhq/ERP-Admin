import { activeWorkers } from "@/lib/tasks/staffing";
import { normalizeStatus } from "@/lib/types/task.types";
import type { PropertyMediaDto } from "@/lib/types/property.types";
import type { TaskGroupDto, TaskItemDto } from "@/lib/types/task.types";

/**
 * What the task engine says about one property: the visits still coming, how many
 * it has seen, and how stale its photos are.
 *
 * All three read the **same** `getAdminTaskGroups(undefined, propertyId)` response
 * the detail screen already fetches, so the attention band, the side column and
 * the identity card's `Visits · 90 days` cannot disagree about the same day.
 *
 * A task's status is normalised before comparison: the wire spells these in
 * several cases across endpoints, and a raw `===` has already been a bug here.
 */

/** Statuses that mean nobody is expecting anyone. */
const CLOSED = new Set(["cancelled", "done"]);

export interface UpcomingVisit {
  task: TaskItemDto;
  /** A task carries no title of its own; the group holds it. */
  title: string | null;
  /**
   * Short of `requiredWorkerCount` once withdrawn workers are discounted.
   *
   * ⚠ Not `workers.length === 0`. A task needing two bodies with one booked is
   * still short, and the side column's badge has to say so — the same predicate
   * dispatch already highlights.
   */
  unassigned: boolean;
}

/** Every visit still ahead, soonest first. */
export function upcomingVisits(
  groups: TaskGroupDto[],
  now: number,
): UpcomingVisit[] {
  // `0` is `useToday`'s "clock not known" — every date would sort against 1970.
  if (!now) return [];

  const out: UpcomingVisit[] = [];
  for (const group of groups) {
    for (const task of group.tasks ?? []) {
      if (CLOSED.has(normalizeStatus(task.status))) continue;
      const at = Date.parse(task.scheduledAt);
      if (!Number.isFinite(at) || at < now) continue;
      out.push({
        task,
        title: group.title,
        unassigned: activeWorkers(task).length < task.requiredWorkerCount,
      });
    }
  }

  return out.sort(
    (a, b) => Date.parse(a.task.scheduledAt) - Date.parse(b.task.scheduledAt),
  );
}

/**
 * How many visits this property has had — and has coming — inside a window.
 *
 * Cancelled work is excluded: the label reads *"Visits"*, and a job called off
 * was never one. Future tasks inside the window **are** counted, because the
 * window is a period rather than a past.
 */
export function countVisitsSince(
  groups: TaskGroupDto[],
  now: number,
  days: number,
): number {
  if (!now) return 0;
  const from = now - days * 86_400_000;

  let count = 0;
  for (const group of groups) {
    for (const task of group.tasks ?? []) {
      if (normalizeStatus(task.status) === "cancelled") continue;
      const at = Date.parse(task.scheduledAt);
      if (Number.isFinite(at) && at >= from) count++;
    }
  }
  return count;
}

/**
 * When the newest photo was uploaded, or `null`.
 *
 * ⚠ `null` covers **two** cases deliberately — an empty gallery and one that was
 * never fetched (`media` is `null` without `?withMedia=true`). Both mean "no date
 * to show"; a caller must not read either as "the photos are old".
 */
export function newestPhotoAt(media: PropertyMediaDto[] | null): string | null {
  if (!media || media.length === 0) return null;
  let newest = media[0].createdAt;
  for (const m of media) {
    if (Date.parse(m.createdAt) > Date.parse(newest)) newest = m.createdAt;
  }
  return newest;
}
