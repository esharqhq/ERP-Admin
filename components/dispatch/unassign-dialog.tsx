"use client";

import { Loader2, UserMinus } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Source of truth: `assets/Admin/Uyer Admin Dispatch.dc.html` §03 (the unassign
// card). The tinted icon square, the bolded name inside a sentence and the
// consequence box are design-specific enough that the shared ConfirmDialog
// (components/tasks/confirm-dialog.tsx — a plain title + description + confirm,
// used by eleven other callers) does not fit without either stretching its
// contract for one caller or dropping the box. Built on the same Dialog
// primitives ConfirmDialog itself is built on — the precedent
// `components/broadcasts/cancel-broadcast-dialog.tsx` set for the same reason.

/**
 * Removing one worker from one task.
 *
 * ⚠ **The design's consequence copy is wrong and is not reproduced.** It reads
 * *"The slot opens again — the meter drops to 1 / 3 and the task returns to the
 * unstaffed count."* The first half of that is true and the last clause is the
 * dangerous one: server-side the slot does **not** re-open, because
 * `AdminAssignWorkerAsync`'s capacity guard counts soft-removed rows
 * (`BACKEND-ASKS.md` #31). An admin who unassigns in order to swap somebody in
 * gets `worker_limit_reached` on the way back.
 *
 * So the box says what is actually true — the row stays as `removed`, the board's
 * meter drops — and then warns about the refill, which is the fact that changes
 * what the admin does next. When #31 ships, `refillWarning` is the line to
 * delete.
 */
export function UnassignDialog({
  workerName,
  propertyName,
  dateLabel,
  isPending,
  error,
  onClose,
  onConfirm,
}: {
  workerName: string;
  propertyName: string;
  dateLabel: string;
  isPending: boolean;
  /** Localized refusal from `classifyUnassignError`. */
  error?: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const t = useTranslations("dispatch.unassignDialog");
  const tCommon = useTranslations("common");

  return (
    <Dialog open onOpenChange={(v) => !v && !isPending && onClose()}>
      <DialogContent className="sm:max-w-[432px]">
        <DialogHeader>
          <div className="flex items-start gap-3">
            {/* A tinted square, not a bare glyph: it is what makes the card read
                as destructive before a word of it is read. */}
            <span className="flex size-9 flex-none items-center justify-center rounded-[11px] bg-status-cancelled-tint text-status-cancelled-deep">
              <UserMinus className="size-[18px]" />
            </span>
            <div className="flex flex-1 flex-col gap-0.5">
              <DialogTitle className="text-base font-bold tracking-[-0.02em]">
                {t("title")}
              </DialogTitle>
              {/*
                The name is bold inside the sentence rather than being the whole
                sentence — the admin has to confirm *which* worker on *which*
                shift, and a title that only said the name would leave the second
                half to be guessed.
              */}
              <p className="text-[13px] leading-normal text-muted-foreground">
                {t.rich("body", {
                  name: workerName,
                  task: propertyName,
                  date: dateLabel,
                  strong: (chunks) => (
                    <strong className="font-semibold text-foreground">
                      {chunks}
                    </strong>
                  ),
                })}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-1.5 rounded-xl bg-muted/40 px-3 py-2.5 ring-1 ring-inset ring-border">
          <span className="text-[11.5px] font-semibold text-foreground">
            {t("consequenceTitle")}
          </span>
          <span className="text-[11.5px] leading-normal text-muted-foreground">
            {t.rich("consequence", {
              mono: (chunks) => (
                <span className="font-mono text-[11px]">{chunks}</span>
              ),
            })}
          </span>
          {/* Delete this line when BACKEND-ASKS.md #31 ships. */}
          <span className="text-[11.5px] leading-normal text-status-pending-deep">
            {t("refillWarning")}
          </span>
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}

        <div className="flex items-center justify-end gap-2.5">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            {tCommon("cancel")}
          </Button>
          <Button
            variant="destructive"
            className="gap-1.5"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <UserMinus className="size-4" />
            )}
            {t("confirm")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
