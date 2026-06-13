"use client";

import { useState } from "react";
import { FileText, ExternalLink, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useKycProfile } from "@/hooks/use-kyc";
import { KycApproveModal } from "./kyc-approve-modal";
import { KycRejectModal } from "./kyc-reject-modal";
import type { KycDocDto } from "@/lib/types/kyc.types";

interface Props {
  ownerProfileId: string;
  ownerName: string;
  canAct: boolean;
  onApprove: (ownerProfileId: string) => void;
  onReject: (ownerProfileId: string, reason: string) => void;
  isApproving: boolean;
  isRejecting: boolean;
}

interface Mark {
  wrong: boolean;
  note: string;
}

function docLabel(doc: KycDocDto): string {
  return doc.fileName ?? doc.type ?? "Document";
}

export function KycDocReview({
  ownerProfileId,
  ownerName,
  canAct,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: Props) {
  const t = useTranslations("owners");
  const tCommon = useTranslations("common");
  const { data: profile, isLoading, isError } = useKycProfile(ownerProfileId, true);

  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);

  function toggleWrong(docId: string) {
    setMarks((prev) => {
      const current = prev[docId] ?? { wrong: false, note: "" };
      return { ...prev, [docId]: { ...current, wrong: !current.wrong } };
    });
  }

  function setNote(docId: string, note: string) {
    setMarks((prev) => {
      const current = prev[docId] ?? { wrong: true, note: "" };
      return { ...prev, [docId]: { ...current, note } };
    });
  }

  // Compose a single whole-profile reject reason from the docs marked wrong.
  function composedReason(docs: KycDocDto[]): string {
    return docs
      .filter((d) => marks[d.id]?.wrong)
      .map((d) => {
        const note = marks[d.id]?.note.trim();
        return note ? `«${docLabel(d)}»: ${note}` : `«${docLabel(d)}»`;
      })
      .join("\n");
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <p className="flex items-center gap-2 p-4 text-sm text-destructive">
        <AlertTriangle className="size-4" />
        {t("kyc.docLoadError")}
      </p>
    );
  }

  const docs = profile.documents ?? [];

  return (
    <div className="flex flex-col gap-3 bg-muted/30 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {t("kyc.submittedDocuments")}
      </p>

      {docs.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("kyc.documentsEmpty")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {docs.map((doc) => {
            const mark = marks[doc.id];
            const isWrong = mark?.wrong ?? false;
            return (
              <div
                key={doc.id}
                className={cn(
                  "flex flex-col gap-2 rounded-lg border bg-card p-3 transition-colors",
                  isWrong ? "border-destructive ring-1 ring-destructive/30" : "border-border",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <FileText className="size-4" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-[13px] font-medium">{docLabel(doc)}</span>
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
                    {canAct && (
                      <Button
                        size="sm"
                        variant={isWrong ? "destructive" : "outline"}
                        onClick={() => toggleWrong(doc.id)}
                      >
                        {t("kyc.markWrong")}
                      </Button>
                    )}
                  </div>
                </div>
                {canAct && isWrong && (
                  <input
                    type="text"
                    value={mark?.note ?? ""}
                    onChange={(e) => setNote(doc.id, e.target.value)}
                    placeholder={t("kyc.markWrongNote")}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {!canAct && profile.kycRejectReason && (
        <p className="rounded-md bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <span className="font-semibold">{t("kyc.rejectReasonLabel")}: </span>
          {profile.kycRejectReason}
        </p>
      )}

      {canAct && (
        <div className="flex justify-end gap-2 border-t border-border pt-3">
          <Button size="sm" onClick={() => setShowApprove(true)} disabled={isApproving}>
            {isApproving && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
            {tCommon("approve")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowReject(true)}
            disabled={isRejecting}
            className="text-destructive hover:bg-destructive/10"
          >
            {tCommon("reject")}
          </Button>
        </div>
      )}

      <KycApproveModal
        open={showApprove}
        onClose={() => setShowApprove(false)}
        onConfirm={() => {
          onApprove(ownerProfileId);
          setShowApprove(false);
        }}
        isPending={isApproving}
        ownerName={ownerName}
      />
      <KycRejectModal
        open={showReject}
        onClose={() => setShowReject(false)}
        onConfirm={(reason) => {
          onReject(ownerProfileId, reason);
          setShowReject(false);
        }}
        isPending={isRejecting}
        ownerName={ownerName}
        initialReason={composedReason(docs)}
      />
    </div>
  );
}
