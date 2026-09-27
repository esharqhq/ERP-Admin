"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, LayoutList } from "lucide-react";
import { DataTable, TableEmpty, TableError, TableForbidden, TableNoMatch } from "@/components/ui/data-table";
import { ViewSwitch } from "@/components/ui/view-switch";
import { AssignWorkerSheet } from "@/components/tasks/assign-worker-sheet";
import { useTableUrlState } from "@/hooks/use-table-url-state";
import { useTodayKey, useClock } from "@/hooks/use-today";
import { useAssignWorker, useDispatchQueue } from "@/hooks/use-tasks";
import { useTaskRegister } from "@/hooks/use-task-register";
import { useProfessions } from "@/hooks/use-professions";
import { useProperties } from "@/hooks/use-properties";
import { useOwnerDirectory } from "@/hooks/use-owners";
import { useHasPermission } from "@/hooks/use-current-permissions";
import { useRegisterKeys } from "@/hooks/use-register-keys";
import {
  DEFAULT_REGISTER_TAB, REGISTER_FILTER_KEYS, REGISTER_TABS, bandResetPatch, bandValues,
  isBandFiltered, isCapped, matchesRegister, matchesSearch, resolveWindow, tabMatches,
  type RegisterTab,
} from "@/lib/tasks/register/filters";
import {
  calendarBandPatch, calendarWeek, registerView, toListPatch, weekPatch, type RegisterView,
} from "@/lib/tasks/register/week";
import { registerSummary } from "@/lib/tasks/register/summary";
import type { RegisterRow } from "@/lib/tasks/register/rows";
import { compareSchedule } from "@/lib/tasks/register/sort";
import { DISPATCH_BACKSTOP_DAYS } from "@/lib/tasks/dispatch-window";
import { assignRefusalText, classifyAssignError } from "@/lib/tasks/assign-errors";
import { propertyLabel } from "@/lib/tasks/dispatch-search";
import { professionLabel } from "@/lib/types/profession.types";
import { addDays, fromDayKey, toDayKey } from "@/lib/ui/week";
import { dayLabel, registerColumns } from "@/components/tasks/register/register-columns";
import { RegisterRowCard } from "@/components/tasks/register/register-row-card";
import { RegisterStrip } from "@/components/tasks/register/register-strip";
import { registerFields } from "@/components/tasks/register/register-fields";
import { RegisterCalendarShell } from "@/components/tasks/register/register-calendar-shell";

const TILE_TABS: readonly string[] = ["unstaffed", "short", "next7"];
/** The table's `scope` — also the id the search input publishes for `/`. */
const TABLE_SCOPE = "tasks-register";

/**
 * The Tasks register (spec §3): one row per day of work, over a date window the
 * server returns, narrowed in the browser by the band and the saved views.
 */
