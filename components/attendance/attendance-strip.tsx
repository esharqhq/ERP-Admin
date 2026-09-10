"use client";

import { AlertTriangle, Check, Clock, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { SummaryStrip, SummaryTile, type SummaryTone } from "@/components/ui/summary-strip";
import type { AttendanceCounts, AttendanceTab } from "@/lib/attendance/status";

/**
 * The band over the day: what a column of badges cannot say in one glance.
 *
 * Each tile carries a **definition** under its label — "arrived within the grace
 * window", "awaiting, overdue and no-show" — which is the thing the tabs above
 * cannot do, and the reason this is not a duplicate of them. `Not checked in` is
 * three different kinds added together and `Refused` is a different axis
 * altogether; the strip is where the day says which is which.
 *
 * Tiles **narrow**, matching the shipped `summary-strip` contract: clicking one
 * selects its tab. So the strip and the tabs are one control drawn twice rather
 * than two that can disagree.
 *
 * ⚠ **The left block is a ratio, not a rate.** `8 / 12`, never `67%`. There is no
 * stored attendance rate, no target and no contracted-hours field anywhere in this
 * response — the numerator and denominator are both counted in the browser from
 * the rows on screen, and a percentage would invite reading it as a measured
 * figure against a goal that does not exist.
 */

const TILES = [
  { key: "in", icon: Check, tone: "positive" },
  { key: "late", icon: Clock, tone: "warning" },
  { key: "missing", icon: EyeOff, tone: "critical" },
  { key: "refused", icon: AlertTriangle, tone: "critical" },
] as const satisfies readonly {
  key: AttendanceTab;
  icon: typeof Check;
  tone: SummaryTone;
}[];

export function AttendanceStrip({
  counts,
  tab,
  onSelect,
  isLoading,
}: {
  counts: AttendanceCounts;
  tab: AttendanceTab;
  onSelect: (tab: AttendanceTab) => void;
  isLoading?: boolean;
}) {
  const t = useTranslations("attendance.strip");
  const tTabs = useTranslations("attendance.tabs");

  return (
    <SummaryStrip
      label={t("arrivedLabel")}
      value={t("arrived", { arrived: counts.arrived, total: counts.all })}
      isLoading={isLoading}
    >
      {TILES.map(({ key, icon: Icon, tone }) => (
        <SummaryTile
          key={key}
          icon={<Icon className="size-4" />}
          title={tTabs(key)}
          detail={t(`${key}Caption`)}
          tone={tone}
          count={counts[key]}
          showCount
          action={tTabs(key)}
          on={tab === key}
          onClick={() => onSelect(tab === key ? "all" : key)}
        />
      ))}
    </SummaryStrip>
  );
}
