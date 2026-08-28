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
  WaitingCell,
} from "@/components/docs-workspace/queue-cells";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import type { FilterField, FilterOption } from "@/components/ui/filter-bar";
import { useOwnerContracts } from "@/hooks/use-contracts";
import { useHasPermission } from "@/hooks/use-current-permissions";
import { useKycList } from "@/hooks/use-kyc";
import { useQueueDetails } from "@/hooks/use-queue-details";
import { useTableUrlState } from "@/hooks/use-table-url-state";
import { useToday } from "@/hooks/use-today";
import { isPermissionDenied } from "@/lib/onboarding/errors";
import { subjectSide, waitingDays } from "@/lib/onboarding/queue-detail";
import {
  DEFAULT_QUEUE_TAB,
  QUEUE_TABS,
  countByTab,
  inTab,
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
  const today = useToday();

  const state = useTableUrlState({
    filterKeys: FILTER_KEYS,
    defaultTab: DEFAULT_QUEUE_TAB,
    /**
     * Longest wait first — the design's default, and now reachable: the
     * submission date comes off each row's detail read. Rows that are not waiting
     * sort below every real wait, so the queue opens on the work.
     */
    defaultSort: { key: "waiting", dir: "desc" },
  });

  const list = useKycList();

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
    return withCover((list.data ?? []).map(ownerSubjectRow), cover);
  }, [contracts.data, list.data]);

  // Counted over the whole list, before the tab narrows it — see `countByTab`.
  const counts = useMemo(() => countByTab(rows), [rows]);

  const tabRows = useMemo(
    () => rows.filter((row) => inTab(row.onboardingStatus, state.tab)),
    [rows, state.tab],
  );

  /**
   * The per-row extras four of the columns need, for the **current tab**.
   *
   * Scoped to the tab rather than to the page on screen, which is the tighter
   * bound and the one that does not work. Sorting by Waiting reads a value that
   * only arrives with these details, so page-scoped enrichment feeds itself: the
   * page decides what to fetch, the fetch changes the sort, the sort changes the
   * page. Descending settles after a round; ascending does not — rows with no
   * detail sort to the top, get fetched, drop away, and pull the next unfetched
   * rows up behind them, for ever.
   *
   * So: one read per row of the tab an admin is actually in. "In review" is the
   * one they work, and it is the short one. Ask #24 removes this entirely by
   * putting the four fields on the list row.
   */
  const { details } = useQueueDetails(
    useMemo(() => tabRows.map((row) => row.id), [tabRows]),
  );

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
        count: counts[key] ?? 0,
      })),
    [counts, t, tStatus],
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
            side={subjectSide(details.get(row.id), row.email, tQueue("naturalPerson"))}
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
          <FilesCell
            count={row.documentCount}
            verdicts={details.get(row.id)?.verdicts}
          />
        ),
        compare: (a, b) => (a.documentCount ?? 0) - (b.documentCount ?? 0),
      },
      {
        id: "waiting",
        label: tQueue("colWaiting"),
        className: "min-w-[6rem]",
        cell: (row) => (
          <WaitingCell days={waitingDays(row.onboardingStatus, details.get(row.id), today)} />
        ),
        /**
         * Rows that are not waiting sort as `-1`, below every real wait in
         * descending order — which is the order this column exists for: the
         * longest-waiting submission at the top, the decided ones out of the way.
         */
        compare: (a, b) => {
          const days = (row: SubjectRow) =>
            waitingDays(row.onboardingStatus, details.get(row.id), today) ?? -1;
          return days(a) - days(b);
        },
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
    [details, today, tQueue],
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

      <DataTable
        state={state}
        scope="owner-documents"
        columns={columns}
        source={{
          mode: "client",
          rows: tabRows,
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
