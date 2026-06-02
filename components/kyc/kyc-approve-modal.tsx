"use client";

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
  onConfirm: () => void;
  isPending: boolean;
  ownerName: string;
}

export function KycApproveModal({ open, onClose, onConfirm, isPending, ownerName }: Props) {
  const t = useTranslations("owners");
  const tCommon = useTranslations("common");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("kyc.approveTitle")}</DialogTitle>
          <DialogDescription>
            <strong>{ownerName}</strong> — {t("kyc.approveConfirm")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            {tCommon("cancel")}
          </Button>
          <Button onClick={onConfirm} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {tCommon("approve")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
