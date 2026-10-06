import {
  autoAcceptAt,
  instant,
  isStartPassed,
  lateWorkers,
  windowEndAt,
  workerLabel,
} from "@/lib/tasks/detail/day-time";
import { cancelHow, type CancelHow } from "@/lib/tasks/detail/day-view";
import { activeWorkers } from "@/lib/tasks/staffing";
import { canonicalTaskStatus } from "@/lib/tasks/status-vocab";
import type { TaskComplaintDto, TaskItemDto } from "@/lib/types/task.types";

export type AlertTone = "critical" | "warning" | "positive" | "neutral";

/**
 * At most one alert per day — spec §4.3. Values are data (ms, counts, names);
 * the component formats and words them, so nothing here is a sentence.
 */
export type DayAlert =
  | { kind: "complaint"; tone: "critical"; reason: string; photos: number; raisedAt: number | null }
  | { kind: "complaintUnloaded"; tone: "critical" }
  | { kind: "late"; tone: "warning"; names: string[]; minutes: number }
  | { kind: "startPassed"; tone: "warning"; cancelsAt: number | null }
  | { kind: "waitingOwner"; tone: "warning"; handedAt: number | null; autoAt: number | null }
  | { kind: "upheld"; tone: "critical"; note: string | null; by: string | null; at: number | null }
  | { kind: "forced"; tone: "neutral"; note: string | null; by: string | null; at: number | null }
  | { kind: "autoAccepted"; tone: "neutral"; at: number | null }
  | { kind: "legacyClosed"; tone: "neutral" }
  | { kind: "unknownReason"; tone: "neutral"; reason: string }
  | { kind: "noWorkers"; tone: "critical"; required: number; startsAt: number | null }
  | { kind: "understaffed"; tone: "warning"; open: number; required: number; startsAt: number | null }
  | { kind: "ready"; tone: "positive"; required: number }
  | { kind: "cancelled"; tone: "neutral"; how: CancelHow | null; at: number | null };

export function dayAlert(
  task: TaskItemDto,
  complaint: TaskComplaintDto | null | undefined,
  now: number,
): DayAlert | null {
  switch (canonicalTaskStatus(task.status)) {
    case "rejected":
      // ⚠ `complaint` rides only on `GET /api/tasks/{id}`; the booking's nested
      // tasks always carry null. "Disputed" is read from the status, never from it.
      return complaint
        ? {
            kind: "complaint",
            tone: "critical",
            reason: complaint.reason,
            photos: complaint.photos?.length ?? 0,
            raisedAt: instant(complaint.raisedAt),
          }
        : { kind: "complaintUnloaded", tone: "critical" };

    case "checkedIn": {
      const late = lateWorkers(task, now);
      if (late.length === 0) return null;
      const start = instant(task.scheduledAt) ?? now;
      return {
        kind: "late",
        tone: "warning",
        names: late.map(workerLabel),
        minutes: Math.floor((now - start) / 60_000),
      };
    }

    case "pending": {
      if (isStartPassed(task, now)) {
        return { kind: "startPassed", tone: "warning", cancelsAt: windowEndAt(task) };
      }
      const filled = activeWorkers(task).length;
      const required = task.requiredWorkerCount;
      const startsAt = instant(task.scheduledAt);
      // `>=` first: a PATCH can lower the limit under the assigned count, and a
      // limit of 0 with nobody on it is not "no workers".
      if (filled >= required) return { kind: "ready", tone: "positive", required };
      if (filled === 0) return { kind: "noWorkers", tone: "critical", required, startsAt };
      return { kind: "understaffed", tone: "warning", open: required - filled, required, startsAt };
    }

    case "inReview":
      return {
        kind: "waitingOwner",
        tone: "warning",
        handedAt: instant(task.completedAt),
        autoAt: autoAcceptAt(task),
      };

    case "done":
      switch (task.closureReason) {
        case null:
          // ⚠ Closed before 2026-09-21 — never guessed as "accepted".
          return { kind: "legacyClosed", tone: "neutral" };
        case "OwnerAccepted":
          return null;
        case "AutoAccepted":
          return { kind: "autoAccepted", tone: "neutral", at: instant(task.closedAt) };
        case "ClosedForced":
          // §0k·1: the admin's words, name and time. ⚠ Also the shape of a complaint
          // decided for the workers (§0e: SidedWithWorker → ClosedForced), so the
          // wording stays neutral — "closed by an admin", not "force-closed".
          return {
            kind: "forced",
            tone: "neutral",
            note: task.closureNote?.trim() || null,
            by: task.closedByAdminName?.trim() || null,
            at: instant(task.closedAt),
          };
        case "ClosedReplacement":
          // The server's facts first; the complaint read only fills a row closed
          // before the 2026-10-06 backfill reached it.
          return {
            kind: "upheld",
            tone: "critical",
            note: task.closureNote?.trim() || complaint?.decisionNote?.trim() || null,
            by: task.closedByAdminName?.trim() || null,
            at: instant(task.closedAt) ?? instant(complaint?.decidedAt),
          };
        default:
          return { kind: "unknownReason", tone: "neutral", reason: task.closureReason };
      }

    case "cancelled":
      // §0k·2: when, and which road — never the owner's typed reason.
      return { kind: "cancelled", tone: "neutral", how: cancelHow(task.cancellationReason), at: instant(task.cancelledAt) };

    default:
      return null;
  }
}
