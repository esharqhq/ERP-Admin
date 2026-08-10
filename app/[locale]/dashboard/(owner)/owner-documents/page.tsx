"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DocsFilterBar,
  statusForTab,
} from "@/components/docs-workspace/docs-filter-bar";
import { SubjectDocsTable } from "@/components/docs-workspace/subject-docs-table";
import { useTranslations } from "next-intl";
import { useOwnerContracts } from "@/hooks/use-contracts";
import { useHasPermission } from "@/hooks/use-current-permissions";
import { useKycList } from "@/hooks/use-kyc";
import {
  indexCover,
  ownerContractSubjectId,
  ownerSubjectRow,
  withCover,
} from "@/lib/onboarding/subject-row";

export default function OwnerDocumentsPage() {
  const t = useTranslations("docsWorkspace");
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");

  const { data: profiles = [], isLoading, error } = useKycList(statusForTab(tab));

  /**
   * `GET /api/contracts/admin/owner` is unpaginated and returns every owner's rows,
   * so it is fetched **once** under its own query key and joined client-side — not
   * one request per row. A failure here is deliberately not fatal: the review queue
   * still works without the cover dates, so the table renders and the contract
   * columns fall back to "no contract".
   */
  const canReadContracts = useHasPermission("owner_contract:read_any");
  const { data: contracts = [] } = useOwnerContracts(canReadContracts);

  const rows = useMemo(() => {
    const cover = indexCover(contracts, ownerContractSubjectId);
    const base = withCover(profiles.map(ownerSubjectRow), cover);
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (r) =>
        (r.fullName ?? "").toLowerCase().includes(q) ||
        (r.email ?? "").toLowerCase().includes(q),
    );
  }, [contracts, profiles, search]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-bold leading-tight tracking-tight">
          {t("ownerListTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("ownerListSubtitle")}</p>
      </div>

      <DocsFilterBar
        tab={tab}
        onTabChange={setTab}
        search={search}
        onSearchChange={setSearch}
      />

      <Card>
        <CardHeader className="pb-3">
          <p className="text-xs text-muted-foreground">
            {isLoading ? "…" : t("ownerCount", { count: rows.length })}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <SubjectDocsTable
            rows={rows}
            hrefFor={(row) => `/dashboard/owner-documents/${row.id}`}
            isLoading={isLoading}
            error={error}
            isFiltered={tab !== "all" || search.trim().length > 0}
          />
        </CardContent>
      </Card>
    </div>
  );
}
