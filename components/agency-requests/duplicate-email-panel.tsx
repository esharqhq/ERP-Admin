"use client";

import { Building2, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

/**
 * Approve's one refusal that needs a screen rather than a toast.
 *
 * `agency_email_taken` means a **live agency** already holds this login address,
 * so no second account can be built on it. That is usually the same company
 * applying twice, which is a decision to make and not an error to dismiss — so
 * this panel names the agency in the way, links it, and offers the honest next
 * step.
 *
 * ⚠ **The link always resolves.** Since 2026-09-08 only a live agency can block
 * an approve — a deleted one releases its email — so `existingAgencyId` names a
 * row that exists. The panel still renders without the link if the two keys are
 * missing, because a refusal must produce a usable message rather than a crash.
 *
 * ⚠ **It links the list pre-searched, not a detail route.** There is no
 * `/dashboard/agencies/{id}` — phase 2 deliberately gave those rows no `rowHref`
 * until one exists — but the list reads `?q=` out of the URL and searches the
 * legal name with `looseIncludes`, so this lands on the one row and the label's
 * promise holds.
 */
export function DuplicateEmailPanel({
  blocking,
  onRejectAsDuplicate,
}: {
  blocking?: { id: string; legalName: string };
  onRejectAsDuplicate: () => void;
}) {
  const t = useTranslations("agencyRequests.duplicate");

  return (
    <div className="flex flex-col gap-2.5 rounded-xl bg-status-cancelled-tint p-3.5 ring-1 ring-inset ring-status-cancelled/25">
      <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-status-cancelled">
        <TriangleAlert aria-hidden className="size-4 shrink-0" />
        {t("title")}
      </span>
      <p className="text-[12.5px] leading-snug text-foreground/90 text-pretty">
        {t("body")}
      </p>
      <div className="flex flex-wrap gap-2">
        {blocking ? (
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            className="gap-1.5"
            render={
              <Link
                href={`/dashboard/agencies?q=${encodeURIComponent(blocking.legalName)}`}
              />
            }
          >
            <Building2 className="size-3.5" />
            {t("viewAgency", { name: blocking.legalName })}
          </Button>
        ) : null}
        <Button variant="destructive" size="sm" onClick={onRejectAsDuplicate}>
          {t("rejectAsDuplicate")}
        </Button>
      </div>
    </div>
  );
}
