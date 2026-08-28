"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { verdictOf } from "@/lib/onboarding/doc-set";
import type { KycDocDto } from "@/lib/types/kyc.types";
import { RejectDialog } from "./reject-dialog";

/**
 * The decision on the **file** currently open, under the viewer.
 *
 * Two things this has to keep saying, both of which an admin gets wrong once and
 * then never again:
 *
 * - **It is silent.** A file verdict moves no status and notifies nobody. The
 *   line is beside the buttons because an admin who approves four files and
 *   leaves believes they have done the job.
 * - **A decided file shows its verdict *instead of* the buttons, never disabled
 *   ones.** A greyed-out Approve reads as "you lack the permission"; the verdict
 *   reads as "this is already answered", which is what is true.
 */
export function VerdictRow({
  doc,
  canApprove,
  canReject,
  busy,
  onApprove,
  onReject,
}: {
  doc: KycDocDto;
  /**
   * Two grants, not one. `kyc:approve` and `kyc:reject` are separate permissions
   * on the backend (`KycController.cs:263-340`), so an admin can genuinely hold
   * one and not the other — the design assumed a single `kyc:review` gate and is
   * wrong about it. Each verb renders only if its own grant is held.
   *
   * `null` means the grant set has not resolved yet: the button waits rather than
   * asserting a refusal for one paint on a cold start.
   */
  canApprove: boolean | null;
  canReject: boolean | null;
  busy?: boolean;
  onApprove: (docId: string) => void;
  onReject: (docId: string, reason: string) => void;
}) {
  const t = useTranslations("docsWorkspace.detail");
  const [rejecting, setRejecting] = useState(false);
  const verdict = verdictOf(doc.status);
  const canDecide = canApprove !== false || canReject !== false;

  return (
    <div className="flex flex-col gap-2.5 rounded-xl bg-card p-3.5 shadow-card ring-1 ring-foreground/10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[12.5px] font-semibold">{t("fileVerdictTitle")}</span>
          <span className="text-[11.5px] leading-snug text-ink-soft text-pretty">
            {t("fileVerdictSilent")}
          </span>
        </div>

        {verdict === "pending" && canDecide ? (
          <div className="flex shrink-0 items-center gap-2">
            {canReject !== false && (
              <Button
                variant="outline"
                size="sm"
                disabled={busy || canReject === null}
                onClick={() => setRejecting(true)}
                className="gap-1.5"
              >
                <X className="size-4" />
                {t("rejectFile")}
              </Button>
            )}
            {canApprove !== false && (
              <Button
                size="sm"
                disabled={busy || canApprove === null}
                onClick={() => onApprove(doc.id)}
                className="gap-1.5"
              >
                <Check className="size-4" />
                {t("approveFile")}
              </Button>
            )}
          </div>
        ) : (
          <Badge
            tone={
              verdict === "approved"
                ? "success"
                : verdict === "rejected"
                  ? "danger"
                  : "neutral"
            }
            className="shrink-0"
          >
            {t(
              verdict === "approved"
                ? "verdictApproved"
                : verdict === "rejected"
                  ? "verdictRejected"
                  : "verdictPending",
            )}
          </Badge>
        )}
      </div>

      {/* The reason travels with the verdict. Without it the row says a file was
          refused and not what has to change about it. */}
      {verdict === "rejected" && doc.rejectReason && (
        <p className="rounded-lg bg-status-cancelled-tint px-3 py-2 text-[12px] leading-snug text-status-cancelled text-pretty">
          {doc.rejectReason}
        </p>
      )}

      <RejectDialog
        open={rejecting}
        onOpenChange={setRejecting}
        title={t("rejectFileTitle")}
        description={t("rejectFileBody")}
        placeholder={t("rejectFilePlaceholder")}
        confirmLabel={t("rejectFile")}
        busy={busy}
        onConfirm={(reason) => {
          onReject(doc.id, reason);
          setRejecting(false);
        }}
      />
    </div>
  );
}
