// lib/tasks/dispatch-row.ts

import { activeWorkers, isOpen } from "@/lib/tasks/staffing";
import type { TaskItemDto } from "@/lib/types/task.types";

/**
 * The window the board's header pill counts, and the one the backend's own
 * under-staffing alert uses — `WorkerThresholdNotifiedAt` fires 3 h before start,
 * so a day is not a useful unit here but 24 h is.
 */
export const IMMINENT_HOURS = 24;

const HOUR_MS = 3_600_000;

/**
 * How long until a task starts, in whole hours, or `null` when the clock is not
 * known yet (`useClock()` is `0` on the server snapshot) or the timestamp is
 * unparseable.
 *
 * Negative means it has already started. Truncated toward zero rather than
 * rounded: "in 3 h" must not appear on something starting in 3 h 50 m, because
 * the admin reads it as the time they have.
 */
export function hoursUntil(scheduledAt: string | null, now: number): number | null {
  if (!now || !scheduledAt) return null;
  const at = new Date(scheduledAt).getTime();
  if (Number.isNaN(at)) return null;
  return Math.trunc((at - now) / HOUR_MS);
}

/**
 * How many **open, under-staffed** tasks start inside the next 24 h.
 *
 * Deliberately not "every task starting soon": a fully-crewed shift an hour from
 * now needs nobody's attention, and a header pill that counted it would cry wolf
 * every morning. Already-started tasks count — they are worse, not better.
 */
export function imminentUnstaffed(tasks: TaskItemDto[], now: number): number {
  if (!now) return 0;
  return tasks.filter((task) => {
    if (!isOpen(task)) return false;
    if (activeWorkers(task).length >= task.requiredWorkerCount) return false;
    const h = hoursUntil(task.scheduledAt, now);
    return h !== null && h < IMMINENT_HOURS;
  }).length;
}

/**
 * A property's identity colour.
 *
 * ⚠ **Derived, not stored.** `PropertyDto` has no colour field and no admin can
 * set one, so the design's per-property tint has no source — see
 * `BACKEND-ASKS.md`, "Two things we expected to ask for and do not need". Hashing
 * the id gives a stable hue per property with no request, which is what the dot
 * is actually for: telling two rows apart at a glance, not naming a brand.
 *
 * The hue is confined to a band that stays legible as a 7px dot in both themes,
 * and saturation/lightness are fixed so no property can draw a near-white or
 * near-black dot.
 */
export function propertyHue(propertyId: string): string {
  let hash = 0;
  for (let i = 0; i < propertyId.length; i++) {
    hash = (hash * 31 + propertyId.charCodeAt(i)) | 0;
  }
  return `hsl(${Math.abs(hash) % 360} 58% 45%)`;
}

export interface RowStaffing {
  filled: number;
  required: number;
  /** `required - filled`, floored at zero — an over-staffed task is short nobody. */
  gap: number;
  /** Nothing missing. Over-staffed counts as covered. */
  covered: boolean;
}

export function rowStaffing(task: TaskItemDto): RowStaffing {
  const filled = activeWorkers(task).length;
  const required = task.requiredWorkerCount;
  return {
    filled,
    required,
    gap: Math.max(0, required - filled),
    covered: filled >= required,
  };
}

/**
 * What a crew chip says after the worker's name.
 *
 * `checkedIn` is the one worth drawing: it is the difference between a body that
 * was promised and a body that turned up, and `TaskWorkerDto.checkinAt` has
 * carried it all along.
 *
 * `vacated` rows are struck through rather than hidden. They are the record of
 * what happened to the slot — and while `BACKEND-ASKS.md` #31 is open, they are
 * also the reason a re-fill is refused, so hiding them would hide the cause.
 */
export type CrewState = "vacated" | "checkedIn" | "assigned";

export function crewState(worker: {
  outcome: string;
  checkinAt: string | null;
}): CrewState {
  const outcome = (worker.outcome ?? "").toLowerCase();
  if (outcome === "removed" || outcome === "cancelled" || outcome === "noshow") {
    return "vacated";
  }
  return worker.checkinAt ? "checkedIn" : "assigned";
}

/**
 * A task's length in whole hours, or `null` when it has no deadline.
 *
 * `deadline` is nullable on `TaskItemDto` and genuinely absent on plenty of
 * tasks, so the row's second line has to read without it — the design's
 * "Housekeeping · 6 h" is a best case, not a guarantee.
 */
export function durationHours(
  scheduledAt: string | null,
  deadline: string | null,
): number | null {
  if (!scheduledAt || !deadline) return null;
  const from = new Date(scheduledAt).getTime();
  const to = new Date(deadline).getTime();
  if (Number.isNaN(from) || Number.isNaN(to) || to <= from) return null;
  return Math.round((to - from) / HOUR_MS);
}

/**
 * What a task's group knows that the task itself does not.
 *
 * ⚠ Every field here is **absent from `TaskItemDto`** and reachable only one level
 * up, which is why the board makes a second request for the group list — see
 * `BACKEND-ASKS.md` #33, which asks for them on the row and would delete this
 * lookup entirely.
 */
export interface GroupFacts {
  /** `TaskGroup.title` is optional server-side; `null` is normal, not an error. */
  title: string | null;
  ratingFloor: number;
  allowNewWorkers: boolean;
  eligibleProfessionIds: string[];
}

/**
 * Indexes the admin group list by id, for the board to read per row.
 *
 * A `Map` rather than a `find` per row: the board draws a fortnight of tasks and
 * the group list is the whole platform's, so the nested scan is the one shape
 * here that would actually be felt.
 */
export function indexGroupFacts(
  groups: {
    id: string;
    title: string | null;
    ratingFloor: number;
    allowNewWorkers: boolean;
    eligibleProfessionIds: string[];
  }[],
): Map<string, GroupFacts> {
  return new Map(
    groups.map((g) => [
      g.id,
      {
        title: g.title?.trim() ? g.title.trim() : null,
        ratingFloor: g.ratingFloor,
        allowNewWorkers: g.allowNewWorkers,
        eligibleProfessionIds: g.eligibleProfessionIds ?? [],
      },
    ]),
  );
}
