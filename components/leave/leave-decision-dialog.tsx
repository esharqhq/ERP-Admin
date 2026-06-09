"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  mode: "approve" | "reject";
  workerName: string;
  onClose: () => void;
  onConfirm: (note: string | null) => void;
  isPending: boolean;
  error?: string | null;
}

/** Approve/reject a pending leave request with an optional decision note. */
export function LeaveDecisionDialog({
  open,
  mode,
  workerName,
  onClose,
  onConfirm,
  isPending,
  error,
}: Props) {
  const t = useTranslations("leave");
  const tCommon = useTranslations("common");
  const [note, setNote] = useState("");

  const isApprove = mode === "approve";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !isPending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isApprove ? t("decide.approveTitle") : t("decide.rejectTitle")}
          </DialogTitle>
          <DialogDescription>
            {isApprove
              ? t("decide.approveDesc", { name: workerName })
              : t("decide.rejectDesc", { name: workerName })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">{t("decide.note")}</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder={t("decide.notePlaceholder")}
            className="resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            {tCommon("cancel")}
          </Button>
          <Button
            variant={isApprove ? "default" : "destructive"}
            onClick={() => onConfirm(note.trim() || null)}
            disabled={isPending}
          >
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {isApprove ? t("decide.approve") : t("decide.reject")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
