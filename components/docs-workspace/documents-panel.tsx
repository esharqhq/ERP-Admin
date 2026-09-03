"use client";

import { useState } from "react";
import { Check, ExternalLink, FileText, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { resolveFileUrl } from "@/lib/http/files";
import { cn } from "@/lib/utils";
import type { OnboardingStatus } from "@/lib/types/onboarding.types";
import type { ReviewDoc } from "@/lib/types/review-doc.types";

export type { ReviewDoc } from "@/lib/types/review-doc.types";

function statusTone(status: string | null) {
  switch (status) {
    case "Approved":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    case "Rejected":
      return "bg-destructive/10 text-destructive";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function DocRow({
  doc,
  locale,
  onApprove,
  onReject,
  busy,
}: {
  doc: ReviewDoc;
  locale: string;
  onApprove: (docId: string) => void;
  onReject: (docId: string, reason: string) => void;
  busy: boolean;
}) {
  const t = useTranslations("docsWorkspace");
  const tDoc = useTranslations("onboarding");
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  const typeKey = (doc.type ?? "other").charAt(0).toLowerCase() + (doc.type ?? "other").slice(1);
  const fileHref = resolveFileUrl(doc.fileUrl);

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <div className="flex items-start gap-2">
        <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-sm font-medium" title={doc.fileName ?? ""}>
            {doc.fileName ?? "—"}
          </span>
          <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {tDoc.has(`docType.${typeKey}`) ? tDoc(`docType.${typeKey}`) : doc.type ?? "—"}
            <span aria-hidden>·</span>
            {new Date(doc.createdAt).toLocaleDateString(locale)}
          </span>
        </div>
        <Badge variant="secondary" className={cn("shrink-0", statusTone(doc.status))}>
          {t(`docStatus.${(doc.status ?? "pending").toLowerCase()}`)}
        </Badge>
      </div>

      {doc.rejectReason && (
        <p className="pl-6 text-xs text-destructive">{doc.rejectReason}</p>
      )}

      {rejecting ? (
        <div className="flex flex-col gap-2 pl-6">
          <Textarea
            autoFocus
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("docReject.placeholder")}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              disabled={!reason.trim() || busy}
              onClick={() => {
                onReject(doc.id, reason.trim());
                setRejecting(false);
                setReason("");
              }}
            >
              {t("docReject.confirm")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setRejecting(false)}>
              {t("cancel")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-1 pl-6">
          {fileHref && (
            <Button
              size="sm"
              variant="ghost"
              nativeButton={false}
              className="gap-1.5 text-muted-foreground"
              render={<a href={fileHref} target="_blank" rel="noreferrer" />}
            >
              <ExternalLink className="size-3.5" />
              {t("docView")}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5"
            disabled={busy}
            onClick={() => onApprove(doc.id)}
          >
            <Check className="size-3.5" />
            {t("docApprove")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 text-destructive"
            disabled={busy}
            onClick={() => setRejecting(true)}
          >
            <X className="size-3.5" />
            {t("docRejectAction")}
          </Button>
        </div>
      )}
    </li>
  );
}

/**
 * The right rail: what the subject sent, and the two levels of verdict on it.
 *
 * Two behaviours this panel has to be loud about, because both are counter-intuitive
 * and an admin who misses them does the wrong thing:
 *  - a per-document verdict does **not** move `onboardingStatus`; approving every file
 *    does not approve the subject;
 *  - a per-document verdict notifies **nobody**. The account-level decision is the only
 *    thing that tells the subject to come back.
 */
export function DocumentsPanel({
  docs,
  isLoading,
  locale,
  status,
  canDecideAccount,
  onApproveDoc,
  onRejectDoc,
  onApproveAccount,
  onRejectAccount,
  docBusy,
  accountBusy,
  accountRejectReason,
}: {
  docs: ReviewDoc[];
  isLoading: boolean;
  locale: string;
  /** Drives the copy that explains why a decision is or isn't available. */
  status: OnboardingStatus;
  /** Account-level approve/reject are legal only from `Review`. */
  canDecideAccount: boolean;
  onApproveDoc: (docId: string) => void;
  onRejectDoc: (docId: string, reason: string) => void;
  onApproveAccount: () => void;
  onRejectAccount: (reason: string) => void;
  docBusy: boolean;
  accountBusy: boolean;
  /** The account-level rejection already on file, if any. */
  accountRejectReason: string | null;
}) {
  const t = useTranslations("docsWorkspace");
  const [rejectingAccount, setRejectingAccount] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-heading text-base font-semibold">{t("documents.title")}</h2>
        {!isLoading && (
          <span className="text-xs text-muted-foreground">{docs.length}</span>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          {t("documents.empty")}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {docs.map((doc) => (
            <DocRow
              key={doc.id}
              doc={doc}
              locale={locale}
              onApprove={onApproveDoc}
              onReject={onRejectDoc}
              busy={docBusy}
            />
          ))}
        </ul>
      )}

      <p className="text-xs text-muted-foreground">{t("documents.silentNote")}</p>

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <h3 className="text-sm font-medium">{t("decision.title")}</h3>

        {accountRejectReason && (
          <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
            {accountRejectReason}
          </p>
        )}

        {!canDecideAccount ? (
          /* Name the actual blocker. "Not awaiting a decision" is true but useless —
             at `Kyc` the subject has not submitted yet, and no admin action can
             substitute for that. */
          <p className="text-xs text-muted-foreground">
            {status === "Kyc"
              ? t("decision.waitingForSubmission")
              : status === "Rejected"
                ? t("decision.rejectedWaiting")
                : t("decision.alreadyDecided")}
          </p>
        ) : rejectingAccount ? (
          <div className="flex flex-col gap-2">
            <Textarea
              autoFocus
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("decision.rejectPlaceholder")}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                disabled={!reason.trim() || accountBusy}
                onClick={() => {
                  onRejectAccount(reason.trim());
                  setRejectingAccount(false);
                  setReason("");
                }}
              >
                {t("decision.rejectConfirm")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setRejectingAccount(false)}
              >
                {t("cancel")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={accountBusy} onClick={onApproveAccount}>
              {t("decision.approve")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={accountBusy}
              onClick={() => setRejectingAccount(true)}
            >
              {t("decision.reject")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
