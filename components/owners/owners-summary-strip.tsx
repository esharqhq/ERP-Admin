"use client";

import { FileClock, History, Inbox, Receipt } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  SummaryStrip as Strip,
  SummaryTile,
} from "@/components/ui/summary-strip";
import {
  OWNER_SUMMARY_TILES,
  type OwnerSummaryCounts,
} from "@/lib/owners/summary";
import { isTileActive, toggleTileFilter } from "@/lib/workers/summary";

/**
 * What a page of 25 rows cannot tell you about every owner on the platform: how
 * many are waiting on a decision, how many have not sent a document yet, how many
 * have lost cover, and how many registered and never ordered anything.
 *
 * The mirror of `WorkersSummaryStrip`, deliberately — the two directories answer
 * the same questions and an admin should not have to learn two layouts. It reads
 * the same `isTileActive` / `toggleTileFilter`, so a lit tile means the same
 * thing above either table.
 *
 * Every tile narrows the table below by writing its own filter into the URL, so a
 * click is a shareable link and the filter chips can clear it again. Clicking the
 * lit tile clears it.
 *
 * ⚠ There is no `Blocked` tile, unlike the workers strip: the owner table has no
 * administrative block at all and `?status=Blocked` there answers `400`. A tile
 * for it could only ever report a refused probe as `0`.
 */
const ICON = {
  review: Inbox,
  awaitingDocs: FileClock,
  lapsed: History,
  neverOrdered: Receipt,
} as const;

export function OwnersSummaryStrip({
  total,
  counts,
  isLoading,
  filters,
  onFilters,
}: {
  /** Every owner in the directory — the table's own unfiltered total. */
  total: number;
  counts: OwnerSummaryCounts;
  isLoading?: boolean;
  /** The live filter bag, so a tile can show that it is the one narrowing. */
  filters: Record<string, string>;
  /** Several keys in one write — a tile can own more than one. */
  onFilters: (patch: Record<string, string>) => void;
}) {
  const t = useTranslations("owners.summary");

  return (
    <Strip
      label={t("onThePlatform")}
      value={t("count", { count: total })}
      isLoading={isLoading}
    >
      {OWNER_SUMMARY_TILES.map((tile) => {
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
