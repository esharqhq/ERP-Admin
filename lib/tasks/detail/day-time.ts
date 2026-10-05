import { activeWorkers } from "@/lib/tasks/staffing";
import { canonicalTaskStatus } from "@/lib/tasks/status-vocab";
import type { TaskItemDto, TaskWorkerDto } from "@/lib/types/task.types";

export const HOUR_MS = 3_600_000;

/** `task-lifecycle.md` §0d — a handed-in day nobody reviews accepts itself after five hours. */
export const AUTO_ACCEPT_MS = 5 * HOUR_MS;

/** §0d — "the work window" ends at the day's `deadline`, or 8 hours after its start. */
export const DEFAULT_WINDOW_MS = 8 * HOUR_MS;

/** An ISO instant as epoch ms, or `null` for absent or unparseable. */
export function instant(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : t;
}

export function windowEndAt(task: Pick<TaskItemDto, "scheduledAt" | "deadline">): number | null {
  const end = instant(task.deadline);
  if (end !== null) return end;
  const start = instant(task.scheduledAt);
  return start === null ? null : start + DEFAULT_WINDOW_MS;
}

/**
 * When an `InReview` day accepts itself. ⚠ Approximate: the job ticks every
 * 5 minutes (§0d), so the UI always words it "about"/"≈".
 */
export function autoAcceptAt(task: Pick<TaskItemDto, "completedAt">): number | null {
  const handed = instant(task.completedAt);
  return handed === null ? null : handed + AUTO_ACCEPT_MS;
}

/** Minutes since local midnight — compares two days' windows by wall clock. */
export function localMinuteOfDay(ms: number): number {
  const d = new Date(ms);
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * Active workers not checked in on a `CheckedIn` day whose start has passed —
 * design 2a. ⚠ Never a No-show verdict: marking one is an admin decision.
 * `now === 0` is the unknown server-pass clock and decides nothing.
 */
export function lateWorkers(task: TaskItemDto, now: number): TaskWorkerDto[] {
  if (now <= 0) return [];
  if (canonicalTaskStatus(task.status) !== "checkedIn") return [];
  const start = instant(task.scheduledAt);
  if (start === null || now <= start) return [];
  return activeWorkers(task).filter((w) => !w.checkinAt);
}

/**
 * A `Pending` day whose start has passed and nobody has checked in. Not in the
 * design; it is the §0d timer state, where the day cancels itself at window end.
 */
export function isStartPassed(task: TaskItemDto, now: number): boolean {
  if (now <= 0) return false;
  if (canonicalTaskStatus(task.status) !== "pending") return false;
  const start = instant(task.scheduledAt);
  return start !== null && now > start;
}

export function workerLabel(w: Pick<TaskWorkerDto, "workerName" | "workerId">): string {
  return w.workerName?.trim() || w.workerId.slice(0, 8);
}

/**
 * Two avatar letters. A leading `[…]` tag (the demo seed's `[DEMO] `) is skipped,
 * and only letters count — "[DEMO] Oliver Smith" is "OS", not "[O".
 */
export function workerInitials(name: string): string {
  const words = name.replace(/^\s*\[[^\]]*\]\s*/, "").split(/\s+/);
  const letters = words
    .map((w) => w.match(/\p{L}/u)?.[0])
    .filter((c): c is string => !!c)
    .slice(0, 2);
  return letters.length ? letters.join("").toUpperCase() : "–";
}

export function formatHm(ms: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(ms);
}

/** `"yyyy-MM-dd"` → a local Date at midnight. `scheduledDate` is a local calendar date. */
function dateFromKey(key: string): Date | null {
  const [y, m, d] = key.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** "Tue, 29 Sep 2026". */
export function formatDayLong(key: string, locale: string): string {
  const d = dateFromKey(key);
  if (!d) return key;
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

/** `{ wd: "Tue", dd: "29" }` for the rail and the days list. */
export function formatDayParts(key: string, locale: string): { wd: string; dd: string } {
  const d = dateFromKey(key);
  if (!d) return { wd: "", dd: key };
  return {
    wd: new Intl.DateTimeFormat(locale, { weekday: "short" }).format(d),
    dd: String(d.getDate()).padStart(2, "0"),
  };
}

export function formatDateTime(iso: string | null, locale: string): string {
  const t = instant(iso);
  if (t === null) return "–";
  return new Date(t).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
}
