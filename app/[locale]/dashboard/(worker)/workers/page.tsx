"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, Inbox } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  Briefcase,
  MapPin,
  EyeOff,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, serverSortParams } from "@/components/ui/data-table";
import {
  FilterBar,
  FilterChips,
  countActiveFields,
  type FilterField,
  type FilterSection,
} from "@/components/ui/filter-bar";
import { Card } from "@/components/ui/card";
import {
  AssignDaySheet,
  type AssignDayTarget,
} from "@/components/workers/matrix/assign-day-sheet";
import { AssignSheet } from "@/components/workers/matrix/assign-sheet";
import { MatrixToolbar } from "@/components/workers/matrix/matrix-toolbar";
import { WorkersMatrix } from "@/components/workers/matrix/workers-matrix";
import {
  useWorkerColumns,
  workerRowClassName,
} from "@/components/workers/worker-columns";
import { WorkerRowCard } from "@/components/workers/worker-row-card";
import { WorkersSummaryStrip } from "@/components/workers/workers-summary-strip";
import {
  WORKER_VIEW_PARAM,
  ViewSwitch,
  WorkersToolbar,
  isWorkerView,
  type WorkerView,
} from "@/components/workers/workers-toolbar";
import { useActiveAgencies } from "@/hooks/use-agencies";
import { useAttendanceWeek } from "@/hooks/use-attendance-week";
import { useCurrentPermissions } from "@/hooks/use-current-permissions";
import { useAdminTaskGroups } from "@/hooks/use-tasks";
import { useTodayKey } from "@/hooks/use-today";
import { useCities, useCountries } from "@/hooks/use-lookups";
import { useProfessions } from "@/hooks/use-professions";
import { useTableUrlState } from "@/hooks/use-table-url-state";
import { useWorkerSummary, useWorkers } from "@/hooks/use-workers";
import { isPermissionDenied } from "@/lib/onboarding/errors";
import {
  ONBOARDING_STATUSES,
  WORKER_STATUS_FILTERS,
} from "@/lib/types/onboarding.types";
import type { WorkerListQuery, WorkerRowDto } from "@/lib/types/worker.types";
import {
  WORKER_FILTER_KEYS,
  buildWorkerFilterQuery,
  reconcileAgencyFilters,
} from "@/lib/workers/worker-filter-query";
import { shiftWeek, weekOf } from "@/lib/ui/week";
import type { MatrixChip } from "@/lib/workers/matrix";
import { stageKey } from "@/lib/workers/worker-status";

/**
 * Tabs filter on the **onboarding** axis only, the same choice the owners table
 * makes and for the same reason: `status` and `onboardingStatus` AND together
 * server-side, so mixing the two across tabs would make one tab's name mean
 * different things depending on where an admin came from. The onboarding axis is
 * the one an admin acts on — `Review` is where approve and reject are legal.
 */
const TABS = ["all", "review", "active"] as const;
const DEFAULT_TAB = "all";

function queryFor(tab: string): Pick<WorkerListQuery, "onboardingStatus"> {
  if (tab === "review") return { onboardingStatus: "Review" };
  if (tab === "active") return { onboardingStatus: "Active" };
  return {};
}

/** The active locale's name for a lookup row. Hoisted so `fields` has honest deps. */
function lookupLabel(c: { nameDe: string; nameEn: string }, locale: string): string {
  return locale === "de" ? c.nameDe : c.nameEn;
}

/**
 * The worker directory — the **Table** state of
 * `assets/Uyer-Admin-Workers-Table.dc.html`.
 *
 * **Server mode, and that is why this file reads the way it does.**
 * `GET /api/admin/workers` searches, filters, sorts and pages itself, so the shell
 * narrows nothing: `useTableUrlState` is the single source for tab, search,
 * filters, sort and page, and `buildWorkerFilterQuery` turns the filter bag into
 * the query. Running the client pipeline here would search the 25 rows on screen
 * and present the answer as the whole table.
 *
 * **This is the first screen in the app that actually sends `sortBy`/`dir`.** The
 * URL carries the **column id**; `sortKeyFor` maps it to the API's field name on
 * the way into the query, so the same visible sort produces the same link here as
 * on a client-sorted queue, and a column with no `sortKey` can never reach the
 * whitelist.
 *
 * **Fourteen columns, seven visible** — the registry lives in
 * `components/workers/worker-columns.tsx`, out of this file, because a page that
 * also holds fourteen cell renderers stops being readable.
 *
 * **Twenty-two filters in five titled sections.** The band is the shell's; the
 * sections are the opt-in capability added for this screen.
 *
 * Design decisions, including the one-Status-column resolution of a contradiction
 * in the design file: `docs/superpowers/plans/2026-09-01-workers-table-state.md`.
 */
