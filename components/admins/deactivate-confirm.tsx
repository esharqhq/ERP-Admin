"use client";

import { useState } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
  isPending: boolean;
  adminName: string;
}

export function DeactivateConfirm({ open, onClose, onConfirm, isPending, adminName }: Props) {
  const t = useTranslations("admins");
  const tCommon = useTranslations("common");
  const [reason, setReason] = useState("");

  function handleClose() {
    setReason("");
    onClose();
  }

  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("deactivate.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{adminName}</strong>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-1.5 py-2">
          <Label htmlFor="reason">{t("deactivate.reasonLabel")}</Label>
          <Input
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("deactivate.reasonPlaceholder")}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose} disabled={isPending}>
            {tCommon("cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onConfirm(reason || undefined)}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t("deactivate.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
