"use client";

import { AlertTriangle, CalendarPlus, Clock, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { SummaryStrip, SummaryTile } from "@/components/ui/summary-strip";
import type { RegisterSummary } from "@/lib/tasks/register/summary";
import type { RegisterTab } from "@/lib/tasks/register/filters";

/**
 * Four counts over the Dispatch window (spec §3·2), independent of the band's
 * filters. A tile turns on the matching saved view.
 */
export function RegisterStrip({
  summary, isLoading, onPick, active,
}: {
  summary: RegisterSummary;
  isLoading: boolean;
  onPick: (target: RegisterTab | "overdue") => void;
  /** The view a tile would turn on is already on — the tile says why the list is short. */
  active?: RegisterTab | "overdue" | null;
}) {
  const t = useTranslations("tasks.register.strip");
  const total = summary.next7 + summary.overdue;
  return (
    <SummaryStrip label={t("label")} value={String(total)} isLoading={isLoading}>
      <SummaryTile icon={<AlertTriangle className="size-4" />} tone="critical" count={summary.unstaffedToday}
        title={t("unstaffed.title", { count: summary.unstaffedToday })} detail={t("unstaffed.detail")}
        action={t("unstaffed.action")} on={active === "unstaffed"} onClick={() => onPick("unstaffed")} />
      <SummaryTile icon={<UserPlus className="size-4" />} tone="warning" count={summary.short}
        title={t("short.title", { count: summary.short })} detail={t("short.detail")}
        action={t("short.action")} on={active === "short"} onClick={() => onPick("short")} />
      <SummaryTile icon={<Clock className="size-4" />} tone="neutral" count={summary.overdue}
        title={t("overdue.title", { count: summary.overdue })} detail={t("overdue.detail")}
        action={t("overdue.action")} on={active === "overdue"} onClick={() => onPick("overdue")} />
      <SummaryTile icon={<CalendarPlus className="size-4" />} tone="neutral" count={summary.next7}
        title={t("next7.title", { count: summary.next7 })} detail={t("next7.detail")}
        action={t("next7.action")} on={active === "next7"} onClick={() => onPick("next7")} />
    </SummaryStrip>
  );
}
