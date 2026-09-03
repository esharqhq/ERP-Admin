"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * "Why are you rejecting this?" — the same dialog at both levels.
 *
 * The design says the file-level dialog is *"the same shape, one level down"*, so
 * it is one component with different copy rather than two that drift. What must
 * not differ is the rule: **confirm stays disabled on an empty reason.** The
 * server answers `400 rejection_reason_required` to a blank one, so a submittable
 * empty form is a round trip that can only fail — and at the submission level the
 * reason is the only thing the owner is told.
 */
export function RejectDialog({
  open,
  onOpenChange,
  title,
  description,
  placeholder,
  confirmLabel,
  busy,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  placeholder: string;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: (reason: string) => void;
}) {
  const t = useTranslations("common");
  const [reason, setReason] = useState("");

  /**
   * Cleared on every open, so a reason abandoned on one file cannot be submitted
   * against the next one. Adjusted during render rather than in an effect — the
   * textarea is never painted holding the previous file's text.
   */
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setReason("");
  }

  const trimmed = reason.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-pretty">{description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="reject-reason">{placeholder}</Label>
          <Textarea
            id="reject-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            autoFocus
          />
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{t("cancel")}</DialogClose>
          <Button
            variant="destructive"
            disabled={trimmed.length === 0 || busy}
            onClick={() => onConfirm(trimmed)}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
