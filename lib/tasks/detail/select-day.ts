import { lateWorkers } from "@/lib/tasks/detail/day-time";
import { canonicalTaskStatus } from "@/lib/tasks/status-vocab";
import type { TaskItemDto } from "@/lib/types/task.types";

export function sortDays(tasks: TaskItemDto[]): TaskItemDto[] {
  return [...tasks].sort(
    (a, b) =>
      a.scheduledDate.localeCompare(b.scheduledDate) ||
      a.scheduledAt.localeCompare(b.scheduledAt),
  );
}

/**
 * The day the panel opens on when `?day=` names none — spec §3, needs-attention
 * first: disputed → late check-in → in review → today → next upcoming → last.
 * `todayKey === ""` (no clock yet) skips the two date rungs.
 */
export function pickDefaultDay(
  tasks: TaskItemDto[],
  now: number,
  todayKey: string,
): string | null {
  const days = sortDays(tasks);
  if (days.length === 0) return null;
  const find = (p: (t: TaskItemDto) => boolean) => days.find(p)?.id;
  return (
    find((t) => canonicalTaskStatus(t.status) === "rejected") ??
    find((t) => lateWorkers(t, now).length > 0) ??
    find((t) => canonicalTaskStatus(t.status) === "inReview") ??
    (todayKey ? find((t) => t.scheduledDate === todayKey) : undefined) ??
    (todayKey ? find((t) => t.scheduledDate > todayKey) : undefined) ??
    days[days.length - 1].id
  );
}

/**
 * The id to write into `?day=`, or `null` for nothing to do. Pins the resolved
 * day whenever the URL does not already name it — missing, or naming a day not
 * in this booking — so the panel never re-picks on a clock tick or a refetch.
 * Never before the clock is known (`now <= 0`): the default could still move.
 */
export function dayToPin(dayParam: string | null, selectedId: string | null, now: number): string | null {
  if (now <= 0 || !selectedId) return null;
  return dayParam === selectedId ? null : selectedId;
}

/** `?day=` when it names a day of this booking, else the default. */
export function resolveSelectedDay(
  tasks: TaskItemDto[],
  dayParam: string | null,
  now: number,
  todayKey: string,
): TaskItemDto | null {
  const hit = dayParam ? tasks.find((t) => t.id === dayParam) : undefined;
  if (hit) return hit;
  const id = pickDefaultDay(tasks, now, todayKey);
  return tasks.find((t) => t.id === id) ?? null;
}
