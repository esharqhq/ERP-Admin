import { activeWorkers } from "@/lib/tasks/staffing";
import type { TaskItemDto } from "@/lib/types/task.types";

export type DerivedTaskStatus =
  | "Open"
  | "Scheduled"
  | "Running"
  | "Review"
  | "Done"
  | "Unstaffed"
  | "Overdue"
  | "Cancelled";

function isToday(iso: string, now: Date): boolean {
  const d = new Date(iso);
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/**
 * Takes the full `TaskItemDto` rather than a `Pick` of it: `activeWorkers`
 * (lib/tasks/staffing.ts) is typed to that full shape, and narrowing the
 * parameter here would need an unsafe cast at every call site just to satisfy
 * it. Callers that only have a partial shape (tests) build a full fixture and
 * cast it, per the existing test convention in staffing.test.ts.
 */
export function deriveTaskStatus(
  task: TaskItemDto,
  now: Date = new Date(),
): DerivedTaskStatus {
  if (task.status === "Cancelled") return "Cancelled";
  if (task.status === "Done") return "Done";
  if (task.status === "Review") return "Review";
  if (task.deadline && new Date(task.deadline) < now && task.status !== "Done") {
    return "Overdue";
  }
  if (activeWorkers(task).length === 0 && isToday(task.scheduledAt, now)) {
    return "Unstaffed";
  }
  if (task.status === "Active") return "Running";
  if (
    activeWorkers(task).length >= task.requiredWorkerCount &&
    new Date(task.scheduledAt) > now
  ) {
    return "Scheduled";
  }
  return "Open";
}
