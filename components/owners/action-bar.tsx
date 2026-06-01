"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, XCircle, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { KycProfileSummaryDto } from "@/lib/types/kyc.types";

interface ActionBarProps {
  owner?: KycProfileSummaryDto;
  onApprove?: () => void;
  onReject?: (reason: string) => void;
  onDelete?: () => void;
  isApproving?: boolean;
  isRejecting?: boolean;
  isDeleting?: boolean;
}

export function ActionBar({
  owner,
  onApprove,
  onReject,
  onDelete,
  isApproving = false,
  isRejecting = false,
  isDeleting = false,
}: ActionBarProps) {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const isReasonValid = rejectReason.trim().length >= 5;
  const kycStatus = owner?.kycStatus ?? null;

  function handleRejectConfirm() {
    if (!isReasonValid || !onReject) return;
    onReject(rejectReason.trim());
    setShowRejectModal(false);
    setRejectReason("");
  }

  function handleRejectClose() {
    setShowRejectModal(false);
    setRejectReason("");
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/dashboard/owners" />}
          className="gap-1.5 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {"Owners ro'yxatiga qaytish"}
        </Button>

        {owner && (
          <div className="flex items-center gap-2">
            {kycStatus === "1" && (
              <>
                <Button
                  size="sm"
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={onApprove}
                  disabled={isApproving || isRejecting}
                >
                  {isApproving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle className="size-4" />
                  )}
                  Tasdiqlash
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="gap-1.5"
                  onClick={() => setShowRejectModal(true)}
                  disabled={isApproving || isRejecting}
                >
                  {isRejecting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <XCircle className="size-4" />
                  )}
                  Rad etish
                </Button>
              </>
            )}

            {(kycStatus === "2" || kycStatus === "3") && (
              <Button
                size="sm"
                variant="destructive"
                className="gap-1.5"
                onClick={onDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                {"O'chirish"}
              </Button>
            )}
          </div>
        )}
      </div>

      <Dialog open={showRejectModal} onOpenChange={(v) => !v && handleRejectClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>KYC ni rad etish</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <strong>{owner?.ownerName ?? "Owner"}</strong> — rad etish sababi (kamida 5 belgi,
            majburiy).
          </p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Rad etish sababi..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px] resize-none"
          />
          {!isReasonValid && rejectReason.length > 0 && (
            <p className="text-xs text-destructive">Kamida 5 ta belgi kiriting.</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleRejectClose} disabled={isRejecting}>
              Bekor qilish
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={!isReasonValid || isRejecting}
            >
              {isRejecting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Rad etish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
