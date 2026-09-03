"use client";

import { Camera, Layers, Ruler, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  SummaryStrip as Strip,
  SummaryTile,
} from "@/components/ui/summary-strip";
import type { PropertySummary } from "@/lib/properties/summary";

/**
 * What a list of 86 addresses cannot tell you: which of them is missing something.
 *
 * Four defects, each actionable. Three narrow the table below — they write a
 * filter into the URL rather than switching the screen into a mode, so a tile
 * click is a shareable link and the filter chips can clear it. The fourth opens
 * the bin, which is a different route and a different permission.
 *
 * The band itself, its tones and the zero rule live in
 * `components/ui/summary-strip.tsx` — shared with the workers screen. Only these
 * four tiles and their copy are property-specific.
 */
export function SummaryStrip({
  summary,
  isLoading,
  active,
  onToggle,
  onOpenBin,
  binHref,
}: {
  summary: PropertySummary;
  isLoading?: boolean;
  /** Which of the three narrowing keys are currently on. */
  active: Record<string, string>;
  onToggle: (key: string) => void;
  onOpenBin?: () => void;
  /** Absent for an admin without `property:restore` — the tile then has no action. */
  binHref?: string;
}) {
  const t = useTranslations("properties.summary");

  return (
    <Strip
      label={t("onThePlatform")}
      value={t("count", { count: summary.total })}
      isLoading={isLoading}
    >
      <SummaryTile
        icon={<Camera className="size-4" />}
        title={t("noPhotos", { count: summary.noPhotos })}
        detail={t("noPhotosWhy")}
        action={t("list")}
        tone="warning"
        count={summary.noPhotos}
        on={active.noPhotos === "true"}
        onClick={() => onToggle("noPhotos")}
      />
      <SummaryTile
        icon={<Ruler className="size-4" />}
        title={t("noArea", { count: summary.noArea })}
        detail={t("noAreaWhy")}
        action={t("fix")}
        tone="critical"
        count={summary.noArea}
        on={active.noArea === "true"}
        onClick={() => onToggle("noArea")}
      />
      <SummaryTile
        icon={<Trash2 className="size-4" />}
        title={t("inBin", { count: summary.inBin })}
        // ⚠ The design reads "restorable · 1 older than 90 d". `PropertyDto`
        // carries `isDeleted` and no `deletedAt`, so the age of a deletion is
        // unknowable — the second clause is dropped rather than guessed.
        detail={t("inBinWhy")}
        action={t("open")}
        tone="neutral"
        count={summary.inBin}
        href={binHref}
        onClick={onOpenBin}
      />
      <SummaryTile
        icon={<Layers className="size-4" />}
        title={t("retired", { count: summary.retiredCategory })}
        detail={t("retiredWhy")}
        action={t("move")}
        tone="neutral"
        count={summary.retiredCategory}
        on={active.retired === "true"}
        onClick={() => onToggle("retired")}
      />
    </Strip>
  );
}
