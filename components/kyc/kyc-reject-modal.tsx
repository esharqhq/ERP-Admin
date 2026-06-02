"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isPending: boolean;
  ownerName: string;
}

export function KycRejectModal({ open, onClose, onConfirm, isPending, ownerName }: Props) {
  const t = useTranslations("owners");
  const tCommon = useTranslations("common");
  const [reason, setReason] = useState("");
  const isValid = reason.trim().length >= 3;

  function handleClose() {
    onClose();
    setReason("");
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("kyc.rejectTitle")}</DialogTitle>
          <DialogDescription>
            <strong>{ownerName}</strong> — {t("kyc.rejectReason", { min: 3 })}
          </DialogDescription>
        </DialogHeader>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t("kyc.rejectPlaceholder")}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px] resize-none"
        />
        {!isValid && reason.length > 0 && (
          <p className="text-xs text-destructive">{t("kyc.rejectReasonMin", { min: 3 })}</p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            {tCommon("cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={() => onConfirm(reason.trim())}
            disabled={!isValid || isPending}
          >
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {tCommon("reject")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