export default function WorkersPage() {
  const t = useTranslations("workers");
  const tStage = useTranslations("workers.stage");
  const tAccount = useTranslations("workers.account");
  const tCommon = useTranslations("common");
  const tTable = useTranslations("common.table");
  const locale = useLocale();

  const state = useTableUrlState({
    filterKeys: [...WORKER_FILTER_KEYS],
    defaultTab: DEFAULT_TAB,
    // The server's own default, named here so the `Sorted by` control has a
    // value to show rather than starting blank on a table that is in fact sorted.
    defaultSort: { key: "registered", dir: "desc" },
  });

  const [view, setView] = useWorkerViewParam();
  const [weekStart, setWeekStart] = useUrlParam(WORKER_WEEK_PARAM);
  const todayKey = useTodayKey();
  const week = useMemo(() => weekOf(weekStart, todayKey), [weekStart, todayKey]);
  const [assigning, setAssigning] = useState<MatrixChip | null>(null);
  const [assigningDay, setAssigningDay] = useState<AssignDayTarget | null>(null);
  const [matrixFiltersOpen, setMatrixFiltersOpen] = useState(false);

  const countries = useCountries();
  // Idle until a country is chosen: cities are only reachable per country.
  const cities = useCities(state.filters.countryId || undefined);
  const professions = useProfessions();
  const agencies = useActiveAgencies();

  const columns = useWorkerColumns();

  const built = useMemo(
    () => buildWorkerFilterQuery(state.filters),
    [state.filters],
  );

  const query = useMemo<WorkerListQuery>(
    () => ({
      ...(built.ok ? built.query : {}),
      // The tab owns `onboardingStatus`, so it is spread LAST: where the tab and
      // the filter address the same param the tab wins, and a query that neither
      // control on screen explains is worse than a narrower one.
      ...queryFor(state.tab),
      search: state.search || undefined,
      ...serverSortParams(columns, state.sort),
      page: state.page,
      pageSize: state.pageSize,
    }),
    [built, state.tab, state.search, state.sort, state.page, state.pageSize, columns],
  );

  const { data, isLoading, isError, error } = useWorkers(query);
  const forbidden = isPermissionDenied(error);

  /*
    The strip's counts are filter-independent on purpose — it says what is true of
    the platform, not of the current narrowing. Skipped entirely once the list read
    is refused, because four more `worker:list` probes would 403 the same way.
  */
  const summary = useWorkerSummary(!forbidden);

  /*
    Matrix-only, and idle in the Table state — `enabled` is what keeps switching
    to the grid the moment its eight requests are paid for, rather than every
    visit to the directory.

    ⚠ Both are permission-gated on grants this page's own gate does not imply: an
    admin may hold `worker:list` and neither of these. Gated rather than left to
    403, because seven refused reads would draw seven failed columns where one
    honest "your role does not include attendance" is the truth.
  */
  const { permissions } = useCurrentPermissions();
  const canReadAttendance = permissions?.has("system:attendance:read") ?? false;
  const canReadGroups = permissions?.has("task_group:list_any") ?? false;
  const isMatrix = view === "matrix";

  const attendance = useAttendanceWeek(
    week.dayKeys,
    isMatrix && canReadAttendance,
  );
  /*
    ⚠ Unbounded and undated — `ListAllGroupsAsync` returns every non-deleted group
    ever created with all its tasks and workers. The week filter is applied in
    `buildMatrixWeek`, client-side. It is the only source that knows a task exists
    when nobody is assigned to it, which is what the open-shifts row counts.
  */
  const groups = useAdminTaskGroups(undefined, undefined, isMatrix && canReadGroups);

  /**
   * Two filters own more than one param, so they write through `setFilters`.
   *
   * Two `setFilter` calls would not do: each merges into the query captured at
   * render, so the second discards the first — and in both of these cases the
   * discarded half leaves a stale id in the address that returns an **empty page
   * rather than an error**, which reads as "nobody matches" instead of "this
   * control is broken".
   */
  const setFilter = useCallback(
    (key: string, value: string) => {
      if (key === "countryId") {
        // A city id belongs to the country that was showing when it was picked.
        return state.setFilters({ countryId: value, cityId: "" });
      }
      if (key === "agencyId" || key === "agencySource") {
        return state.setFilters(reconcileAgencyFilters(state.filters, key, value));
      }
      return state.setFilter(key, value);
    },
    [state],
  );

  const sections = useMemo<FilterSection[]>(
    () => [
      {
        id: "identity",
        title: t("sections.identity.title"),
        note: t("sections.identity.note"),
        icon: <UserRound className="size-3.5" />,
      },
      {
        id: "capability",
        title: t("sections.capability.title"),
        note: t("sections.capability.note"),
        icon: <Briefcase className="size-3.5" />,
      },
      {
        id: "workload",
        title: t("sections.workload.title"),
        note: t("sections.workload.note"),
        icon: <SlidersHorizontal className="size-3.5" />,
      },
      {
        id: "location",
        title: t("sections.location.title"),
        note: t("sections.location.note"),
        icon: <MapPin className="size-3.5" />,
      },
      {
        id: "dormancy",
        title: t("sections.dormancy.title"),
        note: t("sections.dormancy.note"),
        icon: <EyeOff className="size-3.5" />,
      },
    ],
    [t],
  );

  const fields = useMemo<FilterField[]>(() => {
    /** Every boolean here is three-state — omit is not the same as `false`. */
    const tri = (key: string, section: string): FilterField => ({
      kind: "triState",
      key,
      section,
      label: t(`filters.${key}` as "filters.booked"),
      hint: t(`filters.${key}Hint` as "filters.bookedHint"),
      anyLabel: t("filters.any"),
      trueLabel: t("filters.yes"),
      falseLabel: t("filters.no"),
    });

    /* ⚠ Pairing either `lastSeen` bound with "never seen" is a 400, so the pair
       goes dead rather than the request failing after it has been filled in. */
    const neverSeen = state.filters.neverLoggedIn === "true";

    return [
      /* --- Identity & stage ------------------------------------------- */
      {
        key: "status",
        section: "identity",
        label: t("filters.status"),
        hint: t("filters.statusHint"),
        options: WORKER_STATUS_FILTERS.map((s) => ({
          value: s,
          label: tAccountOrStatus(s),
        })),
      },
      {
        key: "onboardingStatus",
        section: "identity",
        label: t("filters.onboardingStatus"),
        hint: t("filters.onboardingStatusHint"),
        options: ONBOARDING_STATUSES.map((s) => ({
          value: s,
          label: tStage(stageKey(s) as "kyc"),
        })),
      },

      /* --- Capability --------------------------------------------------- */
      {
        kind: "multiSelect",
        key: "professionIds",
        section: "capability",
        label: t("filters.professions"),
        hint: t("filters.professionsHint"),
        searchable: true,
        searchPlaceholder: t("filters.professionsSearch"),
        // ⚠ Inactive professions are hidden: offering one would narrow to a set
        // no worker can newly join.
        options: (professions.data ?? [])
          .filter((p) => p.isActive)
          .map((p) => ({ value: p.id, label: lookupLabel(p, locale) })),
      },
      {
        key: "ratingMin",
        section: "capability",
        label: t("filters.ratingMin"),
        hint: t("filters.ratingMinHint"),
        // A threshold from a fixed list, not a free number: the API has
        // `ratingMin` and no `ratingMax`, so there is no range to validate.
        options: ["3", "3.5", "4", "4.5"].map((v) => ({ value: v, label: `≥ ${v}` })),
      },
      {
        kind: "triState",
        key: "includeUnrated",
        section: "capability",
        label: t("filters.includeUnrated"),
        hint: t("filters.includeUnratedHint"),
        anyLabel: t("filters.includeUnratedAny"),
        trueLabel: t("filters.includeUnratedTrue"),
        falseLabel: t("filters.includeUnratedFalse"),
        // Only meaningful beside a threshold; alone it describes a set nobody
        // narrowed, so the control says so by going dead rather than by lying.
        disabled: !state.filters.ratingMin,
      },
      {
        kind: "numberRange",
        minKey: "experienceMin",
        maxKey: "experienceMax",
        section: "capability",
        label: t("filters.experience"),
        hint: t("filters.experienceHint"),
      },
      {
        kind: "numberRange",
        minKey: "completedMin",
        maxKey: "completedMax",
        section: "capability",
        label: t("filters.completed"),
        hint: t("filters.completedHint"),
      },

      /* --- Contract & workload ------------------------------------------ */
      tri("hasActiveContract", "workload"),
      tri("booked", "workload"),
      tri("startingSoon", "workload"),
      tri("idleWeek", "workload"),
      {
        kind: "date",
        key: "availableOn",
        section: "workload",
        label: t("filters.availableOn"),
        hint: t("filters.availableOnHint"),
      },

      /* --- Location & agency --------------------------------------------- */
      {
        key: "countryId",
        section: "location",
        label: t("filters.country"),
        options: (countries.data ?? [])
          .filter((c) => c.isActive)
          .map((c) => ({ value: c.id, label: lookupLabel(c, locale) })),
      },
      {
        key: "cityId",
        section: "location",
        label: t("filters.city"),
        hint: t("filters.cityHint"),
        // Empty until a country is chosen, and a select with no options renders
        // nothing — which is the wanted behaviour with no extra flag.
        options: (cities.data ?? [])
          .filter((c) => c.isActive)
          .map((c) => ({ value: c.id, label: lookupLabel(c, locale) })),
      },
      {
        key: "agencyId",
        section: "location",
        label: t("filters.agency"),
        hint: t("filters.agencyHint"),
        options: (agencies.data ?? []).map((a) => ({
          value: a.id,
          // Two agencies can share a trading name; the city is what tells them
          // apart, which is why the endpoint returns it.
          label: a.city ? `${a.legalName} · ${a.city}` : a.legalName,
        })),
      },
      {
        key: "agencySource",
        section: "location",
        label: t("filters.agencySource"),
        hint: t("filters.agencySourceHint"),
        options: [
          { value: "Independent", label: t("filters.agencySourceIndependent") },
          { value: "ViaAgency", label: t("filters.agencySourceViaAgency") },
        ],
      },

      /* --- Dormancy ------------------------------------------------------- */
      {
        kind: "triState",
        key: "neverLoggedIn",
        section: "dormancy",
        label: t("filters.neverLoggedIn"),
        hint: t("filters.neverLoggedInHint"),
        anyLabel: t("filters.neverLoggedInAny"),
        trueLabel: t("filters.neverLoggedInTrue"),
        falseLabel: t("filters.neverLoggedInFalse"),
      },
      {
        kind: "dateRange",
        fromKey: "lastSeenFrom",
        toKey: "lastSeenTo",
        section: "dormancy",
        label: t("filters.lastSeen"),
        hint: t("filters.lastSeenHint"),
        disabled: neverSeen,
      },
      {
        kind: "dateRange",
        fromKey: "registeredFrom",
        toKey: "registeredTo",
        section: "dormancy",
        label: t("filters.registered"),
      },
    ];

    /** The five account words, which are `workers.account.*` plus two shared ones. */
    function tAccountOrStatus(s: string): string {
      if (s === "Blocked") return tAccount("blocked");
      if (s === "Lapsed") return tAccount("lapsed");
      if (s === "Deleted") return tAccount("deleted");
      return s === "Active" ? tStage("active") : tCommon("pending");
    }
  }, [
    t,
    tStage,
    tAccount,
    tCommon,
    locale,
    professions.data,
    countries.data,
    cities.data,
    agencies.data,
    state.filters.neverLoggedIn,
    state.filters.ratingMin,
  ]);

  /**
   * The `Sorted by` options: the six sortable columns, both directions.
   *
   * Built from the same registry the headers read, so a column that loses its
   * `sortKey` disappears from here too rather than becoming a dropdown entry that
   * returns `400 invalid_sort_column`.
   */
  const activeFilters = useMemo(
    () => countActiveFields(fields, state.filters),
    [fields, state.filters],
  );

  const sortOptions = useMemo(
    () =>
      (
        [
          ["registered", "desc"],
          ["registered", "asc"],
          ["worker", "asc"],
          ["worker", "desc"],
          ["rating", "desc"],
          ["rating", "asc"],
          ["workload", "desc"],
          ["workload", "asc"],
          ["lastSeen", "desc"],
          ["lastSeen", "asc"],
          ["experience", "desc"],
          ["experience", "asc"],
        ] as const
      )
        .filter(([id]) => columns.some((c) => c.id === id && c.sortKey))
        .map(([id, dir]) => ({
          value: `${id}:${dir}`,
          label: t(
            `sort.${id === "worker" ? "name" : id}${dir === "asc" ? "Asc" : "Desc"}` as "sort.nameAsc",
          ),
        })),
    [columns, t],
  );

  const tabs = useMemo(
    () =>
      TABS.map((key) => ({
        value: key,
        label: t(`tabs.${key}` as "tabs.all"),
        // No counts: this endpoint pages, so a per-tab count would be another
        // probe per tab and would still only ever be the server's.
      })),
    [t],
  );

  const strip = (
    <WorkersSummaryStrip
      total={data?.total ?? 0}
      counts={summary.counts}
      isLoading={summary.isLoading}
      filters={state.filters}
      onFilters={state.setFilters}
    />
  );

  return (
    /*
      Grows so the card can reach the bottom of the window — `main` in the
      dashboard layout is already a full-height flex column and this is the link
      between it and the card.
    */
    <div className="flex grow flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-bold leading-tight tracking-tight">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>

        <div className="flex items-center gap-1.5">
          {/*
            The review shortcut is a **filter, not a screen** — it sets the same
            tab an admin can reach from the strip, so the queue can never drift
            from the directory and the URL is shareable either way.
          */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => state.setTab("review")}
            className="gap-2 rounded-lg border-status-pending/30 bg-status-pending-tint/60 text-status-pending-deep hover:bg-status-pending-tint"
          >
            <Inbox className="size-4" />
            {t("reviewQueue")}
            <span className="font-mono text-xs tabular-nums">
              {summary.counts.review ?? 0}
            </span>
          </Button>
          {/* Export is the one genuine page-level write, and it always equals the
              filtered set — there is no "export everything" mode server-side. */}
          <Button variant="outline" size="sm" disabled className="gap-2 rounded-lg">
            <Download className="size-4" />
            {t("export")}
          </Button>
        </div>
      </div>

      {/* A refused combination must explain itself: the table below still shows
          the previous result, so without this it reads as "no worker matches"
          rather than "these filters were not applied". */}
      {!built.ok && (
        <p className="text-xs text-destructive">{t("invalidCombination")}</p>
      )}

      {!forbidden && strip}

      {isMatrix ? (
        <>
          {/*
            One filter surface, two drawings. The band and the chips are the same
            components the table shell renders, driven by the same `state` — so a
            filter set in the Table still holds here, and the chips can clear a key
            a summary tile wrote.
          */}
          <Card className="grow-0 gap-0 overflow-hidden py-0">
            <MatrixToolbar
              state={{ ...state, setFilter }}
              week={week}
              onWeekShift={(n) => setWeekStart(shiftWeek(week.startKey, n))}
              onToday={() => setWeekStart("")}
              isThisWeek={week.startKey === weekOf(null, todayKey).startKey}
              viewSwitch={<ViewSwitch value={view} onChange={setView} />}
              filtersTrigger={
                <Button
                  variant={
                    matrixFiltersOpen || activeFilters > 0 ? "default" : "outline"
                  }
                  size="sm"
                  aria-expanded={matrixFiltersOpen}
                  onClick={() => setMatrixFiltersOpen((open) => !open)}
                  className="h-9 gap-[7px] rounded-lg px-3 text-[13.5px]"
                >
                  {tCommon("filters")}
                  <span className="font-mono text-xs tabular-nums">
                    {activeFilters}
                  </span>
                </Button>
              }
            />
            <FilterBar
              variant="band"
              open={matrixFiltersOpen}
              fields={fields}
              sections={sections}
              values={state.filters}
              onChange={setFilter}
              onChangeMany={state.setFilters}
              onReset={state.resetFilters}
              allLabel={tCommon("all")}
              clearLabel={tCommon("clearFilters")}
              note={tTable("filtersLive")}
            />
            {activeFilters > 0 && (
              <div className="border-t border-border px-4 py-2.5 sm:px-5">
                <FilterChips
                  fields={fields}
                  values={state.filters}
                  onChange={setFilter}
                  onChangeMany={state.setFilters}
                  onReset={state.resetFilters}
                  clearLabel={tCommon("clearFilters")}
                />
              </div>
            )}
          </Card>

          <WorkersMatrix
            week={week}
            todayKey={todayKey}
            workers={data?.items ?? []}
            attendance={attendance}
            groups={groups.data ?? []}
            // The grid is unreadable without attendance; the groups read only
            // costs the open-shifts row and the free-day Assign candidates, so
            // it is not a blocking refusal.
            isForbidden={forbidden || (permissions !== null && !canReadAttendance)}
            isLoading={isLoading || attendance.isLoading}
            onAssign={setAssigning}
            onOpenChip={(chip) => setAssigning(chip.kind === "short" ? chip : null)}
            onAssignDay={(worker, dayKey, candidates) =>
              setAssigningDay({ worker, dayKey, candidates })
            }
          />

          <AssignSheet
            chip={assigning}
            groups={groups.data ?? []}
            workers={data?.items ?? []}
            onClose={() => setAssigning(null)}
          />

          <AssignDaySheet target={assigningDay} onClose={() => setAssigningDay(null)} />
        </>
      ) : (
        <DataTable
          state={{ ...state, setFilter }}
          scope="workers"
          columns={columns}
          source={{
            mode: "server",
            rows: data?.items ?? [],
            total: data?.total ?? 0,
            isLoading,
            isError,
            // A refusal is not a failure: the shell names the missing grant
            // instead of telling an admin to reload a page they may not read.
            isForbidden: forbidden,
          }}
          rowKey={(w: WorkerRowDto) => w.id}
          rowHref={(w) => `/dashboard/workers/${w.id}`}
          rowLabel={(w) => w.fullName || w.id}
          rowClassName={workerRowClassName}
          // §08: below 768px the table becomes a stack of cards and never scrolls
          // sideways. The card keeps both status axes — see `WorkerRowCard`.
          mobileCard={(w) => <WorkerRowCard worker={w} />}
          title={t("list")}
          tabs={tabs}
          tabsLabel={t("tabsLabel")}
          fields={fields}
          sections={sections}
          searchPlaceholder={t("searchPlaceholder")}
          empty={{ title: t("emptyTitle"), body: t("emptyBody") }}
          toolbar={({ filtersTrigger, columnPicker, density }) => (
            <WorkersToolbar
              state={state}
              view={view}
              onViewChange={setView}
              filtersTrigger={filtersTrigger}
              columnPicker={columnPicker}
              density={density}
              sortOptions={sortOptions}
            />
          )}
        />
      )}
    </div>
  );
}

