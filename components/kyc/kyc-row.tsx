"use client";

import { useState } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { KycDocReview } from "./kyc-doc-review";
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

// Total column count in the KYC table — keep in sync with the table header in the page.
const COLUMN_COUNT = 5;

export function KycRow({ kyc, onApprove, onReject, isApproving, isRejecting }: Props) {
  const [expanded, setExpanded] = useState(false);
  const canAct = kyc.kycStatus === "Pending" || (!kyc.isApproved && !kyc.kycRejectReason);

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-accent/40"
        onClick={() => setExpanded((v) => !v)}
      >
        <TableCell className="py-3">
          <div className="flex items-center gap-3">
            <ChevronRight
              className={cn(
                "size-4 shrink-0 text-muted-foreground transition-transform",
                expanded && "rotate-90",
              )}
            />
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

        {/* Empty cell where the action buttons used to be — keeps the 5-column grid aligned. */}
        <TableCell aria-hidden />
      </TableRow>

      {expanded && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={COLUMN_COUNT} className="p-0">
            <KycDocReview
              ownerProfileId={kyc.ownerProfileId}
              ownerName={kyc.ownerName ?? "Owner"}
              canAct={canAct}
              onApprove={onApprove}
              onReject={onReject}
              isApproving={isApproving}
              isRejecting={isRejecting}
            />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
