import { activeWorkers } from "@/lib/tasks/staffing";
import { canonicalTaskStatus } from "@/lib/tasks/status-vocab";
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
 *
 * ⚠ The day state is read through `canonicalTaskStatus`, never by exact string
 * equality. F-07 ·0 (2026-09-17) renamed `Active` → `CheckedIn` and
 * `Review` → `InReview`; against the raw words an `InReview` day past its
 * deadline read `Overdue` and a `CheckedIn` day read `Open`. Nothing renders
 * this function today (`components/dispatch/dispatch-task-row.tsx:24` uses the
 * raw status on purpose), so that was a landmine rather than an outage — it is
 * defused here with the rest of the vocabulary.
 */
export function deriveTaskStatus(
  task: TaskItemDto,
  now: Date = new Date(),
): DerivedTaskStatus {
  const state = canonicalTaskStatus(task.status);
  if (state === "cancelled") return "Cancelled";
  if (state === "done") return "Done";
  if (state === "inReview") return "Review";
  // No `state !== "done"` guard: the `done` arm above already returned, so with
  // the state read through `canonicalTaskStatus` the compiler proves it dead.
  // (The raw-string version needed it because `"Done"` and `"done"` were two
  // different comparisons.)
  if (task.deadline && new Date(task.deadline) < now) {
    return "Overdue";
  }
  if (activeWorkers(task).length === 0 && isToday(task.scheduledAt, now)) {
    return "Unstaffed";
  }
  if (state === "checkedIn") return "Running";
  if (
    activeWorkers(task).length >= task.requiredWorkerCount &&
    new Date(task.scheduledAt) > now
  ) {
    return "Scheduled";
  }
  return "Open";
}
