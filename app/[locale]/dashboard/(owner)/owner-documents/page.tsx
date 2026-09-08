"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  ContractPhaseCell,
  DateCell,
  FilesCell,
  ReasonCell,
  StageCell,
  SubjectCell,
} from "@/components/docs-workspace/queue-cells";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import type { FilterField, FilterOption } from "@/components/ui/filter-bar";
import { useOwnerContracts } from "@/hooks/use-contracts";
import { useHasPermission } from "@/hooks/use-current-permissions";
import { useKycList } from "@/hooks/use-kyc";
import { MAX_PAGE_SIZE } from "@/lib/types/paged.types";
import { useTableUrlState } from "@/hooks/use-table-url-state";
import { isPermissionDenied } from "@/lib/onboarding/errors";
import { subjectSide } from "@/lib/onboarding/queue-detail";
import {
  DEFAULT_QUEUE_TAB,
  QUEUE_TABS,
  statusForTab,
} from "@/lib/onboarding/queue-tabs";
import {
  indexCover,
  ownerContractSubjectId,
  ownerSubjectRow,
  withCover,
  type SubjectRow,
} from "@/lib/onboarding/subject-row";
import { looseIncludes } from "@/lib/ui/table-rows";
import type { ContractPhase } from "@/lib/types/onboarding.types";

/** Sentinel for the phase filter's "no contract has been written yet" option. */
const NO_CONTRACT = "__none";

/** Wire params this screen's filters own. */
const FILTER_KEYS = ["phase", "decidedFrom", "decidedTo"];

/**
 * The owner review queue.
 *
 * **Client mode**, and not by preference: `GET /api/admin/kyc` returns a bare array
 * and accepts `?status=` and nothing else — no paging, no search, no sort
 * (`Backend/GermanyERP.Web/Controllers/KycController.cs:217-222`). So the list is
 * read **unfiltered, once**, and every narrowing happens in the browser. Reading it
 * unfiltered rather than per tab is the cheaper option as well as the only one that
 * can put a count on a tab, and it makes switching tabs instant.
 *
 * Four columns the design draws are absent because nothing on the wire can fill
 * them — the per-file verdict dots, Waiting in days, the reviewer's name beside
 * Last decision, and Company. They are not rendered as permanently empty columns,
 * which would only teach an operator to ignore them; the gaps are filed as ask #24
 * and #25, and each becomes one registry entry the day it lands.
 */
