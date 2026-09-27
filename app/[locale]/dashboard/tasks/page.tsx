"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { DataTable } from "@/components/ui/data-table";
import { useTableUrlState } from "@/hooks/use-table-url-state";
import { useTodayKey, useClock } from "@/hooks/use-today";
import { useDispatchQueue } from "@/hooks/use-tasks";
import { useTaskRegister } from "@/hooks/use-task-register";
import { useProfessions } from "@/hooks/use-professions";
import { useProperties } from "@/hooks/use-properties";
import { useOwnerDirectory } from "@/hooks/use-owners";
import { useHasPermission } from "@/hooks/use-current-permissions";
import {
  DEFAULT_REGISTER_TAB, REGISTER_FILTER_KEYS, REGISTER_TABS, isCapped, matchesRegister,
  matchesSearch, resolveWindow, tabMatches, type RegisterTab,
} from "@/lib/tasks/register/filters";
import { registerSummary } from "@/lib/tasks/register/summary";
import type { RegisterRow } from "@/lib/tasks/register/rows";
import { professionLabel } from "@/lib/types/profession.types";
import { registerColumns } from "@/components/tasks/register/register-columns";
import { RegisterRowCard } from "@/components/tasks/register/register-row-card";
import { RegisterStrip } from "@/components/tasks/register/register-strip";
import { registerFields } from "@/components/tasks/register/register-fields";
// Task 6 adds the assign sheet; Task 7 adds the calendar switch.

const TILE_TABS: readonly string[] = ["unstaffed", "short", "next7"];

/**
 * The Tasks register (spec §3): one row per day of work, over a date window the
 * server returns, narrowed in the browser by the band and the saved views.
 */
export default function TasksPage() {
  const t = useTranslations("tasks.register");
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
  const professions = useProfessions();
  // Same args as the read inside useTaskRegister — one cache entry, no second request.
  const properties = useProperties();
  // Gated like the properties page: an admin with task:list_any but not
  // owner:list gets no Owner filter rather than a 403 on page load.
  const canListOwners = useHasPermission("owner:list");
  const owners = useOwnerDirectory(undefined, canListOwners);

  // `useClock()` is 0 on the server snapshot — count nothing rather than count against 1970.
  const summary = useMemo(
    () => (clock
      ? registerSummary(dispatch.data ?? [], new Date(clock))
      : { unstaffedToday: 0, short: 0, overdue: 0, next7: 0 }),
    [dispatch.data, clock],
  );
  // Task 6 opens the assign sheet on this; until then it only records the row.
  const [, setAssignRow] = useState<RegisterRow | null>(null);

  const columns = useMemo(() => {
    const byId = new Map((professions.data ?? []).map((p) => [p.id, p]));
    const professionName = (id: string) => {
      const p = byId.get(id);
      return p ? professionLabel(p, locale) || p.code : id;
    };
    return registerColumns({ t, locale, professionName, onAssign: setAssignRow });
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
      professions: professions.data ?? [],
    }),
    [t, locale, properties.data, owners.data, canListOwners, professions.data],
  );

  /**
   * One URL write, never two. `setTab` then `setFilters` in the same tick both
   * merge into the query captured at render, so the second would silently drop
   * the first (see `setFilters` in use-table-url-state.ts). `tab` is not a filter
   * key, but the write accepts any param and `""` removes it — the default tab.
   */
  function pick(target: RegisterTab | "overdue") {
    if (target === "overdue") {
      state.setFilters({ tab: "", overdue: "true", from: "", to: "" });
      return;
    }
    state.setFilters({ tab: target === DEFAULT_REGISTER_TAB ? "" : target, overdue: "", from: "", to: "" });
  }

  const hasDates = Boolean(state.filters.from || state.filters.to);
  const activeTile = state.filters.overdue === "true"
    ? "overdue"
    : !hasDates && TILE_TABS.includes(state.tab) ? (state.tab as RegisterTab) : null;

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
        scope="tasks-register"
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
    </div>
  );
}
