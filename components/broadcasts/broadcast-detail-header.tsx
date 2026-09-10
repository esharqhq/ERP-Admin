"use client";

import { ArrowLeft, Ban, Copy, Pencil, RotateCcw } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BroadcastStatusPill } from "@/components/broadcasts/broadcast-row";
import { cn } from "@/lib/utils";
import type { BroadcastAudience, BroadcastDetailDto } from "@/lib/types/broadcast.types";

// Source of truth: assets/Uyer Admin Broadcast Detail.dc.html §01 (header row)
// and the Missed frame's alert banner. Not built on `components/detail/
// identity-band.tsx`: that shared band's row order is name → subtitle →
// badges+meta, but this design pairs title-with-badges on one line and
// subtitle-with-id-with-copy on the next — a real grouping mismatch, not a
// cosmetic one, so a bespoke header is more faithful than bending a shared
// component's slots to fit.

const AUDIENCE_TONE: Record<BroadcastAudience, "neutral" | "info" | undefined> = {
  Workers: "neutral",
  Owners: "neutral",
  Both: "info",
  Custom: undefined,
};

/** Single-line audience pill for the header — `BroadcastAudienceBadge` from
 * the list is a two-line block (pill + reach caption underneath), which is
 * the wrong shape here: the design's header badge carries no caption, and
 * the reach detail belongs to the Audience card body instead. */
function AudiencePill({ audience }: { audience: BroadcastAudience }) {
  const t = useTranslations("broadcasts");
  const label = t(`audienceLabels.${audience}` as Parameters<typeof t>[0]);
  const tone = AUDIENCE_TONE[audience];
  if (tone === undefined) {
    return (
      <Badge variant="outline" className="gap-1.5">
        {label}
      </Badge>
    );
  }
  return (
    <Badge tone={tone} className="gap-1.5">
      {label}
    </Badge>
  );
}

/** Guarded, silent-fail clipboard write — same shape as
 * `components/properties/property-identity.tsx`'s `CopyButton`. */
function CopyIdButton({ id, label }: { id: string; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => void navigator.clipboard?.writeText(id).catch(() => {})}
      className="flex size-[22px] shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Copy className="size-3.5" />
    </button>
  );
}

interface ActionSlotProps {
  status: BroadcastDetailDto["status"];
  onEdit: () => void;
  onCancel: () => void;
  onRecreate: () => void;
}

/**
 * The one action slot, per §02's `actionSpec` table: Scheduled gets both
 * verbs, Sending gets a bare way back (never a disabled Edit — a greyed-out
 * control invites a click the API only answers with `broadcast_not_editable`),
 * Sent/Cancelled/Missed all get Recreate, escalating from quiet-primary to
 * outline to solid red as the status gets further from "nothing to fix".
 *
 * `destructive` on `Button` is already this DS's tinted danger (see that
 * component's own comment — never a solid fill), which is the right shade for
 * Scheduled's Cancel but not for Missed's Recreate: the design repeats a
 * *solid* red there, in the banner and the slot both, because Missed is the
 * one status asking the admin to act. `status-cancelled-deep` is the same
 * token `BroadcastStatusPill` already uses for Missed's own solid badge.
 */
function ActionSlot({ status, onEdit, onCancel, onRecreate }: ActionSlotProps) {
  const t = useTranslations("broadcasts");
  const tCompose = useTranslations("broadcasts.compose");

  switch (status) {
    case "Scheduled":
      return (
        <div className="flex items-center gap-2">
          <Button variant="destructive" size="sm" onClick={onCancel} className="gap-1.5">
            <Ban className="size-3.5" />
            {t("row.cancel")}
          </Button>
          <Button size="sm" onClick={onEdit} className="gap-1.5">
            <Pencil className="size-3.5" />
            {t("row.edit")}
          </Button>
        </div>
      );
    case "Sending":
      return (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/dashboard/notifications/broadcasts" />}
            className="gap-1.5"
          >
            <ArrowLeft className="size-3.5" />
            {tCompose("backToList")}
          </Button>
          <span className="max-w-[210px] text-[12px] leading-tight text-muted-foreground">
            {t("detail.actionNoteSending")}
          </span>
        </div>
      );
    case "Sent":
      return (
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={onRecreate} className="gap-1.5">
            <RotateCcw className="size-3.5" />
            {t("row.recreate")}
          </Button>
          <span className="max-w-[210px] text-[12px] leading-tight text-muted-foreground">
            {t("detail.actionNoteSent")}
          </span>
        </div>
      );
    case "Cancelled":
      return (
        <Button variant="outline" size="sm" onClick={onRecreate} className="gap-1.5">
          <RotateCcw className="size-3.5" />
          {t("row.recreate")}
        </Button>
      );
    case "Missed":
      return (
        <Button
          size="sm"
          onClick={onRecreate}
          className="gap-1.5 bg-status-cancelled-deep text-white hover:bg-status-cancelled-deep/90"
        >
          <RotateCcw className="size-3.5" />
          {t("row.recreate")}
        </Button>
      );
  }
}

export function BroadcastDetailHeader({
  detail,
  onEdit,
  onCancel,
  onRecreate,
}: {
  detail: BroadcastDetailDto;
  onEdit: () => void;
  onCancel: () => void;
  onRecreate: () => void;
}) {
  const t = useTranslations("broadcasts");
  const title = detail.titleDe || detail.titleEn || "—";

  return (
    <div className="flex flex-col gap-4">
      {detail.status === "Missed" && (
        <div
          className={cn(
            "relative flex items-start gap-3 overflow-hidden rounded-2xl bg-status-cancelled-tint/40 p-4 pl-[17px]",
            "ring-1 ring-inset ring-destructive/25",
          )}
        >
          <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-destructive" />
          <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-destructive/10 text-destructive">
            <Ban className="size-4" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-sm font-bold text-destructive">{t("row.missedAlert")}</span>
            <span className="text-[12.5px] leading-relaxed text-destructive/80">
              {t("detail.missedAlertBody")}
            </span>
          </div>
          <Button
            size="sm"
            onClick={onRecreate}
            className="shrink-0 gap-1.5 bg-status-cancelled-deep text-white hover:bg-status-cancelled-deep/90"
          >
            <RotateCcw className="size-3.5" />
            {t("row.recreate")}
          </Button>
        </div>
      )}

      {/* No Card here — the design draws this row directly on the page
          background, with no border, shadow, or leading icon. Only the
          Missed alert above and the cards below get the white-box treatment. */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            <h1 className="truncate font-heading text-xl font-bold tracking-tight sm:text-[22px]">
              {title}
            </h1>
            <BroadcastStatusPill status={detail.status} />
            <AudiencePill audience={detail.audience} />
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2.5 text-[13px] text-muted-foreground">
            {detail.titleEn && detail.titleEn !== title && (
              <>
                <span>{detail.titleEn}</span>
                <span aria-hidden className="h-3.5 w-px bg-border" />
              </>
            )}
            <span className="font-mono text-[11.5px] text-muted-foreground/70">
              {detail.id}
            </span>
            <CopyIdButton id={detail.id} label={t("detail.copyId")} />
          </div>
        </div>

        <div className="flex shrink-0 items-start pt-0.5">
          <ActionSlot
            status={detail.status}
            onEdit={onEdit}
            onCancel={onCancel}
            onRecreate={onRecreate}
          />
        </div>
      </div>
    </div>
  );
}
