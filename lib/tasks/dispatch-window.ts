// lib/tasks/dispatch-window.ts

import { toLocalDateKey } from "@/lib/tasks/weekly-rows";

/**
 * How far **back** the Dispatch queue looks.
 *
 * Not zero, and that is deliberate. `POST admin-assign` has no task-date guard
 * (`GT_AdminFillHasNoDateOrStatusGuard`), and the backend's own note on that gap
 * calls filling a *just-elapsed* task a legitimate workflow — "record whoever
 * actually turned up" — because the under-staffing alert fires only 3 h before
 * start. A queue that began at this morning's midnight would hide last night's
 * unstaffed shift, which is the most urgent row there is.
 */
export const DISPATCH_BACKSTOP_DAYS = 2;

/**
 * How far **ahead** the queue looks. Dispatch is a short-horizon screen — the
 * subtitle is "soonest first" — so this is a fortnight, not a quarter.
 *
 * Two weeks of tasks sits far under the 5,000-row ceiling a closed window buys,
 * so raising it is safe up to a point; past that the ceiling truncates again,
 * silently, and nothing tells you. Change this number, not the request shape.
 */
export const DISPATCH_HORIZON_DAYS = 14;

export interface DispatchWindow {
  /** ISO instant at the **start** of the earliest local day in the window. */
  from: string;
  /** ISO instant at the **last millisecond** of the latest local day. */
  to: string;
  /** `yyyy-MM-dd` of the first day, for copy that states the range. */
  fromKey: string;
  /** `yyyy-MM-dd` of the last day. */
  toKey: string;
}

function localDayStart(now: Date, offsetDays: number): Date {
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + offsetDays,
    0,
    0,
    0,
    0,
  );
}

function localDayEnd(now: Date, offsetDays: number): Date {
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + offsetDays,
    23,
    59,
    59,
    999,
  );
}

/**
 * The window Dispatch asks the server for.
 *
 * **Why a window at all — this is a correctness fix, not a tuning knob.**
 * `GET /api/tasks/admin` with no window is
 * `OrderByDescending(ScheduledAt).Take(500)` (`TaskService.ListAllTasksAsync`),
 * so the 500 rows it returns are the ones scheduled **furthest into the future**.
 * On a platform with more than 500 future tasks, today's work is not merely
 * incomplete on the board — it is **absent**, and the truncation is silent.
 * Supplying both bounds both fixes what is returned and lifts the cap to 5,000.
 *
 * **Days are local, the bounds are instants.** The admin's "today" is their own
 * midnight, but the server compares against `ScheduledAt`, a UTC timestamp — so
 * the edges are computed in local time and serialized as instants.
 *
 * ⚠ `to` is the last **millisecond** of the last day, never that day's midnight:
 * the server's `scheduledTo` is inclusive against a timestamp, so a bound of
 * `00:00` drops every task on the day it names. `getAdminTasksInRange`'s own
 * docstring warns about exactly this.
 */
export function dispatchWindow(now: Date): DispatchWindow {
  const first = localDayStart(now, -DISPATCH_BACKSTOP_DAYS);
  const last = localDayEnd(now, DISPATCH_HORIZON_DAYS);
  return {
    from: first.toISOString(),
    to: last.toISOString(),
    fromKey: toLocalDateKey(first),
    toKey: toLocalDateKey(last),
  };
}
