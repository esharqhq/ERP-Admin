"use client";

import { useState } from "react";
import { FileText, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { DocApproveModal } from "./doc-approve-modal";
import { DocRejectModal } from "./doc-reject-modal";
import type { WorkerDocumentDto } from "@/lib/types/worker.types";

interface Props {
  doc: WorkerDocumentDto;
  onApprove: (docId: string) => void;
  onReject: (docId: string, reason: string) => void;
  isApproving: boolean;
  isRejecting: boolean;
}

export function DocCard({ doc, onApprove, onReject, isApproving, isRejecting }: Props) {
  const t = useTranslations("workers");
  const tCommon = useTranslations("common");
  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const fileName = doc.fileName ?? doc.type ?? "Document";

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <FileText className="size-4" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[13px] font-medium">{fileName}</span>
        {doc.type && (
          <span className="text-[11px] text-muted-foreground">{doc.type}</span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        {doc.fileUrl && (
          <Button
            size="sm"
            variant="ghost"
            nativeButton={false}
            className="gap-1 text-muted-foreground"
            render={<a href={doc.fileUrl} target="_blank" rel="noreferrer" />}
          >
            <ExternalLink className="size-3.5" />
            {tCommon("view")}
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => setShowApprove(true)} disabled={isApproving}>
          {t("approve")}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowReject(true)}
          disabled={isRejecting}
          className="text-destructive hover:bg-destructive/10"
        >
          {t("reject")}
        </Button>
      </div>

      <DocApproveModal
        open={showApprove}
        onClose={() => setShowApprove(false)}
        onConfirm={() => { onApprove(doc.id); setShowApprove(false); }}
        isPending={isApproving}
        fileName={fileName}
      />
      <DocRejectModal
        open={showReject}
        onClose={() => setShowReject(false)}
        onConfirm={(reason) => { onReject(doc.id, reason); setShowReject(false); }}
        isPending={isRejecting}
        fileName={fileName}
      />
    </div>
  );
}
