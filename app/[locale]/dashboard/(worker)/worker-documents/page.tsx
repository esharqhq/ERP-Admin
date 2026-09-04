"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  LicenceExpiryCell,
  ProfessionsCell,
  StageCell,
  SubjectCell,
} from "@/components/docs-workspace/queue-cells";
import { DataTable, serverSortParams, type DataColumn } from "@/components/ui/data-table";
import { useWorkers } from "@/hooks/use-workers";
import { useTableUrlState } from "@/hooks/use-table-url-state";
import { useToday } from "@/hooks/use-today";
import { isPermissionDenied } from "@/lib/onboarding/errors";
import { DEFAULT_QUEUE_TAB, QUEUE_TABS, statusForTab } from "@/lib/onboarding/queue-tabs";
import { workerSubjectRow, type SubjectRow } from "@/lib/onboarding/subject-row";
import type { WorkerListQuery } from "@/lib/types/worker.types";

/**
 * The worker review queue.
 *
 * **Server mode**, unlike the owner queue: `GET /api/admin/workers` pages,
 * filters and sorts on the wire, so the shell narrows nothing itself
 * (`DataTable`'s own rule — there is no code path from `mode: "server"` into
 * the client pipeline).
 *
 * Three columns the owner queue draws are absent here on purpose, not by
 * oversight: `WorkerRowDto` carries no document count, no review timestamp and
 * no reject reason (`lib/onboarding/subject-row.ts`'s own note on
 * `workerSubjectRow` — filed as ask #25, sibling to the owner side's ask #24).
 * Rendering Files/Waiting/Last-decision as permanently-empty columns would
 * teach an operator to ignore them, which is exactly what the owner queue's
 * own docstring already argues against — so this queue simply does not
 * register them, the same way the owner queue does not register Licence
 * expiry or Professions.
 */
export default function WorkerDocumentsPage() {
  const t = useTranslations("docsWorkspace");
  const tQueue = useTranslations("docsWorkspace.queue");
  const tStatus = useTranslations("onboarding.status");
  const today = useToday();

  const state = useTableUrlState({
    defaultTab: DEFAULT_QUEUE_TAB,
    defaultSort: { key: "subject", dir: "asc" },
  });

  /**
   * Column order: identity, where it is, then the two worker-only facts — the
   * licence that can lapse, then what they are qualified for.
   */
  const columns = useMemo<DataColumn<SubjectRow>[]>(
    () => [
      {
        id: "subject",
        label: tQueue("colSubject"),
        locked: true,
        className: "w-full min-w-[16rem]",
        cell: (row) => <SubjectCell row={row} side={row.email} />,
        // The only column on this row `WORKER_SORT_COLUMNS` actually allows.
        sortKey: "fullName",
      },
      {
        id: "stage",
        label: tQueue("colStage"),
        locked: true,
        className: "min-w-[8rem]",
        cell: (row) => <StageCell row={row} />,
      },
      {
        id: "licenceExpiry",
        label: tQueue("colLicenceExpiry"),
        className: "min-w-[8rem]",
        cell: (row) => <LicenceExpiryCell iso={row.licenseExpiry} today={today} />,
        // `?sortBy=licenseExpiry` is `400 invalid_sort_column` — no server key
        // exists for it (B10 CHANGELOG), so this only ever sorts the page on
        // screen. Left in anyway: it costs nothing, and it is correct the
        // moment the backend adds a wire key.
        compare: (a, b) => (a.licenseExpiry ?? "").localeCompare(b.licenseExpiry ?? ""),
      },
      {
        id: "professions",
        label: tQueue("colProfessions"),
        className: "min-w-[12rem]",
        cell: (row) => <ProfessionsCell professions={row.professions} />,
      },
    ],
    [tQueue, today],
  );

  const tabs = useMemo(
    () =>
      QUEUE_TABS.map(({ key }) => ({
        value: key,
        label: key === "all" ? t("allTab") : tStatus(key as "review"),
        // No count — one page of 25 cannot describe the whole tab. See
        // `lib/onboarding/queue-tabs.ts`'s own note on `StageTab.count`.
      })),
    [t, tStatus],
  );

  const query = useMemo<WorkerListQuery>(
    () => ({
      onboardingStatus: statusForTab(state.tab),
      search: state.search || undefined,
      ...serverSortParams(columns, state.sort),
      page: state.page,
      pageSize: state.pageSize,
    }),
    [state.tab, state.search, state.sort, state.page, state.pageSize, columns],
  );

  const { data, isLoading, isError, error } = useWorkers(query);
  const forbidden = isPermissionDenied(error);

  const rows = useMemo(
    () => (data?.items ?? []).map(workerSubjectRow),
    [data?.items],
  );

  return (
    <div className="flex grow flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-bold leading-tight tracking-tight">
          {t("workerListTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("workerListSubtitle")}</p>
      </div>

      <DataTable
        state={state}
        scope="worker-documents"
        columns={columns}
        source={{
          mode: "server",
          rows,
          total: data?.total ?? 0,
          isLoading,
          isError,
          isForbidden: forbidden,
        }}
        rowKey={(row) => row.id}
        rowHref={(row) => `/dashboard/worker-documents/${row.id}`}
        rowLabel={(row) => row.fullName ?? row.id}
        title={t("workerListTitle")}
        subtitle={tQueue("workerSubtitle")}
        tabs={tabs}
        tabsLabel={t("filterLabel")}
        searchPlaceholder={tQueue("workerSearch")}
        empty={{ title: tQueue("emptyTitle"), body: tQueue("emptyBody") }}
      />
    </div>
  );
}
