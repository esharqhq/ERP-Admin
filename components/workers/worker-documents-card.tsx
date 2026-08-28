"use client";

import { useState } from "react";
import { ExternalLink, FileText } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CardRowsSkeleton, CardState } from "@/components/detail/card-state";
import { DocApproveModal } from "@/components/workers/doc-approve-modal";
import { DocRejectModal } from "@/components/workers/doc-reject-modal";
import { resolveFileUrl } from "@/lib/http/files";
import { normalizeStatus } from "@/lib/types/task.types";
import { cn } from "@/lib/utils";
import type { WorkerDocumentDto } from "@/lib/types/worker.types";

const TONE = {
  approved: "primary",
  rejected: "danger",
  pending: "warning",
} as const;

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
  const t = useTranslations("workers.docs");
  const tDoc = useTranslations("onboarding");
  const tDocs = useTranslations("docsWorkspace");
  const locale = useLocale();
  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);

  const status = normalizeStatus(doc.status) as keyof typeof TONE;
  const pending = status === "pending";

  // The wire value is PascalCase and the i18n keys are camelCase; `has()` guards
  // the case where the server enum grew, falling back to the raw name rather
  // than throwing. Same derivation the owner card and the review workspace use —
  // these three lists must read alike.
  const raw = doc.type ?? "other";
  const typeKey = raw.charAt(0).toLowerCase() + raw.slice(1);
  const label = tDoc.has(`docType.${typeKey}` as Parameters<typeof tDoc>[0])
    ? tDoc(`docType.${typeKey}` as Parameters<typeof tDoc>[0])
    : (doc.type ?? "—");

  function formatDate(iso: string | null): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString(locale, {
      day: "2-digit",
      month: "short",
    });
  }

  const fileHref = resolveFileUrl(doc.fileUrl);

  const provenance = pending
    ? t("uploaded", { date: formatDate(doc.createdAt) })
    : status === "rejected" && doc.rejectReason
      ? t("rejectedWith", {
          date: formatDate(doc.reviewedAt),
          reason: doc.rejectReason,
        })
      : t("decided", { date: formatDate(doc.reviewedAt) });

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 ring-1 ring-inset",
        pending
          ? "bg-status-pending-tint/50 ring-status-pending/30"
          : "ring-border",
      )}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-xs font-semibold leading-tight">
            {label}
          </span>
          {fileHref ? (
            <a
              href={fileHref}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-muted-foreground hover:text-foreground"
              aria-label={t("open", { document: label })}
            >
              <ExternalLink className="size-3" />
            </a>
          ) : null}
        </span>
        <span
          className={cn(
            "truncate text-[10px] leading-tight",
            status === "rejected"
              ? "text-status-cancelled-deep"
              : pending
                ? "text-status-pending-deep"
                : "text-muted-foreground",
          )}
        >
          {provenance}
        </span>
      </span>

      {/* Once a document is decided its buttons are *replaced* by the verdict,
          never disabled — a decided document is not a pending one waiting on a
          permission, and greying the pair out says the wrong thing. */}
      {pending ? (
        <span className="flex shrink-0 items-center gap-1">
          <Button
            size="sm"
            className="h-6 px-2 text-[11px]"
            onClick={() => setShowApprove(true)}
            disabled={isApproving}
          >
            {t("approve")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 border-destructive/40 px-2 text-[11px] text-destructive hover:text-destructive"
            onClick={() => setShowReject(true)}
            disabled={isRejecting}
          >
            {t("reject")}
          </Button>
        </span>
      ) : (
        <Badge tone={TONE[status] ?? "neutral"} className="shrink-0">
          {tDocs(`docStatus.${status}` as Parameters<typeof tDocs>[0])}
        </Badge>
      )}

      <DocApproveModal
        open={showApprove}
        onClose={() => setShowApprove(false)}
        onConfirm={() => {
          onApprove(doc.id);
          setShowApprove(false);
        }}
        isPending={isApproving}
        fileName={label}
      />
      <DocRejectModal
        open={showReject}
        onClose={() => setShowReject(false)}
        onConfirm={(reason) => {
          onReject(doc.id, reason);
          setShowReject(false);
        }}
        isPending={isRejecting}
        fileName={label}
      />
    </div>
  );
}

/**
 * The worker's documents, decided here.
 *
 * This is the one place a worker document gets a verdict, unlike the owner's —
 * whose approve and reject live in the review workspace. That asymmetry is in
 * the API, not a choice made here: a worker document carries a per-document
 * decision with its own routes, and this is the screen an admin is on when they
 * make it.
 *
 * When the query is refused the card says so in its own words. It is never
 * rendered as "no documents": that would report a fact about this worker on the
 * strength of a fact about the admin.
 */
export function WorkerDocumentsCard({
  docs,
  canRead,
  isLoading,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: {
  docs: WorkerDocumentDto[];
  /**
   * `false` when `worker:doc:read_any` is missing — the query never ran. `null`
   * while the grant set is unknown, which is not a refusal: collapsing the two
   * would tell a cold-started admin they cannot read documents they can.
   */
  canRead: boolean | null;
  isLoading: boolean;
  onApprove: (docId: string) => void;
  onReject: (docId: string, reason: string) => void;
  isApproving: boolean;
  isRejecting: boolean;
}) {
  const t = useTranslations("workers.docs");
  const pendingCount = docs.filter(
    (d) => normalizeStatus(d.status) === "pending",
  ).length;

  return (
    <Card id="worker-documents" className="scroll-mt-24">
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h2 className="font-heading text-sm font-semibold tracking-tight">
            {t("title")}
          </h2>
          <p className="text-[10px] text-muted-foreground">{t("subtitle")}</p>
        </div>
        {pendingCount > 0 ? (
          <Badge tone="warning" className="tabular-nums">
            {pendingCount}
          </Badge>
        ) : null}
      </CardHeader>

      <CardContent>
        {canRead === false ? (
          <CardState
            icon={<FileText className="size-7" />}
            title={t("refused")}
            hint={t("refusedHint")}
            note="gated · worker:doc:read_any"
          />
        ) : canRead === null || isLoading ? (
          <CardRowsSkeleton rows={3} />
        ) : docs.length === 0 ? (
          <CardState
            icon={<FileText className="size-7" />}
            title={t("empty")}
            hint={t("emptyHint")}
            note="200 · empty list"
          />
        ) : (
          <div className="flex flex-col gap-1.5">
            {docs.map((doc) => (
              <DocRow
                key={doc.id}
                doc={doc}
                onApprove={onApprove}
                onReject={onReject}
                isApproving={isApproving}
                isRejecting={isRejecting}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
