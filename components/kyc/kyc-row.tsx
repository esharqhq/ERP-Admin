"use client";

import { useState } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { KycApproveModal } from "./kyc-approve-modal";
import { KycRejectModal } from "./kyc-reject-modal";
import type { KycProfileSummaryDto } from "@/lib/types/kyc.types";

interface Props {
  kyc: KycProfileSummaryDto;
  onApprove: (ownerProfileId: string) => void;
  onReject: (ownerProfileId: string, reason: string) => void;
  isApproving: boolean;
  isRejecting: boolean;
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Approved: "default",
  Pending: "secondary",
  Rejected: "destructive",
};

export function KycRow({ kyc, onApprove, onReject, isApproving, isRejecting }: Props) {
  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const canAct = kyc.kycStatus === "Pending" || (!kyc.isApproved && !kyc.kycRejectReason);

  return (
    <TableRow className="hover:bg-accent/40">
      <TableCell className="py-3">
        <div className="flex items-center gap-3">
          <Avatar className="size-9 ring-1 ring-border">
            <AvatarFallback className="bg-muted text-[11px] font-semibold">
              {(kyc.ownerName ?? "??").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-sm font-medium">{kyc.ownerName ?? "—"}</span>
            <span className="text-[11px] text-muted-foreground">{kyc.ownerEmail ?? "—"}</span>
          </div>
        </div>
      </TableCell>

      <TableCell>
        <Badge variant={statusVariant[kyc.kycStatus ?? "Pending"] ?? "secondary"}>
          {kyc.kycStatus ?? "Pending"}
        </Badge>
      </TableCell>

      <TableCell className="text-center tabular-nums text-sm">
        {kyc.documentCount}
      </TableCell>

      <TableCell>
        {kyc.kycRejectReason && (
          <span className="text-xs text-destructive line-clamp-1">{kyc.kycRejectReason}</span>
        )}
      </TableCell>

      <TableCell className="text-right">
        {canAct && (
          <div className="flex justify-end gap-1.5">
            <Button size="sm" onClick={() => setShowApprove(true)} disabled={isApproving}>
              Tasdiqlash
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowReject(true)}
              disabled={isRejecting}
              className="text-destructive hover:bg-destructive/10"
            >
              Rad etish
            </Button>
          </div>
        )}
      </TableCell>

      <KycApproveModal
        open={showApprove}
        onClose={() => setShowApprove(false)}
        onConfirm={() => { onApprove(kyc.ownerProfileId); setShowApprove(false); }}
        isPending={isApproving}
        ownerName={kyc.ownerName ?? "Owner"}
      />
      <KycRejectModal
        open={showReject}
        onClose={() => setShowReject(false)}
        onConfirm={(reason) => { onReject(kyc.ownerProfileId, reason); setShowReject(false); }}
        isPending={isRejecting}
        ownerName={kyc.ownerName ?? "Owner"}
      />
    </TableRow>
  );
}
