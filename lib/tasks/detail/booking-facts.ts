import { instant, localMinuteOfDay } from "@/lib/tasks/detail/day-time";
import { sortDays } from "@/lib/tasks/detail/select-day";
import { canonicalTaskStatus, type TaskStateKey } from "@/lib/tasks/status-vocab";
import type { TaskGroupDto, TaskItemDto } from "@/lib/types/task.types";

/** One day only: no rail, no days list (spec §3). */
export function isSingleDay(group: Pick<TaskGroupDto, "kind" | "tasks">): boolean {
  return group.kind === "SingleTask" || (group.tasks ?? []).length === 1;
}

/** Legend counts — from the tasks, the same source as the rail, so the two agree. */
export function legendCounts(tasks: TaskItemDto[]): Record<TaskStateKey, number> {
  const counts: Record<TaskStateKey, number> = {
    pending: 0,
    checkedIn: 0,
    inReview: 0,
    rejected: 0,
    done: 0,
    cancelled: 0,
  };
  for (const t of tasks) {
    const s = canonicalTaskStatus(t.status);
    if (s) counts[s] += 1;
  }
  return counts;
}

/**
 * The design's "Booking cancelled" condition, plus `rejected == 0`. Worded
 * neutrally in the UI ("No days left to run") — the same counts come from one
 * owner-cancelled or self-cancelled day, and nothing says which (spec §7).
 */
export function isNothingLeftToRun(group: Pick<TaskGroupDto, "days">): boolean {
  const d = group.days;
  if (!d) return false;
  return d.cancelled > 0 && d.pending === 0 && d.checkedIn === 0 && d.inReview === 0 && d.rejected === 0;
}

export type WindowFact =
  | { kind: "same"; start: number; end: number | null }
  | { kind: "varies" }
  | { kind: "none" };

/**
 * The header's time window, from the day INSTANTS — never `defaultStartTime`,
 * which carries no zone and disagrees with them for a viewer outside Berlin.
 * Compared by local wall clock; cancelled days are ignored unless all are.
 */
export function windowFact(tasks: TaskItemDto[]): WindowFact {
  const live = tasks.filter((t) => canonicalTaskStatus(t.status) !== "cancelled");
  const pool = sortDays(live.length > 0 ? live : tasks);
  if (pool.length === 0) return { kind: "none" };
  const signature = (t: TaskItemDto): string | null => {
    const s = instant(t.scheduledAt);
    if (s === null) return null;
    const e = instant(t.deadline);
    return `${localMinuteOfDay(s)}-${e === null ? "" : localMinuteOfDay(e)}`;
  };
  const first = signature(pool[0]);
  if (first === null) return { kind: "none" };
  if (pool.some((t) => signature(t) !== first)) return { kind: "varies" };
  return { kind: "same", start: instant(pool[0].scheduledAt)!, end: instant(pool[0].deadline) };
}

/** The time-window fact's sub-line key — none unless every live day shares one window. */
export function windowSubKey(win: WindowFact, single: boolean): "eightHours" | "oneDay" | "everyDay" | null {
  if (win.kind !== "same") return null;
  if (win.end === null) return "eightHours";
  return single ? "oneDay" : "everyDay";
}

export function workersFact(tasks: TaskItemDto[]): { min: number; max: number } | null {
  if (tasks.length === 0) return null;
  const counts = tasks.map((t) => t.requiredWorkerCount);
  return { min: Math.min(...counts), max: Math.max(...counts) };
}

export function datesFact(
  tasks: TaskItemDto[],
): { first: string; last: string; count: number } | null {
  if (tasks.length === 0) return null;
  const sorted = sortDays(tasks);
  return {
    first: sorted[0].scheduledDate,
    last: sorted[sorted.length - 1].scheduledDate,
    count: sorted.length,
  };
}

export type Place = { kind: "walkIn" } | { kind: "text"; text: string } | { kind: "none" };

/**
 * The `{place}` half of the header line. A walk-in order's own address cannot be
 * read back (`f-02b-6` §4.2), so it says so instead of printing the placeholder
 * property's address.
 */
export function headerPlace(input: {
  isWalkIn: boolean | null;
  address?: string | null;
  /** The name to show, in the viewer's locale. */
  cityName?: string | null;
  /** Every name the city goes by (`nameDe`, `nameEn`) — an address holding either is not suffixed. */
  cityNames?: (string | null | undefined)[];
  propertyName?: string | null;
}): Place {
  if (input.isWalkIn === true) return { kind: "walkIn" };
  const address = input.address?.trim();
  if (address) {
    const city = input.cityName?.trim();
    const names = [city, ...(input.cityNames ?? [])].map((n) => n?.trim()).filter((n): n is string => !!n);
    const named = names.some((n) => address.toLocaleLowerCase().includes(n.toLocaleLowerCase()));
    const text = city && !named ? `${address} ${city}` : address;
    return { kind: "text", text };
  }
  const name = input.propertyName?.trim();
  return name ? { kind: "text", text: name } : { kind: "none" };
}
