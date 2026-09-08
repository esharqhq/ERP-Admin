"use client";

import { Gavel, MessageSquareWarning } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { formatDay } from "@/lib/ui/relative-time";
import type { AgencyApplicationDetailDto } from "@/lib/types/agency.types";

/**
 * What has already been said about this application.
 *
 * ⚠ **`infoRequestNote` and `decisionReason` are two columns and both survive.**
 * Reject never writes the first; request-info never writes the second. If both
 * are populated, **both happened** — an admin asked for a clearer scan and then
 * decided — and rendering only the latest destroys half the record of why
 * (`f-05-a-application-review.md`: *"Render both; showing only one loses half the
 * story."*).
 *
 * So this is a two-entry history, not one "latest note" slot.
 *
 * ⚠ **No reviewer name.** The detail carries `reviewedByAdminId` and nothing
 * else — no name, and no route here resolves an admin id — so the entry is dated
 * and unattributed rather than labelled with a raw guid.
 */
export function ReviewHistory({
  application,
}: {
  application: AgencyApplicationDetailDto;
}) {
  const t = useTranslations("agencyRequests.history");
  const locale = useLocale();

  const entries = [
    application.infoRequestNote
      ? {
          key: "info" as const,
          icon: <MessageSquareWarning aria-hidden className="size-3.5" />,
          label: t("infoRequested"),
          text: application.infoRequestNote,
        }
      : null,
    application.decisionReason
      ? {
          key: "decision" as const,
          icon: <Gavel aria-hidden className="size-3.5" />,
          label: t("decision"),
          text: application.decisionReason,
        }
      : null,
  ].filter((e): e is NonNullable<typeof e> => e !== null);

  if (entries.length === 0) {
    return <p className="text-[13px] text-muted-foreground">{t("empty")}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {entries.map((e) => (
        <div key={e.key} className="flex flex-col gap-1">
          <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            {e.icon}
            {e.label}
          </span>
          <p className="text-[13px] leading-snug text-foreground/90 text-pretty">
            {e.text}
          </p>
        </div>
      ))}
      {application.reviewedAt ? (
        <span className="font-mono text-[11px] text-muted-foreground">
          {formatDay(application.reviewedAt, locale)}
        </span>
      ) : null}
    </div>
  );
}
