"use client";

import { Ban, Info, Loader2, Lock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { broadcastService } from "@/lib/services/broadcast.service";
import { getApiErrorCode } from "@/lib/http/api-error";
import type { BroadcastRowDto } from "@/lib/types/broadcast.types";

/** Duplicated from page.tsx's `relativeTime`: a page can't be imported into
 * a component, and this is the only other place that needs it. */
function relativeFromNow(iso: string, locale: string): string {
  const diffMin = Math.round((new Date(iso).getTime() - Date.now()) / 60_000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
  const diffHr = Math.round(diffMin / 60);
  if (Math.abs(diffHr) < 24) return rtf.format(diffHr, "hour");
  return rtf.format(Math.round(diffHr / 24), "day");
}

// Source of truth: assets/Uyer Admin Broadcasts.dc.html §05 (the cancel
// dialog card). The facts box (row stays as Cancelled; cannot be undone) is
// design-specific enough that the shared ConfirmDialog (components/tasks/
// confirm-dialog.tsx — a plain title+description+confirm) doesn't fit it
// without either stretching that component's contract for one caller or
// dropping the facts box; built directly on Dialog/DialogContent instead,
// the same primitives ConfirmDialog itself is built on.

/**
 * Not wired to `hooks/use-broadcasts.ts` — that file is out of this phase's
 * scope. The mutation lives here and invalidates every `["broadcasts", …]`
 * query (the list, the toolbar's five status-count probes, any detail read),
 * since TanStack Query key-prefix matching treats `["broadcasts"]` as a
 * parent of all of them.
 *
 * `broadcast_not_cancellable` is read directly via `getApiErrorCode` rather
 * than through `lib/onboarding/errors.ts`'s `CATALOG` — that catalog is
 * scoped to onboarding/contract/table/lookup/ticket codes (its own header
 * comment lists the exact five source guides), and `broadcast_*` codes
 * aren't among them. Extending it for one broadcast-domain code would
 * misfile it under a module named for a different domain.
 */
export function CancelBroadcastDialog({
  broadcast,
  onClose,
}: {
  broadcast: Pick<BroadcastRowDto, "id" | "titleDe" | "titleEn" | "scheduledAtUtc">;
  onClose: () => void;
}) {
  const t = useTranslations("broadcasts");
  const locale = useLocale();
  const queryClient = useQueryClient();

  const cancel = useMutation({
    mutationFn: () => broadcastService.cancel(broadcast.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["broadcasts"] });
      onClose();
    },
  });

  const errorMessage = cancel.isError
    ? getApiErrorCode(cancel.error) === "broadcast_not_cancellable"
      ? t("cancelDialog.errorNotCancellable")
      : t("cancelDialog.errorGeneric")
    : null;

  const title = broadcast.titleDe || broadcast.titleEn || "—";
  const time = broadcast.scheduledAtUtc
    ? relativeFromNow(broadcast.scheduledAtUtc, locale)
    : t("row.sendNow");

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[420px]">
        <DialogHeader>
          <span className="flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <Ban className="size-5" />
          </span>
          <DialogTitle className="mt-2">{t("cancelDialog.title")}</DialogTitle>
        </DialogHeader>

        <p className="text-[13.5px] leading-relaxed text-muted-foreground">
          {t.rich("cancelDialog.body", {
            title,
            time,
            strong: (chunks) => <strong className="font-semibold text-foreground">{chunks}</strong>,
          })}
        </p>

        <div className="flex flex-col gap-1.5 rounded-lg bg-muted/50 p-3 ring-1 ring-inset ring-border">
          <span className="flex items-center gap-1.5 text-xs text-foreground/80">
            <Info className="size-3.5 shrink-0 text-muted-foreground" />
            {t.rich("cancelDialog.factStaysListed", {
              strong: (chunks) => <strong className="font-semibold">{chunks}</strong>,
            })}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-foreground/80">
            <Lock className="size-3.5 shrink-0 text-muted-foreground" />
            {t("cancelDialog.factCannotUndo")}
          </span>
        </div>

        {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={cancel.isPending}>
            {t("cancelDialog.keepScheduled")}
          </Button>
          <Button
            variant="destructive"
            onClick={() => cancel.mutate()}
            disabled={cancel.isPending}
          >
            {cancel.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            <Ban className="size-4" />
            {t("cancelDialog.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
