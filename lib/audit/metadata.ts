/**
 * What an audit-log row is *about* — read out of its `metadata`.
 *
 * `AuditLogEntryDto.metadata` is a JSON-encoded **string**, not an object, and
 * it has no fixed contract across actions: `AuditService.Record` serializes
 * whatever anonymous object the writer passed (default `JsonSerializer`, so
 * camelCase keys and nulls kept), or `"{}"` when it passed none. So this reads
 * only the actions it knows, and an unknown action yields no facts rather than
 * a dump of keys nobody has named.
 */

/** A fact the row renders under its action label. */
export type AuditFact =
  /** A calendar day, `YYYY-MM-DD` as sent (a C# `DateOnly`). */
  | { kind: "date"; key: "scheduledDate"; value: string }
  /** A locale-free in-app path — `Link` from `@/i18n/navigation` adds the prefix. */
  | { kind: "link"; key: "task" | "taskGroup" | "clonedFrom"; href: string }
  /**
   * What the admin assigned *past* (F-07 ·9a / ·9b). One fact however many
   * there are, so the row carries at most one badge by construction.
   */
  | { kind: "overrides"; keys: AuditOverride[] };

/** `availability` — the worker had marked that day off; `location` — a different city. */
export type AuditOverride = "availability" | "location";

/**
 * Letters and digits only, lowercased: the wire sends C# member names
 * (`WorkerTaskAssigned`) while the message keys are `WORKER_TASK_ASSIGNED`.
 */
export function normalizeAction(action: string): string {
  return action.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

/** Safe parse — anything but a plain JSON object (malformed, string, array…) is `null`. */
export function parseAuditMetadata(
  raw: string | null,
): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    // Not JSON is not an error worth showing an admin — the action and time are
    // still true without it.
    return null;
  }
}

const WORKER_TASK_ASSIGNED = normalizeAction("WorkerTaskAssigned"); // 113
const TASK_GROUP_CREATED_BY_ADMIN = normalizeAction("TaskGroupCreatedByAdmin"); // 65

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

function idOf(meta: Record<string, unknown>, key: string): string | null {
  const v = meta[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/** The facts worth a line under the row, for the actions that carry any. */
export function auditDetails(
  action: string,
  meta: Record<string, unknown> | null,
): AuditFact[] {
  if (!meta) return [];
  const facts: AuditFact[] = [];
  const norm = normalizeAction(action);

  if (norm === WORKER_TASK_ASSIGNED) {
    // Written on every admin assign, both flags included when false — so the
    // chip is gated on `=== true`, not on the key being there. A row from before
    // ·9b has no `overrodeLocation` at all.
    const keys: AuditOverride[] = [];
    if (meta.overrodeAvailability === true) keys.push("availability");
    if (meta.overrodeLocation === true) keys.push("location");
    if (keys.length) facts.push({ kind: "overrides", keys });

    const day = meta.scheduledDate;
    if (typeof day === "string" && DAY_KEY.test(day)) {
      facts.push({ kind: "date", key: "scheduledDate", value: day });
    }
    const taskId = idOf(meta, "taskId");
    if (taskId) {
      facts.push({
        kind: "link",
        key: "task",
        href: `/dashboard/tasks/day/${encodeURIComponent(taskId)}`,
      });
    }
  } else if (norm === TASK_GROUP_CREATED_BY_ADMIN) {
    const groupId = idOf(meta, "taskGroupId");
    if (groupId) {
      facts.push({
        kind: "link",
        key: "taskGroup",
        href: `/dashboard/tasks/${encodeURIComponent(groupId)}`,
      });
    }
    // F-07 ·10 — the key is on every create, `null` unless it was a clone.
    const sourceId = idOf(meta, "clonedFromTaskGroupId");
    if (sourceId) {
      facts.push({
        kind: "link",
        key: "clonedFrom",
        href: `/dashboard/tasks/${encodeURIComponent(sourceId)}`,
      });
    }
  }

  return facts;
}
