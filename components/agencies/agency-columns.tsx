"use client";

import { useMemo, type ReactNode } from "react";
import { Building2, MailWarning } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import type { DataColumn } from "@/components/ui/data-table/types";
import { formatDay } from "@/lib/ui/relative-time";
import { standingRank, standingTone } from "@/lib/agencies/standing";
import type { AgencyDto } from "@/lib/types/agency.types";

/** Nulls last in BOTH directions — an unknown is not a small value. */
function byNullableDate(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return Date.parse(a) - Date.parse(b);
}

/**
 * Seven visible columns against ~10 candidate fields, which is the §08 cap.
 *
 * Two decisions worth keeping:
 *
 * - **`isVerified` is not a column.** It is a strip tile plus the marker in
 *   column 1, because it is a second, independent axis from `standing` — a
 *   partner approved yesterday is `AwaitingContract` **and** invitation-pending,
 *   and one combined cell would draw those two facts on top of each other.
 * - **`loginEmail` is not a column either.** It is usually a duplicate of
 *   `contactEmail`, so a slot spent on it is mostly wasted; but the two
 *   legitimately diverge after one edit and hiding that lets an admin believe an
 *   edit moved the login. So column 5 carries a second labelled line **only on
 *   divergence**, which is the only case anyone has to notice.
 *
 * `actions` arrives as an argument rather than an import: the dropdown imports
 * the edit dialog, which imports the form, and a column list that reached for it
 * directly would make the page's composition a cycle.
 */
export function useAgencyColumns(
  actions: (agency: AgencyDto) => ReactNode,
): DataColumn<AgencyDto>[] {
  const t = useTranslations("agencies");
  const locale = useLocale();

  return useMemo(
    () => [
      {
        id: "agency",
        label: t("columns.agency"),
        className: "min-w-[220px]",
        cell: (a) => (
          <div className="flex min-w-0 items-start gap-2">
            <Building2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="flex min-w-0 flex-col gap-px">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="truncate font-medium">{a.legalName}</span>
                {/*
                  The second axis, visible when nothing is filtered.

                  ⚠ A plain marker, NOT a `Tooltip`. `TooltipProvider` is mounted
                  only inside `app-sidebar` and `filter-bar`, so a tooltip in a
                  table cell has no provider ancestor — and no existing column
                  cell uses one. `title` needs no provider and the label reaches a
                  screen reader through `aria-label`.

                  The wrapping span is not decoration: a `lucide-react` icon's
                  props are `Omit<LucideProps, "ref">`, which has no `title`, so
                  the attribute has to sit on a real element.
                */}
                {!a.isVerified && (
                  <span
                    role="img"
                    aria-label={t("invitation.pending")}
                    title={t("invitation.pendingHint")}
                    className="shrink-0 leading-none text-status-pending-deep"
                  >
                    <MailWarning aria-hidden className="size-3.5" />
                  </span>
                )}
              </span>
              <span className="truncate font-mono text-[11px] text-muted-foreground">
                {a.registrationNumber}
              </span>
            </div>
          </div>
        ),
        compare: (a, b) => a.legalName.localeCompare(b.legalName, locale),
      },
      {
        id: "standing",
        label: t("columns.standing"),
        className: "w-[150px]",
        // ⚠ `t.has` guard: `AgencyStanding` is widened, so a fifth value prints
        // its own raw name rather than crashing on a missing key.
        cell: (a) => (
          <Badge tone={standingTone(a.standing)}>
            {t.has(`standing.${a.standing}`)
              ? t(`standing.${a.standing}`)
              : a.standing}
          </Badge>
        ),
        compare: (a, b) => standingRank(a.standing) - standingRank(b.standing),
      },
      {
        id: "contract",
        label: t("columns.contract"),
        className: "w-[140px]",
        cell: (a) => {
          if (!a.signedOn && !a.validUntil) {
            return (
              <span className="text-muted-foreground">{t("contract.none")}</span>
            );
          }
          if (!a.validUntil) {
            return (
              <span className="text-muted-foreground">
                {t("contract.openEnded")}
              </span>
            );
          }
          return (
            <span className="font-mono text-xs">
              {formatDay(a.validUntil, locale)}
            </span>
          );
        },
        compare: (a, b) => byNullableDate(a.validUntil, b.validUntil),
      },
      {
        id: "location",
        label: t("columns.location"),
        className: "w-[160px]",
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
        id: "contact",
        label: t("columns.contact"),
        className: "min-w-[200px]",
        cell: (a) => (
          <div className="flex min-w-0 flex-col gap-px">
            <span className="truncate">{a.contactPersonName}</span>
            <span className="truncate text-[11px] text-muted-foreground">
              {a.contactEmail}
            </span>
            {/* Only on divergence — see this hook's doc comment. */}
            {a.loginEmail !== a.contactEmail && (
              <span className="truncate text-[11px] text-muted-foreground">
                <span className="font-medium">{t("loginEmailLabel")}: </span>
                {a.loginEmail}
              </span>
            )}
          </div>
        ),
      },
      {
        id: "lastSeen",
        label: t("columns.lastSeen"),
        className: "w-[130px]",
        cell: (a) =>
          a.lastLoginAt ? (
            <span className="font-mono text-xs text-muted-foreground">
              {formatDay(a.lastLoginAt, locale)}
            </span>
          ) : (
            <span className="text-[12px] text-muted-foreground">
              {t("lastSeen.never")}
            </span>
          ),
        compare: (a, b) => byNullableDate(a.lastLoginAt, b.lastLoginAt),
      },
      {
        id: "createdAt",
        label: t("columns.createdAt"),
        className: "w-[120px]",
        defaultVisible: false,
        cell: (a) => (
          <span className="font-mono text-xs text-muted-foreground">
            {formatDay(a.createdAt, locale)}
          </span>
        ),
        compare: (a, b) => byNullableDate(a.createdAt, b.createdAt),
      },
      {
        id: "signedOn",
        label: t("columns.signedOn"),
        className: "w-[120px]",
        defaultVisible: false,
        cell: (a) => (
          <span className="font-mono text-xs text-muted-foreground">
            {a.signedOn ? formatDay(a.signedOn, locale) : "—"}
          </span>
        ),
      },
      {
        id: "licenceNumber",
        label: t("columns.licenceNumber"),
        className: "w-[120px]",
        defaultVisible: false,
        cell: (a) => (
          <span className="font-mono text-xs text-muted-foreground">
            {a.licenceNumber ?? "—"}
          </span>
        ),
      },
      {
        id: "contactPhone",
        label: t("columns.contactPhone"),
        className: "w-[150px]",
        defaultVisible: false,
        cell: (a) => (
          <span className="font-mono text-xs text-muted-foreground">
            {a.contactPhone ?? "—"}
          </span>
        ),
      },
      {
        id: "actions",
        label: t("columns.actions"),
        className: "w-[64px]",
        align: "right",
        cell: (a) => actions(a),
      },
    ],
    [t, locale, actions],
  );
}
