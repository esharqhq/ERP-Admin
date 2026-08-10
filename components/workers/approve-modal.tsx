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
  workerName: string;
}

export function ApproveWorkerModal({ open, onClose, onConfirm, isPending, workerName }: Props) {
  const t = useTranslations("workers");
  const tCommon = useTranslations("common");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("approveTitle")}</DialogTitle>
          <DialogDescription>
            {t("approveConfirm")} <strong>{workerName}</strong>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            {tCommon("cancel")}
          </Button>
          <Button onClick={onConfirm} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t("approve")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