export default function TasksPage() {
  const t = useTranslations("tasks.register");
  // Same two namespaces Dispatch words a refusal from — no duplicate copy here.
  const tDispatch = useTranslations("dispatch");
  const tOnboarding = useTranslations("onboarding");
  const locale = useLocale();
  const todayKey = useTodayKey();
  const clock = useClock();
  const state = useTableUrlState({
    filterKeys: [...REGISTER_FILTER_KEYS],
    defaultTab: DEFAULT_REGISTER_TAB,
    // Design 06: soonest first is the only order an admin reads it in.
    defaultSort: { key: "schedule", dir: "asc" },
  });
  const view = registerView(state.filters);
  /** The week the calendar draws — `null` in the list, or until the clock is known. */
  const week = useMemo(
    () => (view === "calendar" && todayKey ? calendarWeek(state.filters, todayKey) : null),
    [view, state.filters, todayKey],
  );
  /**
   * Spec §5: while Calendar is on, the week pager **drives the date range** — the
   * window is always the week on screen, whatever the tab's default would be,
   * so a seven-column grid is never fed a one-day window.
   */
  const range = useMemo(() => {
    if (!todayKey) return null;
    const values = week
      ? { ...state.filters, from: week.dayKeys[0], to: week.dayKeys[6] }
      : state.filters;
    return resolveWindow(state.tab, values, todayKey);
  }, [state.tab, state.filters, todayKey, week]);
  // resolveWindow needs a real day; until the clock is known the hook gets a dummy
  // window and reports loading (useTaskRegister waits on the clock too).
  const register = useTaskRegister(range ?? resolveWindow(DEFAULT_REGISTER_TAB, {}, "2000-01-03"));
  const dispatch = useDispatchQueue();
  // Inactive included: a booking can still name a profession deactivated since,
  // and its chip must show the name, not fall back to nothing.
  const professions = useProfessions(true);
  // The band offers active professions only, as every picker does.
  const activeProfessions = useMemo(
    () => (professions.data ?? []).filter((p) => p.isActive),
    [professions.data],
  );
  // Same args as the read inside useTaskRegister — one cache entry, no second request.
  const properties = useProperties();
  // Gated like the properties page: an admin with task:list_any but not
  // owner:list gets no Owner filter rather than a 403 on page load.
  const canListOwners = useHasPermission("owner:list");
  const owners = useOwnerDirectory(undefined, canListOwners);
  // Cosmetic gate matching `AssignButton`'s own `<Can>` — the `N` key and the
  // sheet mount both respect it, so a keyboard shortcut cannot open a door the
  // row's own button would have hidden. The backend enforces the real gate.
  const canAssign = useHasPermission("task:assign_worker_any");

  // `useClock()` is 0 on the server snapshot — count nothing rather than count against 1970.
  const summary = useMemo(
    () => (clock
      ? registerSummary(dispatch.data ?? [], new Date(clock))
      : { unstaffedToday: 0, short: 0, overdue: 0, next7: 0 }),
    [dispatch.data, clock],
  );
  /**
   * The row Assign is open for — captured at the moment it was opened (click
   * or `N`), so `urgent` and the date/time read stay what the admin actually
   * saw. `task` itself is resolved live from `register.rows` below, exactly as
   * Dispatch's `assignTarget` is: so the sheet's own meter moves the instant
   * `invalidateTasks` refetches, right after a successful assign.
   */
  const [assignRow, setAssignRow] = useState<RegisterRow | null>(null);
  /** Whose assign was refused — the sheet keeps that row selected (Dispatch's own state). */
  const [refusedWorkerId, setRefusedWorkerId] = useState<string | null>(null);
  const assign = useAssignWorker();

  const columns = useMemo(() => {
    const byId = new Map((professions.data ?? []).map((p) => [p.id, p]));
    const profession = (id: string) => {
      const p = byId.get(id);
      if (!p) return null;
      return { label: professionLabel(p, locale) || p.nameEn || p.code, hueKey: p.nameEn || p.code };
    };
    return registerColumns({ t, locale, profession, onAssign: setAssignRow });
  }, [t, locale, professions.data]);

  const tabRows = useMemo(
    () => register.rows.filter((r) => tabMatches(state.tab, r, todayKey)),
    [register.rows, state.tab, todayKey],
  );
  const tabs = REGISTER_TABS.map((value) => ({
    value,
    label: t(`tabs.${value}`),
    count: value === state.tab && !register.isLoading ? tabRows.length : undefined,
  }));
  const { fields, sections } = useMemo(
    () => registerFields({
      t,
      locale,
      properties: properties.data ?? [],
      owners: canListOwners ? (owners.data ?? []) : [],
      professions: activeProfessions,
    }),
    [t, locale, properties.data, owners.data, canListOwners, activeProfessions],
  );

  /**
   * One URL write, never two. `setTab` then `setFilters` in the same tick both
   * merge into the query captured at render, so the second would silently drop
   * the first (see `setFilters` in use-table-url-state.ts). `tab` is not a filter
   * key, but the write accepts any param and `""` removes it — the default tab.
   */
  function pick(target: RegisterTab | "overdue") {
    if (target === "overdue") {
      // The tile counts over the Dispatch window, which reaches back
      // DISPATCH_BACKSTOP_DAYS; land on that same span up to today so the list
      // shows what the tile counted (an overdue day is never in the future).
      const from = todayKey
        ? toDayKey(addDays(fromDayKey(todayKey), -DISPATCH_BACKSTOP_DAYS))
        : "";
      state.setFilters({ tab: "", overdue: "true", from, to: todayKey });
      return;
    }
    state.setFilters({
      tab: target === DEFAULT_REGISTER_TAB ? "" : target, overdue: "", from: "", to: "", week: "",
    });
  }

  /**
   * `view` and `week` ride in the filter keys so one mechanism owns the URL —
   * but `useTableUrlState` counts every filter key in `isFiltered` and clears
   * every one in `resetFilters`. Left alone, the calendar switch by itself would
   * turn an empty window into "Nothing matches these filters", and Clear filters
   * would throw the admin out of the calendar. The shell gets band-only versions.
   */
  const tableState = useMemo(() => ({
    ...state,
    filters: bandValues(state.filters),
    isFiltered: isBandFiltered(state.filters, state.search),
    resetFilters: () => state.setFilters(bandResetPatch()),
  }), [state]);

  function setView(next: RegisterView) {
    if (next === view) return;
    // Calendar → List keeps the paged-to week as the list's range (spec §5).
    state.setFilters(next === "calendar" ? { view: "calendar" } : toListPatch(state.filters));
  }
  const viewSwitch = (
    <ViewSwitch
      label={t("view.label")}
      value={view}
      onChange={setView}
      items={[
        { key: "list", label: t("view.list"), Icon: LayoutList },
        { key: "calendar", label: t("view.calendar"), Icon: CalendarDays },
      ]}
    />
  );

  const hasDates = Boolean(state.filters.from || state.filters.to);
  const activeTile = state.filters.overdue === "true"
    ? "overdue"
    : !hasDates && TILE_TABS.includes(state.tab) ? (state.tab as RegisterTab) : null;

  /**
   * The task the sheet is filling, resolved from the live rows rather than the
   * `assignRow` snapshot — same reasoning as Dispatch's `assignTarget`: when the
   * assign succeeds and `invalidateTasks` refetches, the sheet's own meter moves
   * with it, and a task that vanished from the window resolves to `undefined`
   * instead of showing a stale row.
   */
  const assignTask = useMemo(
    () => (assignRow ? register.rows.find((r) => r.task.id === assignRow.task.id)?.task : undefined),
    [register.rows, assignRow],
  );

  const close = () => {
    setAssignRow(null);
    setRefusedWorkerId(null);
    assign.reset();
  };

  /**
   * Same four-way switch Dispatch words its own refusal from, over the same two
   * namespaces (`dispatch.errors.*`, `onboarding.*`) — the switch itself now
   * lives once, in `assignRefusalText` (`lib/tasks/assign-errors.ts`).
   */
  const assignError =
    assignRow && assign.isError
      ? assignRefusalText(classifyAssignError(assign.error), {
          permission: () => tOnboarding("permissionDenied"),
          catalog: (labelKey) => tOnboarding(`apiErrors.${labelKey}`),
          legacy: (code) => tDispatch(`errors.${code}`),
          generic: () => tDispatch("errors.generic"),
        })
      : null;

  /**
   * What `N` is allowed to pick from — `tabRows` (the tab's own narrowing)
   * further narrowed by the search box and the filter band, the same two steps
   * `applyClientPipeline` runs before it ever gets to paging or sort. `N` picks
   * its own order on top (`compareSchedule`) rather than reading the table's
   * current column sort, so this stops short of paging — deliberately: R6 is
   * "the rows the admin can see", not "the one page of them currently sliced".
   */
  const visibleRows = useMemo(
    () => tabRows.filter(
      (r) =>
        matchesSearch(r, state.search.trim().toLowerCase())
        && matchesRegister(r, state.filters, register.lookups),
    ),
    [tabRows, state.search, state.filters, register.lookups],
  );

  useRegisterKeys({
    onSearch: () => {
      document.getElementById(`${TABLE_SCOPE}-search`)?.focus();
    },
    onNext: () => {
      // Cosmetic gate: without the permission the row's own Assign button is
      // already hidden by `<Can>`, so `N` must not open a door it hid.
      if (!canAssign) return;
      // The next unstaffed row **on screen** (else the next assignable one on
      // screen) — not the whole loaded window, which can hold rows the current
      // tab, search or filter band has hidden.
      const sorted = [...visibleRows].sort(compareSchedule);
      const next = sorted.find((r) => r.unstaffedToday) ?? sorted.find((r) => r.assignable);
      if (next) setAssignRow(next);
    },
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <RegisterStrip
        summary={summary}
        isLoading={dispatch.isPending || !clock}
        onPick={pick}
        active={activeTile}
      />
      {isCapped(register.count) ? <p className="text-xs text-muted-foreground">{t("capped")}</p> : null}
      {view === "calendar" ? (
        <RegisterCalendarShell
          state={tableState}
          scope={TABLE_SCOPE}
          title={t("title")}
          subtitle={t("subtitle")}
          count={register.isLoading || register.isForbidden ? undefined : visibleRows.length}
          viewSwitch={viewSwitch}
          tabs={tabs}
          tabsLabel={t("tabsLabel")}
          searchPlaceholder={t("search")}
          fields={fields}
          sections={sections}
          // A band date write takes the range back from the week pager.
          onBandChange={(key, value) => state.setFilters(calendarBandPatch({ [key]: value }))}
          onBandChangeMany={(patch) => state.setFilters(calendarBandPatch(patch))}
          onBandReset={tableState.resetFilters}
          calendar={{
            // The same set the list shows: tab, search and band, over the week's window.
            rows: visibleRows,
            weekStartKey: week?.startKey ?? "",
            todayKey,
            onWeek: (startKey) => state.setFilters(weekPatch(startKey)),
            isLoading: register.isLoading || !week,
            notice: register.isForbidden ? <TableForbidden />
              : register.isLoading || !week ? undefined
              : register.isError ? <TableError />
              : visibleRows.length > 0 ? undefined
              : tableState.isFiltered ? (
                <TableNoMatch
                  onClear={() => {
                    tableState.resetFilters();
                    state.setSearchInput("");
                  }}
                />
              ) : <TableEmpty title={t("empty.title")} body={t("empty.body")} />,
          }}
        />
      ) : (
      <DataTable
        state={tableState}
        actions={viewSwitch}
        scope={TABLE_SCOPE}
        title={t("title")}
        subtitle={t("subtitle")}
        columns={columns}
        rowKey={(r) => r.task.id}
        rowHref={(r) => `/dashboard/tasks/${r.task.groupId}`}
        rowLabel={(r) => r.title ?? r.task.propertyName ?? r.task.id}
        // The workers table's rail, and the only one this screen draws (design 01).
        rowClassName={(r) => (r.unstaffedToday ? "border-l-[3px] border-l-status-cancelled" : undefined)}
        mobileCard={(r) => <RegisterRowCard row={r} onAssign={setAssignRow} />}
        tabs={tabs}
        tabsLabel={t("tabsLabel")}
        fields={fields}
        sections={sections}
        searchPlaceholder={t("search")}
        empty={{ title: t("empty.title"), body: t("empty.body") }}
        source={{
          mode: "client",
          rows: tabRows,
          isLoading: register.isLoading,
          isError: register.isError,
          isForbidden: register.isForbidden,
          matches: matchesSearch,
          filter: (row, values) => matchesRegister(row, values, register.lookups),
        }}
      />
      )}

      {assignRow ? (
        <AssignWorkerSheet
          task={assignTask}
          propertyName={assignTask ? propertyLabel(assignTask) : "—"}
          time={assignRow.startTime}
          dateLabel={dayLabel(assignRow, locale)}
          urgent={assignRow.unstaffedToday}
          onClose={close}
          isPending={assign.isPending}
          error={assignError}
          refusedWorkerId={refusedWorkerId}
          onAssign={(workerId) => {
            // Held so the refused row stays selected and the message has an
            // owner; cleared on success by `close` (Dispatch's own pattern).
            setRefusedWorkerId(workerId);
            assign.mutate({ taskId: assignRow.task.id, workerId }, { onSuccess: close });
          }}
        />
      ) : null}
    </div>
  );
}
