"use client";

import { useState } from "react";
import { FileText, ExternalLink, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocale, useTranslations } from "next-intl";
import { DocApproveModal } from "./doc-approve-modal";
import { DocRejectModal } from "./doc-reject-modal";
import type { WorkerDocumentDto } from "@/lib/types/worker.types";

interface Props {
  docs: WorkerDocumentDto[];
  isLoading?: boolean;
  onApprove: (docId: string) => void;
  onReject: (docId: string, reason: string) => void;
  isApproving: boolean;
  isRejecting: boolean;
}

function DocRow({
  doc,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: {
  doc: WorkerDocumentDto;
  onApprove: (docId: string) => void;
  onReject: (docId: string, reason: string) => void;
  isApproving: boolean;
  isRejecting: boolean;
}) {
  const t = useTranslations("workers");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const fileName = doc.fileName ?? doc.type ?? "Document";

  return (
    <>
      <TableRow className="group/row hover:bg-accent/40">
        <TableCell className="py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <FileText className="size-3.5" />
            </div>
            <span className="text-sm font-medium">{fileName}</span>
          </div>
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {doc.type ?? "—"}
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {new Date(doc.createdAt).toLocaleDateString(locale, {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          })}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-1">
            {doc.fileUrl && (
              <Button
                size="sm"
                variant="ghost"
                nativeButton={false}
                className="gap-1 text-muted-foreground"
                render={
                  <a href={doc.fileUrl} target="_blank" rel="noreferrer" />
                }
              >
                <ExternalLink className="size-3.5" />
                {tCommon("view")}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => setShowApprove(true)}
              disabled={isApproving}
            >
              <CheckCircle className="size-3.5" />
              {t("approve")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="gap-1 text-destructive hover:bg-destructive/10"
              onClick={() => setShowReject(true)}
              disabled={isRejecting}
            >
              <XCircle className="size-3.5" />
              {t("reject")}
            </Button>
          </div>
        </TableCell>
      </TableRow>

      <DocApproveModal
        open={showApprove}
        onClose={() => setShowApprove(false)}
        onConfirm={() => {
          onApprove(doc.id);
          setShowApprove(false);
        }}
        isPending={isApproving}
        fileName={fileName}
      />
      <DocRejectModal
        open={showReject}
        onClose={() => setShowReject(false)}
        onConfirm={(reason) => {
          onReject(doc.id, reason);
          setShowReject(false);
        }}
        isPending={isRejecting}
        fileName={fileName}
      />
    </>
  );
}

export function DocTable({
  docs,
  isLoading,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: Props) {
  const t = useTranslations("workers");
  const tCommon = useTranslations("common");

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="font-heading text-base font-semibold">{t("documents")}</h2>
        {!isLoading && (
          <span className="text-xs text-muted-foreground">{docs.length}</span>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>File Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Upload Date</TableHead>
            <TableHead className="text-right">{tCommon("actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={4}>
                  <Skeleton className="h-8 w-full rounded-md" />
                </TableCell>
              </TableRow>
            ))
          ) : docs.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={4}
                className="py-8 text-center text-sm text-muted-foreground"
              >
                {t("docNotFound")}
              </TableCell>
            </TableRow>
          ) : (
            docs.map((doc) => (
              <DocRow
                key={doc.id}
                doc={doc}
                onApprove={onApprove}
                onReject={onReject}
                isApproving={isApproving}
                isRejecting={isRejecting}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
