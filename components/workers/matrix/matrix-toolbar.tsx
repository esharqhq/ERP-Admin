"use client";

import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TableUrlState } from "@/hooks/use-table-url-state";
import { weekRangeLabel, type Week } from "@/lib/ui/week";

/**
 * The Matrix's toolbar — §02's first row.
 *
 * The **same** view switch, search and Filters button the Table draws, so the two
 * states are visibly one screen; the week pager replaces the column picker and
 * density, which have nothing to control in a grid whose columns are days.
 *
 * ⚠ The week pager writes the URL, not local state. Filters, search, sort, page
 * **and the week** are one shared address: that is the design's claim about the
 * switch, and it is only true if a pasted link reopens the same week.
 */
export function MatrixToolbar({
  state,
  week,
  onWeekShift,
  onToday,
  isThisWeek,
  viewSwitch,
  filtersTrigger,
}: {
  state: TableUrlState;
  week: Week;
  onWeekShift: (weeks: number) => void;
  onToday: () => void;
  isThisWeek: boolean;
  viewSwitch: ReactNode;
  filtersTrigger: ReactNode;
}) {
  const t = useTranslations("workers");
  const tMatrix = useTranslations("workers.matrix");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  return (
    <div className="flex flex-col gap-2.5 px-4 pb-3 pt-3.5 sm:px-5">
      <div className="flex flex-wrap items-center gap-2.5">
        {viewSwitch}

        <div className="flex flex-none items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onWeekShift(-1)}
            aria-label={tMatrix("previousWeek")}
            className="size-7 rounded-lg"
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onToday}
            // Disabled rather than hidden: a control that vanishes when it would
            // do nothing makes the row change width as an admin pages around.
            disabled={isThisWeek}
            className="h-7 rounded-lg px-2.5 text-xs"
          >
            {tMatrix("thisWeek")}
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onWeekShift(1)}
            aria-label={tMatrix("nextWeek")}
            className="size-7 rounded-lg"
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </div>

        <div className="flex flex-none items-baseline gap-1.5">
          <span className="font-mono text-[11px] font-semibold tracking-[0.08em] text-muted-foreground">
            {tMatrix("weekAbbrev")}
          </span>
          <span className="text-[17px] font-bold tracking-[-0.02em] tabular-nums">
            {week.isoWeek}
          </span>
          <span className="whitespace-nowrap text-[12.5px] text-muted-foreground">
            {weekRangeLabel(week, locale)}
          </span>
        </div>

        <div className="flex-1" />

        <div className="relative w-full sm:w-[230px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-[15px] -translate-y-1/2 text-muted-foreground" />
          <Input
            value={state.searchInput}
            onChange={(e) => state.setSearchInput(e.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            className="h-9 rounded-lg pl-9 pr-8 text-[13.5px]"
          />
          {state.searchInput && (
            <button
              type="button"
              onClick={() => state.setSearchInput("")}
              aria-label={tCommon("clearFilters")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {filtersTrigger}
      </div>

      <span className="font-mono text-[11px] text-muted-foreground/70">
        {t("toolbar.sameSet")}
      </span>
    </div>
  );
}