/** The Monday on screen. Empty means this week, so the default leaves no trace. */
const WORKER_WEEK_PARAM = "week";

/**
 * One URL param, read and written without disturbing the rest of the query.
 *
 * `replace`, not `push`: paging a week or flipping a drawing is not a navigation,
 * and pushing would make Back walk through every step instead of leaving the
 * screen.
 */
function useUrlParam(key: string): [string, (value: string) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const set = useCallback(
    (value: string) => {
      const q = new URLSearchParams(params.toString());
      if (value) q.set(key, value);
      else q.delete(key);
      const qs = q.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [key, params, pathname, router],
  );

  return [params.get(key) ?? "", set];
}

/**
 * The view, in the URL beside the filters.
 *
 * ⚠ **Not `useState`.** The design's claim about the switch is that it changes how
 * the same set is drawn and never which set — filters, search, sort and page are
 * one shared state. That only holds if the view lives in the same address, so a
 * pasted link reopens the same rows in the same drawing.
 *
 * `replace`, not `push`: toggling a drawing is not a navigation, and pushing would
 * make Back walk through every switch instead of leaving the screen.
 */
function useWorkerViewParam(): [WorkerView, (view: WorkerView) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const raw = params.get(WORKER_VIEW_PARAM);
  const view: WorkerView = isWorkerView(raw) ? raw : "table";

  const setView = useCallback(
    (next: WorkerView) => {
      const q = new URLSearchParams(params.toString());
      // Table is the default, so it leaves no trace — two admins looking at the
      // table share one address whether or not either of them touched the switch.
      if (next === "table") q.delete(WORKER_VIEW_PARAM);
      else q.set(WORKER_VIEW_PARAM, next);
      const qs = q.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  return [view, setView];
}
