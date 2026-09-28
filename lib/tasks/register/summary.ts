import { deriveTaskStatus } from "@/lib/tasks/derived-status";
import { rowStaffing } from "@/lib/tasks/dispatch-row";
import { isOpen } from "@/lib/tasks/staffing";
import type { TaskItemDto } from "@/lib/types/task.types";

export interface RegisterSummary { unstaffedToday: number; short: number; overdue: number; next7: number }

/**
 * The strip (spec §3·2), counted over the Dispatch window — independent of the
 * register's filters, so it always answers "what needs doing now", and equal to
 * what Dispatch shows because it reads the same cache.
 */
export function registerSummary(tasks: TaskItemDto[], now: Date): RegisterSummary {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const end = start + 7 * 86_400_000;
  const out = { unstaffedToday: 0, short: 0, overdue: 0, next7: 0 };
  for (const task of tasks) {
    const status = deriveTaskStatus(task, now);
    if (status === "Unstaffed") out.unstaffedToday++;
    if (status === "Overdue") out.overdue++;
    const at = new Date(task.scheduledAt).getTime();
    if (!isOpen(task) || Number.isNaN(at) || at < start || at >= end) continue;
    out.next7++;
    if (rowStaffing(task).gap > 0) out.short++;
  }
  return out;
}
