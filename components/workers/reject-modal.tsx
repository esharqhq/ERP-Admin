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

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
  isPending: boolean;
  workerName: string;
}

export function RejectWorkerModal({ open, onClose, onConfirm, isPending, workerName }: Props) {
  const [reason, setReason] = useState("");

  function handleClose() {
    onClose();
    setReason("");
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ishchini rad etish</DialogTitle>
          <DialogDescription>
            <strong>{workerName}</strong> ni rad etmoqchimisiz? Sabab
            ko&apos;rsatishingiz mumkin (ixtiyoriy).
          </DialogDescription>
        </DialogHeader>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Rad etish sababi (ixtiyoriy)..."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px] resize-none"
        />
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Bekor qilish
          </Button>
          <Button
            variant="destructive"
            onClick={() => onConfirm(reason.trim() || undefined)}
            disabled={isPending}
          >
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Rad etish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
