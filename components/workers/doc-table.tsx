"use client";

import { useState } from "react";
import { FileText, ExternalLink, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { normalizeStatus } from "@/lib/types/task.types";
import { DocApproveModal } from "./doc-approve-modal";
import { DocRejectModal } from "./doc-reject-modal";
import type { WorkerDocumentDto } from "@/lib/types/worker.types";

function DocStatusBadge({ status }: { status: string }) {
  const s = normalizeStatus(status);
  const variant =
    s === "approved" ? "default" : s === "rejected" ? "destructive" : "secondary";
  return <Badge variant={variant}>{status || "—"}</Badge>;
}

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
  const isPending = normalizeStatus(doc.status) === "pending";

  return (
    <>
      <TableRow className="group/row hover:bg-accent/40">
        <TableCell className="py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <FileText className="size-3.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{fileName}</span>
              {doc.rejectReason ? (
                <span className="text-xs text-destructive">{doc.rejectReason}</span>
              ) : null}
            </div>
          </div>
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {doc.type ?? "—"}
        </TableCell>
        <TableCell>
          <DocStatusBadge status={doc.status} />
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
            {isPending ? (
              <>
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
              </>
            ) : doc.reviewedAt ? (
              <span className="text-xs text-muted-foreground">
                {t("docReviewed", {
                  date: new Date(doc.reviewedAt).toLocaleDateString(locale, {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  }),
                })}
              </span>
            ) : null}
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
            <TableHead>{t("docFileName")}</TableHead>
            <TableHead>{t("docTypeLabel")}</TableHead>
            <TableHead>{t("docStatusLabel")}</TableHead>
            <TableHead>{t("docUploadDate")}</TableHead>
            <TableHead className="text-right">{tCommon("actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={5}>
                  <Skeleton className="h-8 w-full rounded-md" />
                </TableCell>
              </TableRow>
            ))
          ) : docs.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
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
