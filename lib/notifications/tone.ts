// lib/notifications/tone.ts

import type { NotificationType } from "@/lib/types/notification.types";

export type NotificationTone = "critical" | "warning";

/**
 * Which bell rows carry an urgency mark — F-07 ·8's two staffing rungs, and
 * nothing else. Every other row stays plain: marking many kinds would teach the
 * admin to ignore the mark.
 *
 * - **83 `TaskStaffingCritical`** — short-handed under six hours to start; the
 *   backend also opens an Urgent support ticket.
 * - **82 `TaskStaffingWarning`** — short-handed under 24 hours.
 * - **19 `TaskUnderstaffed`** — retired on 2026-09-22 (no emitter, never
 *   reused), but real inboxes still hold its rows, and it meant the same thing.
 *
 * ⚠ 82 is not a guaranteed precursor to 83 (`notification-bell.md`, F-07 ·8):
 * a day can skip straight to 83, so the two are marked independently.
 */
export function notificationTone(type: NotificationType): NotificationTone | null {
  switch (type) {
    case "TaskStaffingCritical":
      return "critical";
    case "TaskStaffingWarning":
    case "TaskUnderstaffed":
      return "warning";
    default:
      return null;
  }
}
