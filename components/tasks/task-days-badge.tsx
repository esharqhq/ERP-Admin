"use client";

import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { groupBucket, isGroupActive, settledDays } from "@/lib/tasks/staffing";
import type { TaskGroupDto } from "@/lib/types/task.types";

/**
 * A booking's state, as its day counts.
 *
 * ⚠ Replaces `<TaskStatusBadge status={group.status} />` at all four booking
 * sites. F-07 ·0 (2026-09-17) deleted `TaskGroupDto.status`, so those badges had
 * no input left and rendered `—`. The counts say what the single word could not:
 * a booking is rarely in one state, and *"4 / 5 days"* is the sentence the word
 * kept everybody from writing.
 *
 * ⚠ Deliberately applied to all four at once — the tasks list, the task detail,
 * the walk-in order sheet and the walk-in orders list. Two of them showing counts
 * and two showing nothing is worse than either.
 */
export function TaskDaysBadge({ group }: { group: TaskGroupDto }) {
  const t = useTranslations("tasks.dayCounts");
  const total = group.days?.total ?? 0;

  // A booking the server sent without counts. Saying nothing is better than
  // printing "0 / 0 days", which reads as a booking with no work in it.
  if (total <= 0) return <Badge variant="outline">—</Badge>;

  const settled = settledDays(group);
  const bucket = groupBucket(group);
  const tone =
    bucket === "Cancelled" ? "danger" : isGroupActive(group) ? "success" : "neutral";

  return (
    <Badge tone={tone} title={t(`bucket.${bucket}`)}>
      {t("settledOfTotal", { settled, total })}
    </Badge>
  );
}
