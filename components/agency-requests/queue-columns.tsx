"use client";

import { useMemo } from "react";
import { Building2, FileWarning, History } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import type { DataColumn } from "@/components/ui/data-table/types";
import { formatDay } from "@/lib/ui/relative-time";
import { statusTone } from "@/lib/agencies/application-status";
import type { AgencyApplicationRowDto } from "@/lib/types/agency.types";

/**
 * The review queue's columns — seven visible, one behind the picker.
 *
 * ⚠ **Nothing here sorts.** `compare` is ignored in server mode and `sortKey`
 * would make this the app's first `sortBy` consumer, which is its own piece of
 * work. Four of these columns could never sort anyway: `docCount`,
 * `hasAllRequiredDocs`, `source` and `previouslyRejectedCount` are computed per
 * row in SQL, so ordering on one **fails at runtime** rather than answering a
 * `400` the UI could explain.
 *
 * Two markers rather than columns of their own, both drawn as warnings and
 * neither as a verdict — see the two `⚠` comments in the cells. A plain
 * `role="img"` + `title` span, never a `Tooltip`: `TooltipProvider` is mounted
 * only inside `app-sidebar` and `filter-bar`, and a `lucide-react` icon's props
 * are `Omit<LucideProps, "ref">`, which has no `title`.
 */
export function useApplicationColumns(): DataColumn<AgencyApplicationRowDto>[] {
  const t = useTranslations("agencyRequests");
  const locale = useLocale();

  return useMemo(
    () => [
      {
        id: "company",
        label: t("columns.company"),
        className: "min-w-[220px]",
        cell: (a) => (
          <div className="flex min-w-0 items-start gap-2">
            <Building2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="flex min-w-0 flex-col gap-px">
              <span className="truncate font-medium">{a.legalName}</span>
              <span className="truncate font-mono text-[11px] text-muted-foreground">
                {a.registrationNumber}
              </span>
            </div>
          </div>
        ),
      },
      {
        id: "status",
        label: t("columns.status"),
        className: "w-[150px]",
        // `t.has` guard: `AgencyApplicationStatus` is widened, so a fifth value
        // prints its own raw name rather than crashing on a missing key.
        cell: (a) => (
          <Badge tone={statusTone(a.status)}>
            {t.has(`status.${a.status}`) ? t(`status.${a.status}`) : a.status}
          </Badge>
        ),
      },
      {
        id: "contact",
        label: t("columns.contact"),
        className: "min-w-[190px]",
        cell: (a) => (
          <div className="flex min-w-0 flex-col gap-px">
            <span className="truncate">{a.contactPersonName}</span>
            <span className="truncate font-mono text-[11px] text-muted-foreground">
              {a.contactEmail}
            </span>
          </div>
        ),
      },
      {
        id: "location",
        label: t("columns.location"),
        className: "w-[150px]",
        cell: (a) => (
          <div className="flex min-w-0 flex-col gap-px">
            <span className="truncate">{a.city}</span>
            <span className="truncate text-[11px] text-muted-foreground">
              {a.country}
            </span>
          </div>
        ),
      },
      {
        id: "documents",
        label: t("columns.documents"),
        className: "w-[130px]",
        cell: (a) => (
          <span className="flex items-center gap-1.5">
            <span className="font-mono text-xs">{a.docCount}</span>
            {/* ⚠ A warning, never an error: missing papers block neither a
                submit nor an approve, and the admin's decision is the whole
                enforcement. */}
            {!a.hasAllRequiredDocs && (
              <span
                role="img"
                aria-label={t("docs.missing")}
                title={t("docs.warningHint")}
                className="shrink-0 leading-none text-status-pending-deep"
              >
                <FileWarning aria-hidden className="size-3.5" />
              </span>
            )}
          </span>
        ),
      },
      {
        id: "submitted",
        label: t("columns.submitted"),
        className: "w-[120px]",
        cell: (a) => (
          <span className="font-mono text-xs text-muted-foreground">
            {formatDay(a.createdAt, locale)}
          </span>
        ),
      },
      {
        id: "flags",
        label: t("columns.flags"),
        className: "w-[170px]",
        cell: (a) => (
          <span className="flex min-w-0 items-center gap-1.5">
            {/* Provenance, not a quality mark — "Admin" means a colleague keyed
                it in from a call, and the terms were accepted on paper. */}
            <Badge tone="neutral" title={t("source.hint")}>
              {t.has(`source.${a.source}`) ? t(`source.${a.source}`) : a.source}
            </Badge>
            {/* ⚠ Flags; does not judge. A rejected company may apply again, and
                most rejections are "your scan is unreadable". */}
            {a.previouslyRejectedCount > 0 && (
              <span
                role="img"
                aria-label={t("flags.rejectedBefore", {
                  count: a.previouslyRejectedCount,
                })}
                title={t("flags.rejectedBeforeHint")}
                className="shrink-0 leading-none text-muted-foreground"
              >
                <History aria-hidden className="size-3.5" />
              </span>
            )}
          </span>
        ),
      },
      {
        id: "reviewedAt",
        label: t("columns.reviewedAt"),
        className: "w-[120px]",
        // Off by default: it is empty on every row of the tab an admin works in,
        // and seven columns is the design system's cap.
        defaultVisible: false,
        cell: (a) => (
          <span className="font-mono text-xs text-muted-foreground">
            {a.reviewedAt ? formatDay(a.reviewedAt, locale) : "—"}
          </span>
        ),
      },
    ],
    [t, locale],
  );
}
