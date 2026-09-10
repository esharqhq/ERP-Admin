// lib/tasks/day-groups.ts

import { needsWorkers } from "@/lib/tasks/staffing";
import type { TaskItemDto } from "@/lib/types/task.types";

/**
 * Where a day sits relative to the admin's today. A **discriminator, not copy** —
 * the board renders "Today" / "Tomorrow" / a weekday from `next-intl`, and a
 * module that returned English strings would be untranslatable and untestable at
 * once.
 *
 * `elapsed` exists because the Dispatch window deliberately reaches two days back
 * (`DISPATCH_BACKSTOP_DAYS`). A shift that started last night with nobody on it
 * is the most urgent row on the board, not a historical footnote — so it gets its
 * own reading rather than being lumped in with "future".
 */
export type DayRelation = "elapsed" | "today" | "tomorrow" | "future";

export interface DispatchDayGroup {
  /** `YYYY-MM-DD` — the grouping key, and the scroll anchor's id suffix. */
  key: string;
  relation: DayRelation;
  /** Tasks on this day, in the order they were handed in. */
  tasks: TaskItemDto[];
  /** How many of them still need a body — `needsWorkers`, the Unstaffed predicate. */
  unstaffed: number;
}

/**
 * The next calendar day after a `YYYY-MM-DD` key.
 *
 * Built through `Date.UTC` rather than local parts: this is pure calendar
 * arithmetic on a date-only key, and doing it in local time would let a DST
 * transition turn "tomorrow" into the same day again.
 */
function nextDayKey(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return next.toISOString().slice(0, 10);
}

function relate(key: string, todayKey: string): DayRelation {
  if (key < todayKey) return "elapsed";
  if (key === todayKey) return "today";
  if (key === nextDayKey(todayKey)) return "tomorrow";
  return "future";
}

/**
 * Folds a task list into one group per scheduled day, **soonest first**.
 *
 * The page already sorted on `scheduledDate` and printed it as a line of small
 * grey text under each card. This makes the sort key the structure instead, which
 * is the whole point of the v2 board: "which of these is urgent" becomes a glance
 * rather than a read.
 *
 * ⚠ **Group the list you are going to render, filter included.** The day rail is
 * drawn from this same return value, so rail and board can never disagree about
 * what a day holds — a day the current tab empties is absent from both. Computing
 * rail counts from the unfiltered set instead would put a "3" beside a day that
 * scrolls to nothing.
 *
 * Grouping is on `scheduledDate`, the server's own local calendar date, compared
 * as a string against `useTodayKey()`. `YYYY-MM-DD` sorts lexicographically in
 * date order, so nothing here parses a date or can drift by a timezone.
 *
 * `todayKey` is `""` until the clock is known. Groups still form — the day
 * headings are the real content — and every relation reads `future`, so nothing
 * is falsely marked urgent during that first pass.
 */
export function groupTasksByDay(
  tasks: TaskItemDto[],
  todayKey: string,
): DispatchDayGroup[] {
  const byKey = new Map<string, TaskItemDto[]>();
  for (const task of tasks) {
    const key = task.scheduledDate;
    const bucket = byKey.get(key);
    if (bucket) bucket.push(task);
    else byKey.set(key, [task]);
  }

  return [...byKey.keys()]
    .sort()
    .map((key) => {
      const dayTasks = byKey.get(key)!;
      return {
        key,
        relation: todayKey ? relate(key, todayKey) : ("future" as DayRelation),
        tasks: dayTasks,
        unstaffed: dayTasks.filter(needsWorkers).length,
      };
    });
}

/**
 * Whether a day should be drawn in the urgent register.
 *
 * Urgency is **time, not staffing** — the design's own words — so a day qualifies
 * on being now-or-past, and the count decides whether there is anything to be
 * urgent about. A fully-staffed today is not an alarm.
 */
export function isUrgentDay(group: DispatchDayGroup): boolean {
  return (
    (group.relation === "elapsed" || group.relation === "today") &&
    group.unstaffed > 0
  );
}
