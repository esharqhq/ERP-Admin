"use client";

import { toast } from "sonner";

import type { GroupCancelOutcome } from "@/lib/tasks/cancel-outcome";

type Translate = (
  key: string,
  values?: Record<string, string | number | Date>,
) => string;

/**
 * Report a booking-cancel from what it actually did.
 *
 * ⚠⚠ The route's `204` is not a success message. `POST /api/tasks/admin/groups/
 * {id}/cancel` cancels the days that qualify and silently skips the rest,
 * answering `204` either way — and F-07 ·3 (2026-09-21) widened the per-day
 * window from one hour to three, so "nothing qualified" is now common. See
 * `lib/tasks/cancel-outcome.ts` for the reading.
 *
 * Shared by the task detail page and the walk-in order sheet: both offer the
 * same button, and two copies of this wording would drift into disagreeing
 * about what the same `204` meant.
 *
 * `t` is a `next-intl` translator scoped to `tasks`.
 */
export function toastGroupCancel(outcome: GroupCancelOutcome, t: Translate) {
  const { cancelled, remaining } = outcome;
  if (outcome.kind === "all") {
    toast.success(t("actions.resultAll", { cancelled }));
    return;
  }
  if (outcome.kind === "some") {
    toast.warning(t("actions.resultSome", { cancelled, remaining }));
    return;
  }
  if (outcome.kind === "none") {
    toast.warning(t("actions.resultNone", { remaining }));
    return;
  }
  toast.info(t("actions.resultUnknown"));
}
