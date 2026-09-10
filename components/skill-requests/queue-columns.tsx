"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { DataColumn } from "@/components/ui/data-table/types";
import { formatDay } from "@/lib/ui/relative-time";
import { SkillRequestStatusBadge } from "@/components/skill-requests/status-badge";
import type { SkillRequestDto } from "@/lib/types/skill-request.types";

/**
 * The queue's columns.
 *
 * ⚠ **No column carries a `sortKey`.** This endpoint takes no `sort` parameter at
 * all — rows arrive `createdAt` descending and that is the only order available. A
 * sortable header would offer an order the server cannot honour.
 *
 * ⚠ **There is no certificate column.** The certificate is deliberately unrendered
 * across this feature: the worker app is not building the upload, so the field is
 * `null` in practice, and a column that is always empty is worse than none.
 *
 * The skill name comes off the row itself — `professionNameEn`/`professionNameDe` are
 * denormalised precisely so a list needs no second call.
 */
export function useSkillRequestColumns(): DataColumn<SkillRequestDto>[] {
  const t = useTranslations("skillRequests.columns");
  const locale = useLocale();

  return useMemo(
    () => [
      {
        id: "worker",
        label: t("worker"),
        cell: (row) => row.workerFullName,
      },
      {
        id: "skill",
        label: t("skill"),
        cell: (row) =>
          locale === "de" ? row.professionNameDe : row.professionNameEn,
      },
      {
        id: "claimedYears",
        label: t("claimedYears"),
        align: "right",
        // ⚠ `0` is a real answer — "no years yet" — and must print as 0; `null`
        // must not print as 0. `??` keeps those apart where `||` would not.
        cell: (row) => row.claimedYears ?? "—",
      },
      {
        id: "status",
        label: t("status"),
        cell: (row) => <SkillRequestStatusBadge status={row.status} />,
      },
      {
        id: "createdAt",
        label: t("createdAt"),
        // `formatDay` also absorbs a null or unparseable date as "—", which a bare
        // `toLocaleDateString` would print as "Invalid Date".
        cell: (row) => formatDay(row.createdAt, locale),
      },
    ],
    [t, locale],
  );
}
