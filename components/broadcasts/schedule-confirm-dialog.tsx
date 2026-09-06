"use client";

import { useTranslations } from "next-intl";
import { CalendarClock, Globe2, Loader2, Send, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useBroadcastAudiencePreview } from "@/hooks/use-broadcast-audience-preview";
import type { BroadcastAudience, BroadcastCustomAudienceDto } from "@/lib/types/broadcast.types";

// Source of truth: assets/Uyer Admin Broadcasts.dc.html §09 — three facts
// restated (audience size, language split, dispatch time), NOT "are you
// sure?" (design decision #12). `useBroadcastAudiencePreview` is called
// again here rather than threaded down as a prop: same (audience,
// selection) pair the reach panel just queried, so TanStack Query serves it
// from cache instead of firing a second network call.
//
// Fact 2 (design's own text: "68 read German, 18 read English") cannot be
// built — `BroadcastAudiencePreviewDto` returns only `namedCount` and
// `eligibleCount`, nothing that aggregates the `language` profile field —
// so this renders the honest no-numbers version instead of inventing a
// split. Filed as a B-ask alongside B22.

export interface ScheduleConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  sendMode: "now" | "schedule";
  scheduledAtUtc: string | null;
  audience: BroadcastAudience;
  selection: BroadcastCustomAudienceDto | null;
}

function formatDispatch(iso: string): { local: string; utc: string } {
  const d = new Date(iso);
  const local = d.toLocaleString(undefined, {
    weekday: "long",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const utc = d.toLocaleString("en-GB", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
  });
  return { local, utc };
}

export function ScheduleConfirmDialog({
  open,
  onClose,
  onConfirm,
  isSubmitting,
  sendMode,
  scheduledAtUtc,
  audience,
  selection,
}: ScheduleConfirmDialogProps) {
  const t = useTranslations("broadcasts.compose.confirm");
  const tAudience = useTranslations("broadcasts.audienceLabels");
  const tRow = useTranslations("broadcasts.row");

  const preview = useBroadcastAudiencePreview(audience, selection);
  const eligibleAudienceLabel = audience === "Both" ? tRow("audienceBoth") : tAudience(audience);

  const factAudience =
    audience === "Custom"
      ? t("factNamed", { count: preview.data?.namedCount ?? 0 })
      : t("factEligible", {
          count: preview.data?.eligibleCount ?? 0,
          audience: eligibleAudienceLabel,
        });

  const factDispatch =
    sendMode === "now"
      ? t("factDispatchNow")
      : scheduledAtUtc
        ? (() => {
            const { local, utc } = formatDispatch(scheduledAtUtc);
            return t("factDispatchScheduled", { local, utc });
          })()
        : "";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !isSubmitting && onClose()}>
      <DialogContent className="max-w-[420px]">
        <DialogHeader>
          <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-primary">
            {sendMode === "now" ? <Send className="size-5" /> : <CalendarClock className="size-5" />}
          </span>
          <DialogTitle className="mt-2">
            {sendMode === "now" ? t("titleSendNow") : t("titleSchedule")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2.5">
          <div className="flex items-start gap-2.5">
            <UserPlus className="mt-0.5 size-4 flex-none text-muted-foreground" />
            <span className="text-[13px] leading-relaxed text-foreground text-pretty">
              {factAudience}
            </span>
          </div>
          <div className="flex items-start gap-2.5">
            <Globe2 className="mt-0.5 size-4 flex-none text-muted-foreground" />
            <span className="text-[13px] leading-relaxed text-foreground text-pretty">
              {t("factLanguageSplit")}
            </span>
          </div>
          <div className="flex items-start gap-2.5">
            <CalendarClock className="mt-0.5 size-4 flex-none text-muted-foreground" />
            <span className="text-[13px] leading-relaxed text-foreground text-pretty">
              {factDispatch}
            </span>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-lg bg-status-pending-tint p-2.5 ring-1 ring-inset ring-status-pending/25">
          <span className="text-xs leading-relaxed text-status-pending-deep text-pretty">
            {sendMode === "now" ? t("warningCannotUndoNow") : t("warningEditableUntil")}
          </span>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            {t("keepEditing")}
          </Button>
          <Button onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
            {sendMode === "now" ? (
              <Send className="size-4" />
            ) : (
              <CalendarClock className="size-4" />
            )}
            {sendMode === "now" ? t("confirmSendNow") : t("confirmSchedule")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
