"use client";

import { AlertTriangle, Briefcase, Clock, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  SummaryStrip,
  SummaryTile,
  type SummaryTone,
} from "@/components/ui/summary-strip";

/**
 * The band over the board: what a page of rows cannot say about a fortnight of
 * tasks.
 *
 * ⚠ **This is not a duplicate of the tabs, and an earlier pass removed it for
 * exactly that wrong reason.** Each tile carries a *definition* under its
 * title — "open, nobody on it", "at least one gap", "Pending or Active" — and the
 * tabs cannot: a tab is a word and a number. Unstaffed and Short are two
 * different arithmetic questions about the same row, and the strip is where the
 * board says which is which.
 *
 * Tiles also **narrow**, matching the shipped `summary-strip` contract: clicking
 * one selects its tab. So the two controls are one control drawn twice, never two
 * that can disagree — the only reading that made the earlier duplication a real
 * problem.
 *
 * `startsToday` is the exception: it names a *day*, not a staffing predicate, and
 * has no tab. It stays read-only rather than inventing a fifth tab for it.
 */

export interface DispatchStripCounts {
  needsWorkers: number;
  short: number;
  open: number;
  startsToday: number;
  total: number;
}

const TILES = [
  { key: "needsWorkers", icon: AlertTriangle, tone: "critical" },
  { key: "short", icon: UserPlus, tone: "warning" },
  { key: "open", icon: Briefcase, tone: "positive" },
  { key: "startsToday", icon: Clock, tone: "neutral" },
] as const;

export function DispatchStrip({
  counts,
  isLoading,
  activeTab,
  onTab,
  todayLabel,
}: {
  counts: DispatchStripCounts;
  isLoading?: boolean;
  /** Which tab is lit, so the matching tile shows itself as the one narrowing. */
  activeTab: string;
  /** `null` for a tile that does not own a tab. */
  onTab: (key: string) => void;
  /** The `startsToday` tile's detail line is the date itself. */
  todayLabel: string;
}) {
  const t = useTranslations("dispatch.strip");

  return (
    <SummaryStrip
      label={t("inTheQueue")}
      value={t("queueCount", { count: counts.total })}
      isLoading={isLoading}
    >
      {TILES.map(({ key, icon: Icon, tone }) => {
        const owned = key !== "startsToday";
        return (
          <SummaryTile
            key={key}
            icon={<Icon className="size-[17px]" />}
            title={t(`${key}.title`)}
            detail={key === "startsToday" ? todayLabel : t(`${key}.detail`)}
            action=""
            showCount
            tone={tone as SummaryTone}
            count={counts[key]}
            on={owned && activeTab === key}
            onClick={owned ? () => onTab(key) : undefined}
          />
        );
      })}
    </SummaryStrip>
  );
}
