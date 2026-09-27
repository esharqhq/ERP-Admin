"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import { Filter, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { StageTabs, type StageTab } from "@/components/ui/data-table";
import { ToolbarButton, ToolbarCount } from "@/components/ui/data-table/toolbar-button";
import {
  FilterBar,
  FilterChips,
  countActiveFields,
  type FilterField,
  type FilterSection,
} from "@/components/ui/filter-bar";
import { Input } from "@/components/ui/input";
import { RegisterCalendar } from "@/components/tasks/register/register-calendar";
import type { TableUrlState } from "@/hooks/use-table-url-state";
import { cn } from "@/lib/utils";

/**
 * The Calendar state of the Tasks register (design 02): the **same card** the
 * list draws — title, view switch, saved views, search, Filters and its band —
 * with the week in place of the table.
 *
 * Why not `DataTable` with its body hidden: the shell renders its rows region
 * and footer unconditionally (its `toolbar` override replaces rows 1–3 only),
 * so there is nothing to hide without adding a prop to a shared shell. This is
 * the workers Matrix's answer to the same problem (`workers/page.tsx`): the
 * shell's own exported pieces — `StageTabs`, `ToolbarButton`, `FilterBar
 * variant="band"`, `FilterChips` — over the same `state`, so a filter set in
 * the list holds here and the chips can clear it.
 *
 * The search input carries the shell's `${scope}-search` id, so the page's `/`
 * shortcut focuses it in both drawings.
 */
export function RegisterCalendarShell({
  state,
  scope,
  title,
  subtitle,
  count,
  viewSwitch,
  tabs,
  tabsLabel,
  searchPlaceholder,
  fields,
  sections,
  onBandChange,
  onBandChangeMany,
  onBandReset,
  calendar,
}: {
  state: TableUrlState;
  scope: string;
  title: string;
  subtitle?: string;
  /** Rows on screen; omitted while loading or refused. */
  count?: number;
  viewSwitch: ReactNode;
  tabs: StageTab[];
  tabsLabel: string;
  searchPlaceholder: string;
  fields: FilterField[];
  sections?: FilterSection[];
  onBandChange: (key: string, value: string) => void;
  onBandChangeMany: (patch: Record<string, string>) => void;
  onBandReset: () => void;
  calendar: ComponentProps<typeof RegisterCalendar>;
}) {
  const tCommon = useTranslations("common");
  const tTable = useTranslations("common.table");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilters = countActiveFields(fields, state.filters);
  const on = activeFilters > 0 || filtersOpen;

  return (
    <Card className="grow shrink-0 gap-0 overflow-hidden py-0">
      {/* Rows 1–3, drawn as the table shell draws them so the switch never moves a control. */}
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4 sm:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-base font-semibold tracking-tight">{title}</h2>
            {count !== undefined && (
              <span className="flex h-[22px] items-center rounded-full bg-muted px-2 font-mono text-xs text-muted-foreground tabular-nums">
                {count}
              </span>
            )}
          </div>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {viewSwitch}
      </div>

      <div className="px-4 pt-3.5 sm:px-5">
        <StageTabs tabs={tabs} value={state.tab} onChange={state.setTab} label={tabsLabel} />
      </div>

      <div className="flex flex-wrap items-center gap-2 px-4 py-3.5 sm:px-5">
        <div className="relative w-full sm:w-[250px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-[15px] -translate-y-1/2 text-muted-foreground" />
          <Input
            value={state.searchInput}
            onChange={(e) => state.setSearchInput(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            id={`${scope}-search`}
            className="h-9 rounded-lg pl-9 text-[13.5px]"
          />
        </div>
        {fields.length > 0 && (
          <ToolbarButton on={on} aria-expanded={filtersOpen} onClick={() => setFiltersOpen((o) => !o)}>
            <Filter className="size-[15px]" />
            <span className="hidden sm:inline">{tCommon("filters")}</span>
            <ToolbarCount on={on} pill>{activeFilters}</ToolbarCount>
          </ToolbarButton>
        )}
      </div>

      {fields.length > 0 && (
        <FilterBar
          variant="band"
          open={filtersOpen}
          fields={fields}
          sections={sections}
          values={state.filters}
          onChange={onBandChange}
          onChangeMany={onBandChangeMany}
          onReset={onBandReset}
          allLabel={tCommon("all")}
          clearLabel={tCommon("clearFilters")}
          note={tTable("filtersLive")}
        />
      )}
      {activeFilters > 0 && (
        <div className="border-b border-border px-4 py-2.5 sm:px-5">
          <FilterChips
            fields={fields}
            values={state.filters}
            onChange={onBandChange}
            onChangeMany={onBandChangeMany}
            onReset={onBandReset}
            clearLabel={tCommon("clearFilters")}
          />
        </div>
      )}

      {/* The chip row already draws the rule under itself; otherwise draw it here. */}
      <div className={cn("flex grow flex-col", activeFilters === 0 && "border-t border-border")}>
        <RegisterCalendar {...calendar} />
      </div>
    </Card>
  );
}
