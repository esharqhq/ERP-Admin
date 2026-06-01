"use client";

import { useState } from "react";
import { FileText, ExternalLink, CheckCircle, XCircle, RotateCcw, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { PropertyDocsBundleDto } from "@/lib/types/property.types";

const docsStatusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Approved: "default",
  Pending:  "secondary",
  Rejected: "destructive",
};

interface PropertyDocsCardProps {
  propertyId: string;
  bundle: PropertyDocsBundleDto;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onReset: (reason: string) => void;
  isApproving?: boolean;
  isRejecting?: boolean;
  isResetting?: boolean;
}

export function PropertyDocsCard({
  bundle,
  onApprove,
  onReject,
  onReset,
  isApproving = false,
  isRejecting = false,
  isResetting = false,
}: PropertyDocsCardProps) {
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetReason, setResetReason] = useState("");

  const status = bundle.docsStatus;
  const docs = bundle.docs ?? [];
  const statusVariant = status ? (docsStatusVariant[status] ?? "outline") : "outline";

  function handleRejectConfirm() {
    if (rejectReason.trim().length < 5) return;
    onReject(rejectReason.trim());
    setShowRejectDialog(false);
    setRejectReason("");
  }

  function handleRejectClose() {
    setShowRejectDialog(false);
    setRejectReason("");
  }

  function handleResetConfirm() {
    if (resetReason.trim().length < 3) return;
    onReset(resetReason.trim());
    setShowResetDialog(false);
    setResetReason("");
  }

  function handleResetClose() {
    setShowResetDialog(false);
    setResetReason("");
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-heading text-base font-semibold tracking-tight">
              Mulk hujjatlari
            </h2>
            {status && (
              <Badge variant={statusVariant}>{status}</Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {/* Docs list */}
          {docs.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 py-6 text-center">
              <FileText className="size-7 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Hujjatlar yuklanmagan</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className="group/doc flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 transition-colors hover:border-foreground/15 hover:bg-muted/30"
                >
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <FileText className="size-3.5" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-[13px] font-medium leading-tight">
                      {doc.fileName ?? "Hujjat"}
                    </span>
                    {doc.type && (
                      <span className="text-[11px] text-muted-foreground">{doc.type}</span>
                    )}
                  </div>
                  {doc.fileUrl && (
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 opacity-0 transition-opacity group-hover/doc:opacity-100"
                      aria-label="Ochish"
                    >
                      <ExternalLink className="size-3.5 text-muted-foreground hover:text-foreground" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Reject reason box */}
          {status === "Rejected" && bundle.docsRejectReason && (
            <div className="rounded-md bg-destructive/5 px-3 py-2.5 text-[12px] text-destructive">
              <p className="font-semibold uppercase tracking-wide text-[11px] mb-1">Rad sababi</p>
              <p>{bundle.docsRejectReason}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {status === "Pending" && (
              <>
                <Button
                  size="sm"
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={onApprove}
                  disabled={isApproving || isRejecting}
                >
                  {isApproving ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <CheckCircle className="size-3.5" />
                  )}
                  Tasdiqlash
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="gap-1.5"
                  onClick={() => setShowRejectDialog(true)}
                  disabled={isApproving || isRejecting}
                >
                  {isRejecting ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <XCircle className="size-3.5" />
                  )}
                  Rad etish
                </Button>
              </>
            )}

            {(status === "Approved" || status === "Rejected") && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => setShowResetDialog(true)}
                disabled={isResetting}
              >
                {isResetting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="size-3.5" />
                )}
                Qayta ko&apos;rish
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Reject dialog */}
      <Dialog open={showRejectDialog} onOpenChange={(v) => !v && handleRejectClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hujjatlarni rad etish</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Rad etish sababi (kamida 5 belgi, majburiy).
          </p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Rad etish sababi..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px] resize-none"
          />
          {rejectReason.length > 0 && rejectReason.trim().length < 5 && (
            <p className="text-xs text-destructive">Kamida 5 ta belgi kiriting.</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleRejectClose} disabled={isRejecting}>
              Bekor qilish
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={rejectReason.trim().length < 5 || isRejecting}
            >
              {isRejecting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Rad etish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset dialog */}
      <Dialog open={showResetDialog} onOpenChange={(v) => !v && handleResetClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{"Hujjatlarni qayta ko'rib chiqish"}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {"Holat «Pending» ga qaytariladi. Sabab (kamida 3 belgi, majburiy)."}
          </p>
          <textarea
            value={resetReason}
            onChange={(e) => setResetReason(e.target.value)}
            placeholder="Reset sababi..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px] resize-none"
          />
          {resetReason.length > 0 && resetReason.trim().length < 3 && (
            <p className="text-xs text-destructive">Kamida 3 ta belgi kiriting.</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleResetClose} disabled={isResetting}>
              Bekor qilish
            </Button>
            <Button
              onClick={handleResetConfirm}
              disabled={resetReason.trim().length < 3 || isResetting}
            >
              {isResetting && <Loader2 className="mr-2 size-4 animate-spin" />}
              {"Qayta ko'rish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
