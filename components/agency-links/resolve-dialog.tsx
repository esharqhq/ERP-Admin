"use client";

import { useState } from "react";
import { Loader2, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const MAX_REASON = 2000;

/**
 * The shape confirm, overrule and reject share.
 *
 * ⚠ **One component for three verbs, and it is an implementation detail — not a
 * shared button.** All three are a title, a body, a reason box and one button,
 * differing only in copy, tone and whether the reason is required; three
 * near-identical files would drift. The **callers** still offer them as three
 * distinct controls, which is what the guide requires.
 *
 * ⚠ **`requireReason` is not cosmetic.** Reject always requires one and the
 * overrule requires one; agreeing with a worker's claim does not. And the two
 * shapes a missing reason comes back as differ by door — `reason_required` from
 * confirm and reject, **problem-details** from attach, because `[Required]`
 * trims a whitespace-only value away before the service is reached. Refusing it
 * here means that difference is never met.
 *
 * ⚠ **`secondStep` is the overrule's.** It is the single most sensitive act in
 * this feature: a person told the company they were not recruited by that
 * agency, and an admin is overriding them. The primary button first reveals what
 * the act means and asks again — the shape phase 2's `endsAccessNow` uses.
 */
export function ResolveDialog({
  open,
  onClose,
  onSubmit,
  title,
  body,
  warning,
  submitLabel,
  requireReason,
  destructive,
  secondStep,
  pending,
  error,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  title: string;
  body?: string;
  /**
   * A consequence the act carries in its own right — drawn in a tinted panel,
   * not as the dialog's description.
   *
   * ⚠ `body` and this are **not** interchangeable. `body` is a
   * `DialogDescription`: muted, small, immediately above the reason box an
   * operator is already reaching for. Something that must be *read* before a
   * one-way act does not belong there — the sibling warning on the agencies
   * edit dialog (`endsAccessNow`) is a tinted `TriangleAlert` panel, and the
   * quieter treatment on the more consequential act would be backwards.
   */
  warning?: string;
  submitLabel: string;
  requireReason: boolean;
  destructive?: boolean;
  /** Copy for the extra confirmation step, or absent for a one-step dialog. */
  secondStep?: { body: string; submitLabel: string };
  pending: boolean;
  error?: string | null;
}) {
  const t = useTranslations("agencyLinks");
  const tCommon = useTranslations("common");

  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);

  const trimmed = reason.trim();
  const blocked = requireReason && trimmed.length === 0;

  function close() {
    setReason("");
    setConfirming(false);
    onClose();
  }

  function primary() {
    if (secondStep && !confirming) return setConfirming(true);
    onSubmit(trimmed);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      {/* ⚠ `sm:max-w-lg`: `DialogContent`'s own class ends `sm:max-w-sm`, so an
          unprefixed width loses above 640px. */}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {body ? <DialogDescription>{body}</DialogDescription> : null}
        </DialogHeader>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-foreground/80">
            {t("reason.label")}
            {requireReason ? (
              <span aria-hidden className="text-destructive">
                {" *"}
              </span>
            ) : null}
          </span>
          <Textarea
            value={reason}
            maxLength={MAX_REASON}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-24 text-sm"
          />
          <span className="text-[11px] text-muted-foreground">
            {requireReason ? t("reason.required") : t("reason.optionalHint")}
          </span>
        </label>

        {/* Drawn immediately, unlike `secondStep`: this is a fact about the
            dialog's subject, not a last check on the operator. */}
        {warning ? (
          <div className="flex items-start gap-2 rounded-xl bg-status-cancelled-tint p-3 ring-1 ring-inset ring-status-cancelled/25">
            <TriangleAlert
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-status-cancelled"
            />
            <p className="text-[12.5px] leading-snug text-foreground/90 text-pretty">
              {warning}
            </p>
          </div>
        ) : null}

        {/* The overrule's second step. Revealed rather than pre-drawn: the
            sentence only means anything once the admin has reached for the act. */}
        {secondStep && confirming ? (
          <div className="flex items-start gap-2 rounded-xl bg-status-cancelled-tint p-3 ring-1 ring-inset ring-status-cancelled/25">
            <TriangleAlert
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-status-cancelled"
            />
            <p className="text-[12.5px] leading-snug text-foreground/90 text-pretty">
              {secondStep.body}
            </p>
          </div>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={pending}>
            {tCommon("cancel")}
          </Button>
          <Button
            variant={destructive || confirming ? "destructive" : "default"}
            onClick={primary}
            disabled={pending || blocked}
          >
            {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {secondStep && confirming ? secondStep.submitLabel : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
