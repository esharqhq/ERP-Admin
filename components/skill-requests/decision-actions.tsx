"use client";

import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";
import { ReasonDialog } from "@/components/skill-requests/reason-dialog";
import {
  useApproveSkillRequest,
  useRejectSkillRequest,
  useRequestSkillInfo,
  useRevokeSkillRequest,
} from "@/hooks/use-skill-requests";
import { newIdempotencyKey } from "@/lib/http/idempotency";
import { canOfferRevoke } from "@/lib/skill-requests/display";
import { skillRequestErrorKey } from "@/lib/skill-requests/errors";
import type { SkillRequestDetailDto } from "@/lib/types/skill-request.types";

/** The three verbs that need a piece of text before they fire. */
type Verb = "info" | "reject" | "revoke";

/**
 * The four decision verbs — F-06a §9 and §10.
 *
 * ⚠ **Everything here sits behind `Can` on `worker_profession_request:manage` and is
 * HIDDEN without it.** A MODERATOR holds the read and none of the writes, and the
 * refusal is a `403` with a **completely empty body** — no JSON, no code, nothing to
 * render. Letting them click into that is letting them click into a blank failure,
 * so the controls are absent instead.
 *
 * Approve is offered from `Pending` **and** `InfoRequested`: an admin who asked a
 * question and then made up their mind does not need it answered first. Request-info
 * is `Pending`-only, because from `InfoRequested` the ball is already with the
 * worker.
 */
export function DecisionActions({ detail }: { detail: SkillRequestDetailDto }) {
  const t = useTranslations("skillRequests");
  const { request, heldSkills } = detail;

  const [verb, setVerb] = useState<Verb | null>(null);

  /**
   * The approve key, held across retries of one intent. `lib/http/idempotency.ts` is
   * explicit that the CALLER mints and holds it — minting per call gives every retry,
   * including a double-click, a fresh key, which means the header protects against
   * nothing. Same `??=` ref pattern as `owner-order-dialog.tsx`.
   */
  const approveKey = useRef<string | null>(null);

  const requestInfo = useRequestSkillInfo();
  const reject = useRejectSkillRequest();
  const approve = useApproveSkillRequest();
  const revoke = useRevokeSkillRequest();

  const isOpen = request.status === "Pending" || request.status === "InfoRequested";
  const showRevoke = canOfferRevoke({
    status: request.status,
    professionCode: request.professionCode,
    heldSkillCount: heldSkills.length,
  });

  const message = (err: unknown) => t(`errors.${skillRequestErrorKey(err)}`);
  const close = () => setVerb(null);

  // Nothing to offer at all — a decided request an admin may not revoke. Rendering
  // the empty `Can` wrapper would leave a stray gap under the panels.
  if (!isOpen && !showRevoke) return null;

  /**
   * The open dialog's whole configuration. The three verbs differ only in their copy
   * and which mutation they fire, and exactly one can be open at a time, so they
   * share one instance rather than three near-identical blocks.
   *
   * ⚠ Every one of these texts **is shown to the worker** — there is no
   * internal-only field in this feature.
   */
  const dialogs: Record<
    Verb,
    {
      title: string;
      description: string;
      confirmLabel: string;
      destructive?: boolean;
      pending: boolean;
      error: unknown;
      run: (text: string) => void;
    }
  > = {
    info: {
      title: t("dialogs.requestInfoTitle"),
      description: t("dialogs.requestInfoDescription"),
      confirmLabel: t("dialogs.send"),
      pending: requestInfo.isPending,
      error: requestInfo.error,
      run: (note) =>
        requestInfo.mutate({ id: request.id, body: { note } }, { onSuccess: close }),
    },
    reject: {
      title: t("dialogs.rejectTitle"),
      description: t("dialogs.rejectDescription"),
      confirmLabel: t("actions.reject"),
      destructive: true,
      pending: reject.isPending,
      error: reject.error,
      run: (reason) =>
        reject.mutate({ id: request.id, body: { reason } }, { onSuccess: close }),
    },
    revoke: {
      title: t("dialogs.revokeTitle"),
      description: t("dialogs.revokeDescription"),
      confirmLabel: t("actions.revoke"),
      destructive: true,
      pending: revoke.isPending,
      // ⚠ `skill_in_use_by_live_work` lands here and the dialog stays open, so the
      // admin can retry once the blocking work finishes rather than being told no.
      error: revoke.error,
      run: (reason) =>
        revoke.mutate({ id: request.id, body: { reason } }, { onSuccess: close }),
    },
  };

  const active = verb ? dialogs[verb] : null;

  return (
    <Can permission="worker_profession_request:manage">
      <div className="flex flex-wrap items-center gap-2">
        {isOpen && (
          <>
            <Button
              onClick={() => {
                approveKey.current ??= newIdempotencyKey();
                approve.mutate(
                  { id: request.id, idempotencyKey: approveKey.current },
                  // Cleared on success so a later, genuinely new attempt on this
                  // screen mints its own key rather than replaying this one.
                  { onSuccess: () => (approveKey.current = null) },
                );
              }}
              disabled={approve.isPending}
            >
              {approve.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t("actions.approve")}
            </Button>

            <Button variant="destructive" onClick={() => setVerb("reject")}>
              {t("actions.reject")}
            </Button>

            {request.status === "Pending" && (
              <Button variant="outline" onClick={() => setVerb("info")}>
                {t("actions.requestInfo")}
              </Button>
            )}
          </>
        )}

        {showRevoke && (
          <Button variant="destructive" onClick={() => setVerb("revoke")}>
            {t("actions.revoke")}
          </Button>
        )}

        {/* Approve has no dialog to carry its own error, so it reports inline. */}
        {approve.error != null && (
          <p className="text-sm text-destructive">{message(approve.error)}</p>
        )}
      </div>

      {/* Mounted only while open: the draft text lives in the dialog's own state,
          and one kept mounted would hand an abandoned rejection reason to whoever
          next opens "Ask for more information". */}
      {active && (
        <ReasonDialog
          open
          onClose={close}
          title={active.title}
          description={active.description}
          confirmLabel={active.confirmLabel}
          destructive={active.destructive}
          pending={active.pending}
          error={active.error ? message(active.error) : null}
          onConfirm={active.run}
        />
      )}
    </Can>
  );
}
