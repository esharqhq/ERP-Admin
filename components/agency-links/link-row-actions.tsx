"use client";

import { useState } from "react";
import { Check, ExternalLink, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ResolveDialog } from "@/components/agency-links/resolve-dialog";
import { useConfirmLink, useRejectLink } from "@/hooks/use-agency-links";
import { linkActions } from "@/lib/agencies/link-actions";
import { linkErrorKey } from "@/lib/agencies/link-errors";
import type { AgencyLinkRowDto } from "@/lib/types/agency.types";

/**
 * What a queue row offers.
 *
 * ⚠ **The overrule is deliberately absent here.** `AgencyLinkRowDto` does not
 * carry `disputeNote`, and there is no `GET /api/admin/agency-links/{id}` — so
 * this row physically cannot show what an admin would be ruling against. A
 * disputed row therefore offers *"Open the worker"*, whose card carries the
 * objection, and the overrule lives there.
 *
 * That is the general rule this screen follows: **a verb is offered where the
 * row carries the fact the decision needs.** Confirming a worker's claim needs
 * only the two names, both on the row; rejecting needs only a reason the admin
 * types.
 *
 * ⚠ **An empty cell for a MODERATOR, not disabled buttons.** They hold the read
 * grant and no write grant (`DatabaseSeeder.cs:1954`), and a disabled control
 * implies the refusal is temporary.
 */
export function LinkRowActions({
  link,
  canManage,
}: {
  link: AgencyLinkRowDto;
  canManage: boolean;
}) {
  const t = useTranslations("agencyLinks");
  const tErrors = useTranslations("agencyLinks.errors");

  const [open, setOpen] = useState<"confirm" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const confirm = useConfirmLink();
  const reject = useRejectLink();

  const verbs = linkActions(link, canManage);

  function message(err: unknown): string {
    const { key, detail } = linkErrorKey(err);
    return key === "generic" && detail ? detail : tErrors(key);
  }

  function close() {
    setOpen(null);
    setError(null);
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      {/* A disputed row's only action: read the objection first. Offered
          regardless of the manage grant — reading is not deciding. */}
      {link.status === "Disputed" ? (
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          className="gap-1.5"
          render={<Link href={`/dashboard/workers/${link.workerId}`} />}
        >
          <ExternalLink className="size-3.5" />
          {t("verbs.openWorker")}
        </Button>
      ) : null}

      {verbs.confirm ? (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => {
            setError(null);
            setOpen("confirm");
          }}
        >
          <Check className="size-3.5" />
          {t("verbs.confirm")}
        </Button>
      ) : null}

      {verbs.reject ? (
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("verbs.reject")}
          title={t("verbs.reject")}
          onClick={() => {
            setError(null);
            setOpen("reject");
          }}
        >
          <X className="size-4" />
        </Button>
      ) : null}

      {open === "confirm" ? (
        <ResolveDialog
          open
          onClose={close}
          title={t("verbs.confirmTitle")}
          body={t("verbs.confirmHint")}
          submitLabel={t("verbs.confirmSubmit")}
          // ⚠ Optional here, and only here: agreeing with a worker's own claim
          // is not the overrule.
          requireReason={false}
          pending={confirm.isPending}
          error={error}
          onSubmit={(reason) =>
            confirm.mutate(
              {
                id: link.id,
                workerId: link.workerId,
                body: reason ? { reason } : {},
              },
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
          submitLabel={t("verbs.rejectSubmit")}
          requireReason
          destructive
          pending={reject.isPending}
          error={error}
          onSubmit={(reason) =>
            reject.mutate(
              { id: link.id, workerId: link.workerId, body: { reason } },
              { onSuccess: close, onError: (err) => setError(message(err)) },
            )
          }
        />
      ) : null}
    </div>
  );
}
