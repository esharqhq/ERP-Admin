"use client";

import { Ban, History, EyeOff, Inbox } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  SummaryStrip as Strip,
  SummaryTile,
} from "@/components/ui/summary-strip";
import {
  WORKER_SUMMARY_TILES,
  isTileActive,
  toggleTileFilter,
  type WorkerSummaryCounts,
} from "@/lib/workers/summary";

/**
 * What a page of 25 rows cannot tell you about 312 workers: how many are waiting
 * on a decision, how many are sanctioned, how many have lost cover, and how many
 * never arrived at all.
 *
 * Every tile narrows the table below by writing its own filter into the URL, so a
 * click is a shareable link and the filter chips can clear it again. Clicking the
 * lit tile clears it — see `toggleTileFilter`.
 *
 * The counts come from four `pageSize=1` probes (`useWorkerSummary`) because there
 * is no counts endpoint. A probe that fails or is refused reports `0`, and a zero
 * tile draws as cleared and colourless with no action — which is the right reading
 * for a number that never arrived.
 */

const ICON = {
  review: Inbox,
  blocked: Ban,
  lapsed: History,
  neverSeen: EyeOff,
} as const;

export function WorkersSummaryStrip({
  total,
  counts,
  isLoading,
  filters,
  onFilters,
}: {
  /** Everyone on the platform — the table's own unfiltered total. */
  total: number;
  counts: WorkerSummaryCounts;
  isLoading?: boolean;
  /** The live filter bag, so a tile can show that it is the one narrowing. */
  filters: Record<string, string>;
  /** Several keys in one write — a tile can own more than one. */
  onFilters: (patch: Record<string, string>) => void;
}) {
  const t = useTranslations("workers.summary");

  return (
    <Strip
      label={t("onThePlatform")}
      value={t("count", { count: total })}
      isLoading={isLoading}
    >
      {WORKER_SUMMARY_TILES.map((tile) => {
        const Icon = ICON[tile.id as keyof typeof ICON];
        const count = counts[tile.id] ?? 0;
        return (
          <SummaryTile
            key={tile.id}
            icon={<Icon className="size-4" />}
            title={t(`${tile.id}.title` as "review.title", { count })}
            detail={t(`${tile.id}.why` as "review.why")}
            action={t(`${tile.id}.action` as "review.action")}
            tone={tile.tone}
            count={count}
            on={isTileActive(tile, filters)}
            onClick={() => onFilters(toggleTileFilter(tile, filters))}
          />
        );
      })}
    </Strip>
  );
}
