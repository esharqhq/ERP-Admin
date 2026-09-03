"use client";

import { useState } from "react";
import { CheckCircle2, Info, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { OnboardingStatus } from "@/lib/types/onboarding.types";
import { cn } from "@/lib/utils";
import { RejectDialog } from "./reject-dialog";

/**
 * The decision on the **submission** — the only thing on this screen that reaches
 * the owner.
 *
 * Four stages, four different sentences. The design is explicit that *"no action
 * available"* is the wrong copy for all of them: it sends an admin looking for a
 * button that is correctly absent. At `Kyc` nothing has been submitted; at
 * `Rejected` the ball is with the owner; at `Approved`/`Active` it is already
 * answered. Only `Review` carries the buttons — the server answers
 * `400 invalid_onboarding_transition` from anywhere else.
 */

type Stage = "kyc" | "review" | "rejected" | "decided";

function stageOf(status: OnboardingStatus): Stage {
  if (status === "Review") return "review";
  if (status === "Rejected") return "rejected";
  if (status === "Kyc") return "kyc";
  return "decided";
}

export function DecisionBlock({
  status,
  rejectReason,
  canApprove,
  canReject,
  busy,
  onApprove,
  onReject,
}: {
  status: OnboardingStatus;
  /** The reason already on file, shown at `Rejected`. */
  rejectReason: string | null;
  /**
   * `kyc:approve` and `kyc:reject` are **separate** backend permissions, so each
   * verb is gated on its own — an admin may hold one and not the other. Tri-state:
   * `null` while the grant set is unknown, so a cold start does not assert a
   * refusal for one paint. The buttons wait; the copy does not.
   */
  canApprove: boolean | null;
  canReject: boolean | null;
  busy?: boolean;
  onApprove: () => void;
  onReject: (reason: string) => void;
}) {
  const t = useTranslations("docsWorkspace.detail");
  const [rejecting, setRejecting] = useState(false);
  const stage = stageOf(status);

  return (
    <section
      className={cn(
        "flex flex-col gap-2.5 rounded-xl p-3.5 ring-1",
        stage === "review"
          ? "bg-accent/40 ring-primary/20"
          : stage === "rejected"
            ? "bg-status-cancelled-tint/50 ring-status-cancelled/20"
            : "bg-muted/50 ring-foreground/10",
      )}
    >
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {t("decisionTitle")}
      </span>

      <p className="text-[12.5px] font-semibold leading-snug">{t(`decision.${stage}.title`)}</p>
      <p className="text-[11.5px] leading-snug text-ink-soft text-pretty">
        {t(`decision.${stage}.body`)}
      </p>

      {/* The reason already on file. At `Rejected` this is the whole state of the
          screen — what the owner was told, and what they are fixing. */}
      {stage === "rejected" && rejectReason && (
        <p className="rounded-lg bg-card px-3 py-2 text-[12px] leading-snug text-foreground text-pretty ring-1 ring-foreground/10">
          {rejectReason}
        </p>
      )}

      {stage === "review" && (
        <>
          <div className="flex items-start gap-2 rounded-lg bg-card/70 px-3 py-2">
            <Info className="mt-px size-3.5 shrink-0 text-muted-foreground" />
            <p className="text-[11.5px] leading-snug text-ink-soft text-pretty">
              {t("decisionOnlyThis")}
            </p>
          </div>

          {canApprove === false && canReject === false ? (
            <p className="text-[11.5px] leading-snug text-muted-foreground text-pretty">
              {t("decisionForbidden")}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {canApprove !== false && (
                <Button
                  className="flex-1 gap-1.5"
                  disabled={busy || canApprove === null}
                  onClick={onApprove}
                >
                  <CheckCircle2 className="size-4" />
                  {t("approveSubmission")}
                </Button>
              )}
              {canReject !== false && (
                <Button
                  variant="outline"
                  className="flex-1 gap-1.5"
                  disabled={busy || canReject === null}
                  onClick={() => setRejecting(true)}
                >
                  <XCircle className="size-4" />
                  {t("rejectSubmission")}
                </Button>
              )}
            </div>
          )}

          {/* Approval is the first half of one action. Saying so here is what
              stops an admin approving and walking away believing the owner is
              live — they are not; cover starts when a signed contract does. */}
          <p className="text-[11px] leading-snug text-muted-foreground text-pretty">
            {t("decisionApprovalNext")}
          </p>
        </>
      )}

      <RejectDialog
        open={rejecting}
        onOpenChange={setRejecting}
        title={t("rejectSubmissionTitle")}
        description={t("rejectSubmissionBody")}
        placeholder={t("rejectSubmissionPlaceholder")}
        confirmLabel={t("rejectSubmission")}
        busy={busy}
        onConfirm={(reason) => {
          onReject(reason);
          setRejecting(false);
        }}
      />
    </section>
  );
}
