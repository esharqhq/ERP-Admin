"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { DataTable } from "@/components/ui/data-table";
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
  DEFAULT_REGISTER_TAB, REGISTER_FILTER_KEYS, REGISTER_TABS, isCapped, matchesRegister,
  matchesSearch, resolveWindow, tabMatches, type RegisterTab,
} from "@/lib/tasks/register/filters";
import { registerSummary } from "@/lib/tasks/register/summary";
import type { RegisterRow } from "@/lib/tasks/register/rows";
import { compareSchedule } from "@/lib/tasks/register/sort";
import { DISPATCH_BACKSTOP_DAYS } from "@/lib/tasks/dispatch-window";
import { classifyAssignError, type AssignErrorKind } from "@/lib/tasks/assign-errors";
import { propertyLabel } from "@/lib/tasks/dispatch-search";
import { professionLabel } from "@/lib/types/profession.types";
import { addDays, fromDayKey, toDayKey } from "@/lib/ui/week";
import { dayLabel, registerColumns } from "@/components/tasks/register/register-columns";
import { RegisterRowCard } from "@/components/tasks/register/register-row-card";
import { RegisterStrip } from "@/components/tasks/register/register-strip";
import { registerFields } from "@/components/tasks/register/register-fields";
// Task 7 adds the calendar switch.

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
  const range = useMemo(
    () => (todayKey ? resolveWindow(state.tab, state.filters, todayKey) : null),
    [state.tab, state.filters, todayKey],
  );
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
    state.setFilters({ tab: target === DEFAULT_REGISTER_TAB ? "" : target, overdue: "", from: "", to: "" });
  }

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

  /** Copied from `dispatch/page.tsx` — same three namespaces, same order, on purpose. */
  const wordRefusal = (kind: AssignErrorKind, genericKey: string): string => {
    switch (kind.kind) {
      case "permission":
        return tOnboarding("permissionDenied");
      case "catalog":
        return tOnboarding(`apiErrors.${kind.labelKey}`);
      case "legacy":
        return tDispatch(`errors.${kind.code}`);
      case "unknown":
        return tDispatch(genericKey);
    }
  };

  const assignError =
    assignRow && assign.isError ? wordRefusal(classifyAssignError(assign.error), "errors.generic") : null;

  useRegisterKeys({
    onSearch: () => {
      document.getElementById(`${TABLE_SCOPE}-search`)?.focus();
    },
    onNext: () => {
      // Cosmetic gate: without the permission the row's own Assign button is
      // already hidden by `<Can>`, so `N` must not open a door it hid.
      if (!canAssign) return;
      const sorted = [...register.rows].sort(compareSchedule);
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
      <DataTable
        state={state}
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
