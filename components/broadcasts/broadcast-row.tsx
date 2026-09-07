"use client";

import type { MouseEvent, ReactNode } from "react";
import {
  Image as ImageIcon,
  FileText,
  RotateCcw,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Pencil,
  Ban,
  Eye,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

const STATUS_ORDER: BroadcastStatus[] = [
  "Scheduled",
  "Sending",
  "Sent",
  "Cancelled",
  "Missed",
];

/** The dropdown row's own dot color — same read as the status pill's dot. */
const STATUS_DOT: Record<BroadcastStatus, string> = {
  Scheduled: "bg-muted-foreground/60",
  Sending: "bg-primary",
  Sent: "bg-status-active/70",
  Cancelled: "bg-muted-foreground/30",
  Missed: "bg-destructive",
};

/**
 * The single-select status filter, drawn as the design's own dropdown (§02)
 * rather than the shared `FilterBar`'s select field — that field can't carry
 * a per-option count or dot, both of which the design calls for by name.
 * `properties/page.tsx` already sets a precedent for a page-specific toolbar
 * replacing the shell's own filter idiom when the design draws one; this is
 * the same trade for a different reason (per-option decoration, not a
 * pill-vs-band layout preference).
 *
 * Lives here, not in a third new file — this phase's CREATE list only
 * authorizes `broadcast-row.tsx` and `cancel-broadcast-dialog.tsx`.
 */
export function BroadcastStatusDropdown({
  value,
  onChange,
  counts,
  total,
}: {
  value: BroadcastStatus | undefined;
  onChange: (value: BroadcastStatus | undefined) => void;
  /** Per-status count, from the five `pageSize:1` probes — never client-filtered. */
  counts: Record<BroadcastStatus, number>;
  /** Sum of the five — the true "all statuses" count, independent of any active filter. */
  total: number;
}) {
  const t = useTranslations("broadcasts");
  const label = value
    ? t(`statusLabels.${value}` as Parameters<typeof t>[0])
    : t("filters.allStatuses");
  const count = value ? counts[value] : total;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="flex h-8 shrink-0 items-center gap-2 rounded-md bg-background px-2.5 text-[12.5px] font-medium ring-1 ring-inset ring-border"
          />
        }
      >
        {label}
        <span className="font-mono text-[11px] text-muted-foreground">{count}</span>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuRadioGroup
          value={value ?? ""}
          onValueChange={(v) =>
            onChange(v ? (v as BroadcastStatus) : undefined)
          }
        >
          <DropdownMenuRadioItem value="" className="justify-between pr-8">
            <span className="flex-1 font-medium">{t("filters.allStatuses")}</span>
            <span className="font-mono text-xs text-muted-foreground">{total}</span>
          </DropdownMenuRadioItem>
          {STATUS_ORDER.map((s) => (
            <DropdownMenuRadioItem key={s} value={s} className="justify-between pr-8">
              <span className="flex flex-1 items-center gap-2">
                <span className={cn("size-[7px] shrink-0 rounded-full", STATUS_DOT[s])} />
                {t(`statusLabels.${s}` as Parameters<typeof t>[0])}
              </span>
              <span
                className={cn(
                  "font-mono text-xs",
                  s === "Missed" ? "font-semibold text-destructive" : "text-muted-foreground",
                )}
              >
                {counts[s]}
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <p className="px-1.5 py-1.5 text-[11px] text-muted-foreground">
          {t("filters.singleValueNote")}
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
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

function ActionButton({
  label,
  icon,
  tone,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  tone: "primary" | "quiet" | "danger";
  onClick: (e: MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-[12px] font-semibold whitespace-nowrap",
        tone === "primary" && "bg-primary text-primary-foreground",
        tone === "quiet" && "text-foreground/80 ring-1 ring-inset ring-border hover:bg-muted",
        tone === "danger" && "text-destructive ring-1 ring-inset ring-destructive/35 hover:bg-destructive/5",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

/**
 * Row actions, per §05's capability matrix — the API offers exactly three
 * verbs on an existing broadcast (PUT, POST /cancel, both Scheduled-only) and
 * no DELETE route at all, so "Recreate" is a client-side jump to compose,
 * never a real verb.
 *
 * Lives in a dedicated trailing column, not literally replacing the Created
 * cell on hover as §05's demo panel draws it — Created is 104px, and
 * Scheduled alone needs three buttons. A chevron shows at rest; the row's
 * own `group` class (set via `rowClassName`) reveals these on hover. Every
 * button stops propagation — this column still sits inside the row's
 * `RowLink` overlay for its non-hover chevron state.
 */
export function BroadcastRowActions({
  row,
  onEdit,
  onCancel,
  onRecreate,
  onOpen,
}: {
  row: Pick<BroadcastRowDto, "id" | "status">;
  onEdit: (e: MouseEvent) => void;
  onCancel: (e: MouseEvent) => void;
  onRecreate: (e: MouseEvent) => void;
  onOpen: (e: MouseEvent) => void;
}) {
  const t = useTranslations("broadcasts");
  const buttons: { label: string; icon: ReactNode; tone: "primary" | "quiet" | "danger"; onClick: (e: MouseEvent) => void }[] =
    (() => {
      switch (row.status) {
        case "Scheduled":
          return [
            { label: t("row.edit"), icon: <Pencil className="size-3" />, tone: "quiet" as const, onClick: onEdit },
            { label: t("row.cancel"), icon: <Ban className="size-3" />, tone: "danger" as const, onClick: onCancel },
            { label: t("row.open"), icon: <ChevronRight className="size-3" />, tone: "primary" as const, onClick: onOpen },
          ];
        case "Sending":
          return [
            { label: t("row.open"), icon: <ChevronRight className="size-3" />, tone: "primary" as const, onClick: onOpen },
          ];
        case "Missed":
          return [
            { label: t("row.open"), icon: <Eye className="size-3" />, tone: "quiet" as const, onClick: onOpen },
            { label: t("row.recreate"), icon: <RotateCcw className="size-3" />, tone: "danger" as const, onClick: onRecreate },
          ];
        // Sent and Cancelled: identical, read-only.
        default:
          return [
            { label: t("row.recreate"), icon: <RotateCcw className="size-3" />, tone: "quiet" as const, onClick: onRecreate },
            { label: t("row.open"), icon: <ChevronRight className="size-3" />, tone: "primary" as const, onClick: onOpen },
          ];
      }
    })();

  return (
    <div className="relative z-[2] flex w-full items-center justify-end">
      <span className="flex items-center text-muted-foreground/50 group-hover:hidden">
        <ChevronRight className="size-4" aria-hidden />
      </span>
      <div className="hidden items-center gap-1.5 group-hover:flex">
        {buttons.map((b) => (
          <ActionButton
            key={b.label}
            label={b.label}
            icon={b.icon}
            tone={b.tone}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              b.onClick(e);
            }}
          />
        ))}
      </div>
    </div>
  );
}
