import type { DerivedTaskStatus } from "@/lib/tasks/derived-status";
import type { RegisterRow } from "@/lib/tasks/register/rows";

/** What needs a person first — the order the design's Status sort reads in. */
const STATUS_ORDER: DerivedTaskStatus[] = [
  "Unstaffed", "Overdue", "Disputed", "Open", "Running", "Review", "Scheduled", "Done", "Cancelled",
];

export function compareSchedule(a: RegisterRow, b: RegisterRow): number {
  const an = Number.isNaN(a.startMs), bn = Number.isNaN(b.startMs);
  if (an || bn) return an === bn ? 0 : an ? 1 : -1;
  return a.startMs - b.startMs;
}

export function compareStatus(a: RegisterRow, b: RegisterRow): number {
  const ai = STATUS_ORDER.indexOf(a.status), bi = STATUS_ORDER.indexOf(b.status);
  return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || compareSchedule(a, b);
}

/** Biggest shortfall first — "ascending" here means most urgent. */
export function compareStaffing(a: RegisterRow, b: RegisterRow): number {
  return b.staffing.gap - a.staffing.gap || compareSchedule(a, b);
}
