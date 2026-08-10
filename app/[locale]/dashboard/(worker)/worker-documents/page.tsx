"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DocsFilterBar,
  statusForTab,
} from "@/components/docs-workspace/docs-filter-bar";
import { SubjectDocsTable } from "@/components/docs-workspace/subject-docs-table";
import { useTranslations } from "next-intl";
import { useWorkerContracts } from "@/hooks/use-contracts";
import { useHasPermission } from "@/hooks/use-current-permissions";
import { useWorkers } from "@/hooks/use-workers";
import {
  indexCover,
  withCover,
  workerContractSubjectId,
  workerSubjectRow,
} from "@/lib/onboarding/subject-row";
import { DEFAULT_PAGE_SIZE } from "@/lib/types/paged.types";

export default function WorkerDocumentsPage() {
  const t = useTranslations("docsWorkspace");
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");

  const {
    data: page,
    isLoading,
    error,
  } = useWorkers({
    onboardingStatus: statusForTab(tab),
    pageSize: DEFAULT_PAGE_SIZE,
  });

  /** Fetched once and joined client-side — see the note on the owner screen. */
  const canReadContracts = useHasPermission("worker_contract:read_any");
  const { data: contracts = [] } = useWorkerContracts(canReadContracts);

  const rows = useMemo(() => {
    const cover = indexCover(contracts, workerContractSubjectId);
    const base = withCover(
      (page?.items ?? []).map(workerSubjectRow),
      cover,
    );
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (r) =>
        (r.fullName ?? "").toLowerCase().includes(q) ||
        (r.email ?? "").toLowerCase().includes(q),
    );
  }, [contracts, page?.items, search]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-bold leading-tight tracking-tight">
          {t("workerListTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("workerListSubtitle")}</p>
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
            {isLoading ? "…" : t("workerCount", { count: rows.length })}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <SubjectDocsTable
            rows={rows}
            hrefFor={(row) => `/dashboard/worker-documents/${row.id}`}
            isLoading={isLoading}
            error={error}
            isFiltered={tab !== "all" || search.trim().length > 0}
          />
        </CardContent>
      </Card>
    </div>
  );
}
