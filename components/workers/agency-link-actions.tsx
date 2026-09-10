"use client";

import { useState } from "react";
import { Check, Gavel, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { AttachDialog } from "@/components/agency-links/attach-dialog";
import { ResolveDialog } from "@/components/agency-links/resolve-dialog";
import { useConfirmLink, useRejectLink } from "@/hooks/use-agency-links";
import { useCurrentPermissions } from "@/hooks/use-current-permissions";
import { linkActions } from "@/lib/agencies/link-actions";
import { linkErrorKey } from "@/lib/agencies/link-errors";
import { portalLossOnReject } from "@/lib/agencies/portal-impact";
import type { WorkerAgencyLinkDto } from "@/lib/types/agency.types";

/**
 * The worker card's verbs — all four of them, because this is the surface that
 * carries `disputeNote`.
 *
 * ⚠ **The overrule lives here and nowhere else.** Confirming a `Disputed` link
 * is a ruling against a person's own statement about themselves, and the only
 * place that statement is readable is this card. The queue offers *"Open the
 * worker"* instead, which lands here.
 *
 * ⚠ **Confirm and overrule are two controls over one endpoint.** Which is
 * offered comes from `linkActions`, never from the operator — a shared button
 * that silently became an overrule is what the guide calls the wrong UI.
 *
 * ⚠ **Nothing here notifies the worker except attach.** Confirm and reject send
 * nothing at all, so no copy may imply the worker will hear the outcome.
 */
export function AgencyLinkActions({
  workerId,
  link,
}: {
  workerId: string;
  link: WorkerAgencyLinkDto | null | undefined;
}) {
  const t = useTranslations("agencyLinks");
  const tErrors = useTranslations("agencyLinks.errors");

  const [open, setOpen] = useState<
    "attach" | "confirm" | "overrule" | "reject" | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const { permissions } = useCurrentPermissions();
  const canManage =
    permissions !== null && permissions.has("agency_link:manage_any");

  const confirm = useConfirmLink();
  const reject = useRejectLink();

  function message(err: unknown): string {
    const { key, detail } = linkErrorKey(err);
    return key === "generic" && detail ? detail : tErrors(key);
  }

  function close() {
    setOpen(null);
    setError(null);
  }

  // Nothing at all for a MODERATOR: they hold the read grant and no write grant,
  // and a disabled button implies the refusal is temporary.
  if (!canManage) return null;

  // No live link — the only act is to create one.
  if (!link) {
    return (
      <>
        <Button
          size="sm"
          className="w-fit gap-1.5"
          onClick={() => setOpen("attach")}
        >
          <Plus className="size-3.5" />
          {t("verbs.attach")}
        </Button>
        {open === "attach" ? (
          <AttachDialog open onClose={close} workerId={workerId} />
        ) : null}
      </>
    );
  }

  const verbs = linkActions(link, canManage);

  // `Rejected` — terminal. ⚠ And the sentence must not say the worker is
  // independent: `null` covers three states the backend cannot tell apart.
  if (!verbs.confirm && !verbs.overrule && !verbs.reject) {
    return (
      <p className="text-[12px] leading-snug text-muted-foreground text-pretty">
        {t("rejected.body")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {verbs.confirm ? (
          <Button size="sm" className="gap-1.5" onClick={() => setOpen("confirm")}>
            <Check className="size-3.5" />
            {t("verbs.confirm")}
          </Button>
        ) : null}

        {/*
          ⚠ Its own control, its own tone, its own word — never "Confirm", even
          though it posts to the same endpoint. The short label fits the button;
          `title` carries the full act, because "Overrule" alone does not say
          whom.
        */}
        {verbs.overrule ? (
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5"
            title={t("verbs.overrule")}
            onClick={() => setOpen("overrule")}
          >
            <Gavel className="size-3.5" />
            {t("verbs.overruleShort")}
          </Button>
        ) : null}

        {verbs.reject ? (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setOpen("reject")}
          >
            <X className="size-3.5" />
            {t("verbs.reject")}
          </Button>
        ) : null}
      </div>

      {/* Explains a footer that offers only Reject on a row that is genuinely
          not ours to close. */}
      {link.status === "Proposed" && link.setByUserType === "ADMIN" ? (
        <p className="text-[12px] leading-snug text-muted-foreground text-pretty">
          {t("waiting.worker")}
        </p>
      ) : null}

      {open === "confirm" ? (
        <ResolveDialog
          open
          onClose={close}
          title={t("verbs.confirmTitle")}
          body={t("verbs.confirmHint")}
          submitLabel={t("verbs.confirmSubmit")}
          requireReason={false}
          pending={confirm.isPending}
          error={error}
          onSubmit={(reason) =>
            confirm.mutate(
              { id: link.id, workerId, body: reason ? { reason } : {} },
              { onSuccess: close, onError: (err) => setError(message(err)) },
            )
          }
        />
      ) : null}

      {open === "overrule" ? (
        <ResolveDialog
          open
          onClose={close}
          title={t("overrule.title")}
          body={t("overrule.body")}
          submitLabel={t("overrule.submit")}
          // Always required: this is a ruling, and the reason is the record of it.
          requireReason
          destructive
          /*
            ⚠ The second step. Same endpoint as `confirm`, and this is what keeps
            the two acts from feeling like the same button. The submit label is
            deliberately unchanged between the steps: the second step changes the
            *explanation*, not the promise.
          */
          secondStep={{
            body: t("overrule.confirmStep"),
            submitLabel: t("overrule.submit"),
          }}
          pending={confirm.isPending}
          error={error}
          onSubmit={(reason) =>
            confirm.mutate(
              { id: link.id, workerId, body: { reason } },
              { onSuccess: close, onError: (err) => setError(message(err)) },
            )
          }
        />
      ) : null}

      {open === "reject" ? (
        <ResolveDialog
          open
          onClose={close}
          title={t("verbs.rejectTitle")}
          /*
            ⚠ Only on a `Confirmed` link, and `undefined` otherwise — a
            `Proposed` or `Disputed` link is not in the agency's portal, so the
            warning would describe a loss that cannot happen. Both reject
            surfaces read the same predicate; neither checks the status itself.
          */
          warning={
            portalLossOnReject(link) ? t("verbs.rejectPortalWarning") : undefined
          }
          submitLabel={t("verbs.rejectSubmit")}
          requireReason
          destructive
          pending={reject.isPending}
          error={error}
          onSubmit={(reason) =>
            reject.mutate(
              { id: link.id, workerId, body: { reason } },
              { onSuccess: close, onError: (err) => setError(message(err)) },
            )
          }
        />
      ) : null}
    </div>
  );
}
