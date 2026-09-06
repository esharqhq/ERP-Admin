"use client";

import type { MouseEvent } from "react";
import { Image as ImageIcon, FileText, RotateCcw, AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { BroadcastRowDto, BroadcastStatus } from "@/lib/types/broadcast.types";

// Source of truth for every visual decision in this file:
// assets/Uyer Admin Broadcasts.dc.html §01-03 (row grammar, status/audience
// specs, the Missed treatment) — colors are re-expressed as UYER DS tokens,
// never the design doc's own hex.

/**
 * Status pill tone. `Badge`'s `tone` prop is tinted-chip-only by design (see
 * its own comment: "tinted chips, never solid fills"). The design asks for
 * exactly one exception — Missed goes solid — which `tone` structurally
 * cannot express, so Missed is drawn with a plain `className` override
 * instead of a `tone`. Closest tokens, not the design's literal hex:
 * Scheduled→neutral (muted gray, not the design's blue-leaning read — this
 * app has no "waiting" tone distinct from neutral), Sending→primary (its
 * bg/fg is `--status-verified`/`-tint`, which is an exact hit), Sent→success
 * (a shade lighter than the design's, closest available), Cancelled→outline
 * (an unfilled ring, closer to the design's white+ring than any tint),
 * Missed→solid `status-cancelled-deep` (closest to the design's `#B22B2B`
 * of the two red tokens).
 */
const STATUS_TONE: Partial<
  Record<BroadcastStatus, "neutral" | "primary" | "success">
> = {
  Scheduled: "neutral",
  Sending: "primary",
  Sent: "success",
};

export function BroadcastStatusPill({ status }: { status: BroadcastStatus }) {
  const t = useTranslations("broadcasts");
  const label = t(`statusLabels.${status}` as Parameters<typeof t>[0]);
  if (status === "Missed") {
    return (
      <Badge className="gap-1.5 bg-status-cancelled-deep text-white">
        <span className="size-[7px] shrink-0 rounded-full bg-white/80" />
        {label}
      </Badge>
    );
  }
  if (status === "Cancelled") {
    return (
      <Badge variant="outline" className="gap-1.5 text-muted-foreground">
        <span className="size-[7px] shrink-0 rounded-full bg-muted-foreground/50" />
        {label}
      </Badge>
    );
  }
  const tone = STATUS_TONE[status];
  return (
    <Badge tone={tone} className="gap-1.5">
      <span
        className={cn(
          "size-[7px] shrink-0 rounded-full",
          status === "Sending" ? "bg-current animate-pulse" : "bg-current",
        )}
      />
      {label}
    </Badge>
  );
}

/** The row's own sub-line under the status pill — a fact, not a repeat of the label. */
export function statusSubline(
  row: Pick<BroadcastRowDto, "status" | "completedAtUtc">,
  t: ReturnType<typeof useTranslations<"broadcasts">>,
  formatAbs: (iso: string) => string,
): string {
  switch (row.status) {
    case "Scheduled":
      return t("row.statusSubScheduled");
    case "Sending":
      return t("row.statusSubSending");
    case "Sent":
      // completedAtUtc IS on the row DTO — a real timestamp, not invented.
      return row.completedAtUtc
        ? t("row.statusSubSentAt", { time: formatAbs(row.completedAtUtc) })
        : t("row.statusSubSent");
    case "Cancelled":
      // ⚠ No cancellation timestamp exists on BroadcastRowDto — the design's
      // mock shows one ("cancelled 11:41") that this DTO cannot produce.
      // Static copy, not a fabricated time.
      return t("row.statusSubCancelled");
    case "Missed":
      return t("row.statusSubMissed");
    default:
      return "";
  }
}

/**
 * The Recipients cell's sub-line. `recipientCount` itself is handled by the
 * caller (Scheduled draws "—", never the DTO's real `0` — decision #01: a
 * preview number that later disagrees with the real send is worse than none).
 */
export function recipientsSubline(
  status: BroadcastStatus,
  t: ReturnType<typeof useTranslations<"broadcasts">>,
): string {
  switch (status) {
    case "Scheduled":
      return t("row.recipientsCountedAtSend");
    case "Sending":
      return t("row.recipientsRowsWritten");
    case "Sent":
      return t("row.recipientsRowsWritten");
    case "Cancelled":
      return t("row.recipientsNeverStarted");
    case "Missed":
      return t("row.recipientsNothingSent");
    default:
      return "";
  }
}

export function BroadcastAudienceBadge({
  row,
}: {
  row: Pick<BroadcastRowDto, "audience" | "namedCount">;
}) {
  const t = useTranslations("broadcasts");
  const label = t(`audienceLabels.${row.audience}` as Parameters<typeof t>[0]);
  const sub =
    row.audience === "Custom"
      ? t("row.audienceNamed", { count: row.namedCount ?? 0 })
      : row.audience === "Both"
        ? t("row.audienceBoth")
        : t("row.audienceAllEligible");

  // No DS token is purple, and the design's Custom badge is the one audience
  // that is genuinely novel (a hand-picked, frozen list, not a live-resolved
  // population) — `outline` is the closest STRUCTURAL match (an unfilled
  // ring, like the design's), not a color match.
  if (row.audience === "Custom") {
    return (
      <div className="flex flex-col items-start gap-0.5">
        <Badge variant="outline" className="gap-1.5">
          {label}
        </Badge>
        <span className="text-[10px] text-muted-foreground">{sub}</span>
      </div>
    );
  }
  const tone = row.audience === "Both" ? "info" : "neutral";
  return (
    <div className="flex flex-col items-start gap-0.5">
      <Badge tone={tone} className="gap-1.5">
        {label}
      </Badge>
      <span className="text-[10px] text-muted-foreground/70">{sub}</span>
    </div>
  );
}

export function BroadcastImageMarker({ hasImage }: { hasImage: boolean }) {
  const t = useTranslations("broadcasts");
  return (
    <span
      title={hasImage ? t("row.imageTipHasImage") : t("row.imageTipNone")}
      className={cn(
        "flex h-[26px] w-[34px] shrink-0 items-center justify-center rounded-md",
        hasImage
          ? "bg-accent text-primary ring-1 ring-inset ring-primary/20"
          : "bg-muted text-muted-foreground/50",
      )}
    >
      {hasImage ? (
        <ImageIcon className="size-3.5" strokeWidth={1.9} />
      ) : (
        <FileText className="size-3.5" strokeWidth={1.9} />
      )}
    </span>
  );
}

/**
 * Title cell: image marker, title (titleDe, falling back to titleEn),
 * language tag, sub-title, and — Missed only — the inline "not sent, expired"
 * alert with its own Recreate button. `onRecreate` must stopPropagation: this
 * cell sits inside the row `RowLink` overlay, so a plain click would also
 * navigate to the detail page underneath the button.
 */
export function BroadcastTitleCell({
  row,
  onRecreate,
}: {
  row: Pick<BroadcastRowDto, "titleDe" | "titleEn" | "hasImage" | "status">;
  onRecreate: (e: MouseEvent) => void;
}) {
  const t = useTranslations("broadcasts");
  const fallback = !row.titleDe;
  const title = row.titleDe || row.titleEn || "—";
  const missed = row.status === "Missed";

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <BroadcastImageMarker hasImage={row.hasImage} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[13.5px] font-semibold leading-tight">
          {title}
        </span>
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="flex-none rounded bg-muted px-1 font-mono text-[9px] font-semibold text-muted-foreground">
            {fallback ? "EN" : "DE"}
          </span>
          <span className="min-w-0 flex-1 truncate text-[11.5px] text-muted-foreground">
            {fallback ? t("row.titleFallbackNote") : row.titleEn}
          </span>
        </span>
        {missed && (
          <span className="relative z-[2] mt-0.5 flex items-center gap-1.5">
            <AlertTriangle className="size-3 shrink-0 text-destructive" />
            <span className="text-[11.5px] font-medium text-destructive">
              {t("row.missedAlert")}
            </span>
            <button
              type="button"
              onClick={onRecreate}
              className="flex h-[22px] shrink-0 items-center gap-1 rounded-md px-2 text-[11.5px] font-semibold text-destructive ring-1 ring-inset ring-destructive/35 hover:bg-destructive/5"
            >
              <RotateCcw className="size-3" />
              {t("row.recreate")}
            </button>
          </span>
        )}
      </div>
    </div>
  );
}
