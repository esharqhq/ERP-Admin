"use client";

import { useMemo, type ReactNode } from "react";
import { Building2, User } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import type { DataColumn } from "@/components/ui/data-table/types";
import { formatDay } from "@/lib/ui/relative-time";
import { agencyLinkTurn } from "@/lib/workers/agency-link";
import type { AgencyLinkRowDto, AgencyLinkStatus } from "@/lib/types/agency.types";

/**
 * ⚠ `default` is load-bearing — `AgencyLinkStatus` is widened, and a value this
 * build has not met must render as a neutral chip carrying its own raw name.
 *
 * Same mapping as `agency-link-card.tsx`'s `toneFor`, deliberately: one status
 * must not be two colours across two screens.
 */
function toneFor(status: AgencyLinkStatus) {
  switch (status) {
    case "Confirmed":
      return "primary" as const;
    case "Proposed":
      return "warning" as const;
    case "Disputed":
      return "danger" as const;
    case "Rejected":
      return "neutral" as const;
    default:
      return "neutral" as const;
  }
}

/**
 * The links queue's columns — six visible, two behind the picker.
 *
 * ⚠ **Column 3 is the one a naive build gets wrong.** A bare `Proposed` chip is
 * the same pixel for a row waiting on the worker and a row waiting on this
 * admin — two opposite facts. `agencyLinkTurn` is what separates them, and it
 * already exists from phase 1, so nothing here re-derives the mirror rule.
 *
 * ⚠ **Only three columns carry a `sortKey`, and their `id`s are their wire
 * names.** The shell sends `column.id` as the sort key and reads `sortKey` only
 * as a boolean (`data-table.tsx:621,646`), so id-as-wire-name is what keeps the
 * two in step. `workerFullName` and `agencyLegalName` are **not** in the route's
 * whitelist — a header offering them would answer `400 invalid_sort_column`.
 */
export function useLinkColumns(
  actions: (link: AgencyLinkRowDto) => ReactNode,
): DataColumn<AgencyLinkRowDto>[] {
  const t = useTranslations("agencyLinks");
  const locale = useLocale();

  return useMemo(
    () => [
      {
        id: "worker",
        label: t("columns.worker"),
        className: "min-w-[200px]",
        cell: (l) => (
          <div className="flex min-w-0 items-center gap-2">
            <User className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate font-medium">{l.workerFullName}</span>
          </div>
        ),
      },
      {
        id: "agency",
        label: t("columns.agency"),
        className: "min-w-[180px]",
        cell: (l) => (
          <div className="flex min-w-0 items-center gap-2">
            <Building2 className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{l.agencyLegalName}</span>
          </div>
        ),
      },
      {
        // ⚠ The wire name, because the shell sends the id. Sortable.
        id: "status",
        label: t("columns.state"),
        className: "w-[190px]",
        sortKey: "status",
        cell: (l) => {
          const turn = agencyLinkTurn(l);
          return (
            <div className="flex min-w-0 flex-col items-start gap-1">
              <Badge tone={toneFor(l.status)}>
                {t.has(`status.${l.status}`) ? t(`status.${l.status}`) : l.status}
              </Badge>
              {/* Absent when settled: a line saying "nobody is waiting" is noise
                  on the common case. */}
              {turn !== "settled" ? (
                <span
                  className={
                    turn === "admin"
                      ? "text-[11px] font-medium text-status-pending-deep"
                      : "text-[11px] text-muted-foreground"
                  }
                >
                  {turn === "admin" ? t("turn.admin") : t("turn.worker")}
                </span>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "why",
        label: t("columns.why"),
        className: "min-w-[200px]",
        // `null` on a worker's own declaration, which needs no reason — an em
        // dash, never "no reason given", which would read as an omission.
        cell: (l) =>
          l.reason ? (
            <span
              className="line-clamp-2 text-[12.5px] leading-snug"
              title={l.reason}
            >
              {l.reason}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "createdAt",
        label: t("columns.raised"),
        className: "w-[120px]",
        sortKey: "createdAt",
        cell: (l) => (
          <span className="font-mono text-xs text-muted-foreground">
            {formatDay(l.createdAt, locale)}
          </span>
        ),
      },
      {
        id: "resolvedAt",
        label: t("columns.resolved"),
        className: "w-[120px]",
        sortKey: "resolvedAt",
        // Off by default: empty on every row of the two tabs an admin works in.
        defaultVisible: false,
        cell: (l) => (
          <span className="font-mono text-xs text-muted-foreground">
            {l.resolvedAt ? formatDay(l.resolvedAt, locale) : "—"}
          </span>
        ),
      },
      {
        id: "resolutionReason",
        label: t("columns.resolutionReason"),
        className: "min-w-[180px]",
        defaultVisible: false,
        cell: (l) =>
          l.resolutionReason ? (
            <span className="line-clamp-2 text-[12.5px] leading-snug">
              {l.resolutionReason}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "actions",
        label: t("columns.actions"),
        className: "w-[150px]",
        align: "right",
        cell: (l) => actions(l),
      },
    ],
    [t, locale, actions],
  );
}
