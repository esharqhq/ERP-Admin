"use client";

import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { canonicalTaskStatus, type TaskStateKey } from "@/lib/tasks/status-vocab";

/**
 * The five day states as a chip.
 *
 * ⚠ Reads the state through `canonicalTaskStatus`, not through a lowercased
 * string compare. F-07 ·0 (2026-09-17) renamed `Active` → `CheckedIn` and
 * `Review` → `InReview`; against the old compare both fell to the neutral
 * variant and printed the server's raw English word.
 *
 * Tones rather than variants, because this file's neighbour `components/ui/
 * badge.tsx` says tones are the vocabulary for exactly these meanings — a day
 * state is a meaning, not a presentation choice.
 */
const TONES: Record<TaskStateKey, "success" | "warning" | "info" | "neutral" | "danger"> = {
  pending: "warning",
  checkedIn: "success",
  inReview: "info",
  done: "neutral",
  cancelled: "danger",
};

export function TaskStatusBadge({ status }: { status: string | null | undefined }) {
  const t = useTranslations("tasks.dayStates");
  const state = canonicalTaskStatus(status);

  // ⚠ Keep this arm. The day states are not a closed set — ·5 adds a disputed
  // one — and printing the unrecognised word verbatim is honest, where guessing
  // one of the five would state something false.
  if (!state) return <Badge variant="outline">{status || "—"}</Badge>;

  return <Badge tone={TONES[state]}>{t(state)}</Badge>;
}
