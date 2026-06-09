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
  title: string;
  description?: string;
  confirmLabel: string;
  destructive?: boolean;
  /** Localized error surfaced in-dialog (e.g. a blocked delete) without closing it. */
  error?: string | null;
}

/** Generic confirm dialog (cancel-group, unassign-worker, …). */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  isPending,
  title,
  description,
  confirmLabel,
  destructive,
  error,
}: Props) {
  const tCommon = useTranslations("common");
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            {tCommon("cancel")}
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
