import {
  autoAcceptAt,
  instant,
  isStartPassed,
  lateWorkers,
} from "@/lib/tasks/detail/day-time";
import { activeWorkers } from "@/lib/tasks/staffing";
import { canonicalTaskStatus, type TaskStateKey } from "@/lib/tasks/status-vocab";
import type { TaskComplaintDto, TaskItemDto } from "@/lib/types/task.types";

/** The six day states plus `unknown`: the set is not closed (spec §4.1). */
export type DayTone = TaskStateKey | "unknown";

export function dayTone(task: Pick<TaskItemDto, "status">): DayTone {
  return canonicalTaskStatus(task.status) ?? "unknown";
}

export type NoteTone = "muted" | "warning" | "danger";

export interface DayNote {
  key:
    | "unfilled"
    | "fullyStaffed"
    | "startPassed"
    | "late"
    | "onSite"
    | "waitingOwner"
    | "disputed"
    | "closure"
    | "noReason"
    | "cancelled"
    | "none";
  tone: NoteTone;
  count?: number;
  at?: number | null;
  reason?: string;
}

/** The one-line note under a day's chip in the days list — spec §4.1. */
export function dayNote(task: TaskItemDto, now: number): DayNote {
  switch (canonicalTaskStatus(task.status)) {
    case "pending": {
      if (isStartPassed(task, now)) return { key: "startPassed", tone: "warning" };
      const filled = activeWorkers(task).length;
      const required = task.requiredWorkerCount;
      if (filled < required) {
        return { key: "unfilled", count: required - filled, tone: filled === 0 ? "danger" : "warning" };
      }
      return { key: "fullyStaffed", tone: "muted" };
    }
    case "checkedIn": {
      const late = lateWorkers(task, now).length;
      return late > 0
        ? { key: "late", count: late, tone: "warning" }
        : { key: "onSite", at: instant(task.startedAt), tone: "muted" };
    }
    case "inReview":
      return { key: "waitingOwner", tone: "muted" };
    case "rejected":
      return { key: "disputed", tone: "danger" };
    case "done":
      // ⚠ null is "closed before 2026-09-21", never "accepted".
      return task.closureReason
        ? { key: "closure", reason: task.closureReason, tone: "muted" }
        : { key: "noReason", tone: "muted" };
    case "cancelled":
      return { key: "cancelled", tone: "muted" };
    default:
      return { key: "none", tone: "muted" };
  }
}

/**
 * `{filled}/{required}` for a day row. `null` on a cancelled day (shown `–`).
 * Colour only while the day is open — a finished day's count is history, not a
 * to-do.
 */
export function dayStaffing(
  task: TaskItemDto,
): { filled: number; required: number; tone: NoteTone } | null {
  const state = canonicalTaskStatus(task.status);
  if (state === "cancelled") return null;
  const filled = activeWorkers(task).length;
  const required = task.requiredWorkerCount;
  const open = state === "pending" || state === "checkedIn";
  // `>=` first, as in `dayAlert`: a limit of 0 (or one lowered under the
  // assigned count) is staffed, not "nobody on it".
  const tone: NoteTone = !open || filled >= required ? "muted" : filled === 0 ? "danger" : "warning";
  return { filled, required, tone };
}

/** A message key under `tasks.detail.*`, or a word to print verbatim. */
export type Label = { key: string } | { raw: string };

const KNOWN_CLOSURES: ReadonlySet<string> = new Set([
  "OwnerAccepted",
  "AutoAccepted",
  "ClosedForced",
  "ClosedReplacement",
]);

/** Key under `tasks.detail.closure.*`; an unknown reason prints verbatim; null is "Closed". */
export function closureLabel(reason: string | null): Label {
  if (!reason) return { key: "closed" };
  return KNOWN_CLOSURES.has(reason) ? { key: reason } : { raw: reason };
}

export type StepState = "ok" | "current" | "todo" | "bad" | "badOpen" | "skip" | "cancel" | "off";

export type StepTime =
  | { kind: "at"; at: number }
  | { kind: "about"; at: number }
  | { kind: "auto"; at: number }
  | { kind: "beforeStart" }
  | { kind: "skipped" }
  | { kind: "none" };

export interface DayStep {
  label: Label;
  state: StepState;
  time: StepTime;
}

const NONE: StepTime = { kind: "none" };

function atTime(iso: string | null | undefined): StepTime {
  const t = instant(iso);
  return t === null ? NONE : { kind: "at", at: t };
}

/**
 * Step 4's time on a Done day. There is no `closedAt` (spec §2 #2), so only two
 * reasons have one: AutoAccepted (≈ hand-in + 5 h) and ClosedReplacement (the
 * ruling, from the per-day complaint read).
 */
function closedTime(task: TaskItemDto, complaint: TaskComplaintDto | null | undefined): StepTime {
  if (task.closureReason === "AutoAccepted") {
    const t = autoAcceptAt(task);
    return t === null ? NONE : { kind: "about", at: t };
  }
  if (task.closureReason === "ClosedReplacement") return atTime(complaint?.decidedAt);
  return NONE;
}

/** Scheduled → Checked in → Handed in → Closed — spec §4.2. Always four steps. */
export function daySteps(
  task: TaskItemDto,
  complaint: TaskComplaintDto | null | undefined,
): DayStep[] {
  const step = (key: string, state: StepState, time: StepTime = NONE): DayStep => ({
    label: { key },
    state,
    time,
  });
  const scheduled = (state: StepState) => step("scheduled", state, atTime(task.scheduledAt));

  switch (canonicalTaskStatus(task.status)) {
    case "pending":
      return [scheduled("current"), step("checkedIn", "todo"), step("handedIn", "todo"), step("closed", "todo")];
    case "checkedIn":
      return [
        scheduled("ok"),
        step("checkedIn", "current", atTime(task.startedAt)),
        step("handedIn", "todo"),
        step("closed", "todo"),
      ];
    case "inReview": {
      const auto = autoAcceptAt(task);
      return [
        scheduled("ok"),
        step("checkedIn", "ok", atTime(task.startedAt)),
        step("handedIn", "current", atTime(task.completedAt)),
        step("closed", "todo", auto === null ? NONE : { kind: "auto", at: auto }),
      ];
    }
    case "rejected":
      return [
        scheduled("ok"),
        step("checkedIn", "ok", atTime(task.startedAt)),
        step("handedInDisputed", "bad", atTime(task.completedAt)),
        step("awaitingRuling", "badOpen"),
      ];
    case "done": {
      const handed = instant(task.completedAt);
      return [
        scheduled("ok"),
        step("checkedIn", "ok", atTime(task.startedAt)),
        handed === null
          ? step("handedIn", "skip", { kind: "skipped" })
          : step("handedIn", "ok", { kind: "at", at: handed }),
        { label: closureLabel(task.closureReason), state: "ok", time: closedTime(task, complaint) },
      ];
    }
    case "cancelled":
      return [
        scheduled("ok"),
        step("cancelled", "cancel", task.startedAt ? atTime(task.startedAt) : { kind: "beforeStart" }),
        step("handedIn", "off"),
        step("closed", "off"),
      ];
    default:
      return [step("scheduled", "todo"), step("checkedIn", "todo"), step("handedIn", "todo"), step("closed", "todo")];
  }
}