export default function OwnerDocumentsPage() {
  const t = useTranslations("docsWorkspace");
  const tQueue = useTranslations("docsWorkspace.queue");
  const tPhase = useTranslations("onboarding.phase");
  const tStatus = useTranslations("onboarding.status");

  const state = useTableUrlState({
    filterKeys: FILTER_KEYS,
    defaultTab: DEFAULT_QUEUE_TAB,
    /**
     * Undecided first.
     *
     * ⚠ Not the design's default, which was longest-wait-first. That column is
     * gone: it read `submittedAt`, which came from a per-row detail request, and
     * the backend has no column for it to move onto (`docs/handoff/CHANGELOG.md`,
     * 2026-09-08 — deferred, it would need a migration). Nothing on the row is an
     * age.
     *
     * `reviewedAt` is `null` on every row nobody has decided, and ascending sorts
     * a null first — so the queue still opens on the work, it just cannot say
     * which piece has waited longest. Within the undecided block the order is
     * arbitrary, and that is the honest state until an age exists to sort on.
     */
    defaultSort: { key: "lastDecision", dir: "asc" },
  });

  /**
   * One page of the tab an admin is actually in.
   *
   * ⚠ `?status=` is the **only** narrowing this route offers — it takes no search
   * and no sort key — so the tab goes to the server and everything else in the
   * toolbar stays a client pipeline over the page. Converting the table to
   * `mode: "server"` would delete four working controls (search, the two filters
   * and every sortable column) to gain nothing the wire supports.
   *
   * Paging matters because the route became a `PagedResult` on 2026-09-08 with
   * `pageSize` defaulting to 25. `MAX_PAGE_SIZE` is the ceiling it allows, and
   * per-status it goes a long way — Review, the tab that is worked, is the short
   * one. Where it does not reach, `truncated` below says so out loud rather than
   * quietly showing a short list, which is the failure the backend just removed
   * from this route.
   */
  const list = useKycList(statusForTab(state.tab), { pageSize: MAX_PAGE_SIZE });
  const loaded = list.data?.items?.length ?? 0;
  const truncated = (list.data?.total ?? 0) > loaded;

  /**
   * `GET /api/contracts/admin/owner` is unpaginated and returns every owner's
   * rows, so it is fetched **once** under its own key and joined client-side —
   * never one request per row. A failure is deliberately not fatal: the review
   * queue works without cover dates, so the table still renders and the Contract
   * column falls back to "no contract".
   */
  const canReadContracts = useHasPermission("owner_contract:read_any");
  const contracts = useOwnerContracts(canReadContracts);

  const rows = useMemo(() => {
    const cover = indexCover(contracts.data ?? [], ownerContractSubjectId);
    return withCover((list.data?.items ?? []).map(ownerSubjectRow), cover);
  }, [contracts.data, list.data]);

  /**
   * Labelled from `onboarding.status.*`, the same strings the Stage cell prints —
   * not a second copy under this screen's namespace. One source is what keeps
   * "Approved" naming one thing on both queues and in every row.
   */
  const tabs = useMemo(
    () =>
      QUEUE_TABS.map(({ key }) => ({
        value: key,
        label: key === "all" ? t("allTab") : tStatus(key as "review"),
        /**
         * Only the open tab carries a number, and it is the server's own `total`
         * for that status — exact at any size. The others cannot be counted
         * without a request each, and counting the loaded page instead would
         * "put a number beside a tab that describes neither the tab nor the
         * page" (`lib/onboarding/queue-tabs.ts`).
         */
        count: key === state.tab ? (list.data?.total ?? 0) : undefined,
      })),
    [list.data?.total, state.tab, t, tStatus],
  );

  /**
   * Column order is the design's: identity, where it is, how much of it there is,
   * how long it has waited, what was last done to it, and only then the contract.
   */
  const columns = useMemo<DataColumn<SubjectRow>[]>(
    () => [
      {
        id: "subject",
        label: tQueue("colSubject"),
        locked: true,
        // Absorbs the slack, so toggling a column off widens the identity cell
        // rather than opening a dead zone on the right.
        className: "w-full min-w-[16rem]",
        cell: (row) => (
          <SubjectCell
            row={row}
            side={subjectSide(row.company, row.email, tQueue("naturalPerson"))}
          />
        ),
        compare: (a, b) => (a.fullName ?? "").localeCompare(b.fullName ?? ""),
      },
      {
        id: "stage",
        label: tQueue("colStage"),
        locked: true,
        className: "min-w-[8rem]",
        cell: (row) => <StageCell row={row} />,
        compare: (a, b) => a.onboardingStatus.localeCompare(b.onboardingStatus),
      },
      {
        id: "files",
        label: tQueue("colFiles"),
        className: "min-w-[7rem]",
        cell: (row) => (
          <FilesCell count={row.documentCount} verdicts={row.verdicts} />
        ),
        compare: (a, b) => (a.documentCount ?? 0) - (b.documentCount ?? 0),
      },
      {
        id: "lastDecision",
        label: tQueue("colLastDecision"),
        className: "min-w-[8rem]",
        cell: (row) => <DateCell iso={row.reviewedAt} />,
        /**
         * An undecided row sorts as `""`, so ascending puts them first and
         * descending puts them last. That matches how the backend's own sorts
         * behave on a nullable column, and descending — most recent decision at
         * the top, never-decided at the bottom — is the useful reading.
         */
        compare: (a, b) => (a.reviewedAt ?? "").localeCompare(b.reviewedAt ?? ""),
      },
      {
        id: "contract",
        label: tQueue("colContract"),
        className: "min-w-[8rem]",
        cell: (row) => <ContractPhaseCell row={row} />,
      },
      {
        id: "rejectReason",
        label: tQueue("colRejectReason"),
        // Off by default: only ever meaningful on the Rejected tab, and an empty
        // column in every other queue is a column an operator learns to skip.
        defaultVisible: false,
        cell: (row) => <ReasonCell reason={row.rejectReason} />,
      },
    ],
    [tQueue],
  );

  /**
   * Two dimensions, because two is what the wire supports. Stage is deliberately
   * **not** among them: the tabs already own that axis, and a single-select tab
   * beside a multi-select filter on the same field is two controls that can
   * contradict each other.
   */
  const fields = useMemo<FilterField[]>(() => {
    const present = new Set<string>();
    for (const row of rows) present.add(row.cover?.phase ?? NO_CONTRACT);

    const options: FilterOption[] = [
      ...(present.has(NO_CONTRACT)
        ? [{ value: NO_CONTRACT, label: tQueue("phaseNone") }]
        : []),
      ...(
        [
          "Draft",
          "Sent",
          "Scheduled",
          "InForce",
          "Expired",
          "Terminated",
        ] as ContractPhase[]
      )
        .filter((phase) => present.has(phase))
        .map((phase) => ({
          value: phase,
          label: tPhase(lowerFirst(phase) as "draft"),
        })),
    ];

    return [
      { key: "phase", label: tQueue("filterPhase"), options },
      {
        kind: "dateRange",
        fromKey: "decidedFrom",
        toKey: "decidedTo",
        label: tQueue("filterDecided"),
        hint: tQueue("filterDecidedHint"),
      },
    ];
  }, [rows, tPhase, tQueue]);

  return (
    /*
      Grows so the queue card can reach the bottom of the window. `main` in the
      dashboard layout is already a full-height flex column; this is the one link
      that was missing between it and the card, which is why a one-row queue used
      to stop a third of the way down the page.
    */
    <div className="flex grow flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-bold leading-tight tracking-tight">
          {t("ownerListTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("ownerListSubtitle")}</p>
      </div>

      {/* Said out loud, because a short list that says nothing is exactly the
          failure the backend removed from this route on 2026-09-08. The search,
          the filters and the sort below all run over the loaded rows only, so an
          operator has to know the set is not the whole tab. */}
      {truncated && (
        <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          {tQueue("pageTruncated", { loaded, total: list.data?.total ?? 0 })}
        </p>
      )}

      <DataTable
        state={state}
        scope="owner-documents"
        columns={columns}
        source={{
          mode: "client",
          rows,
          isLoading: list.isLoading,
          isError: list.isError,
          // A refusal is not a failure: the shell names the missing grant instead
          // of telling an admin to reload a page they may simply not read.
          isForbidden: isPermissionDenied(list.error),
          matches: (row, needle) =>
            looseIncludes(row.fullName, needle) || looseIncludes(row.email, needle),
          filter: matchesFilters,
        }}
        rowKey={(row) => row.id}
        rowHref={(row) => `/dashboard/owner-documents/${row.id}`}
        rowLabel={(row) => row.fullName ?? row.id}
        title={t("ownerListTitle")}
        subtitle={tQueue("ownerSubtitle")}
        tabs={tabs}
        tabsLabel={t("filterLabel")}
        fields={fields}
        searchPlaceholder={tQueue("ownerSearch")}
        empty={{ title: tQueue("emptyTitle"), body: tQueue("emptyBody") }}
      />
    </div>
  );
}

/**
 * One predicate over the whole values bag, because the two dimensions are read
 * together rather than independently.
 *
 * The decided-on range keys on `reviewedAt`, so a row that has never been decided
 * drops out of any date bound rather than passing it. That is the same rule SQL
 * applies to a `NULL` against a range, and it is what an admin asking *"what did we
 * decide last week"* means.
 */
function matchesFilters(row: SubjectRow, values: Record<string, string>): boolean {
  if (values.phase && (row.cover?.phase ?? NO_CONTRACT) !== values.phase) {
    return false;
  }

  const { decidedFrom, decidedTo } = values;
  if (decidedFrom || decidedTo) {
    const day = row.reviewedAt?.slice(0, 10);
    if (!day) return false;
    if (decidedFrom && day < decidedFrom) return false;
    if (decidedTo && day > decidedTo) return false;
  }

  return true;
}

/** `"InForce"` → `"inForce"`, the shape the phase translations are keyed by. */
function lowerFirst(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1);
}
