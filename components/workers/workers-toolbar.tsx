"use client";

import type { ReactNode } from "react";
import { LayoutGrid, LayoutList, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import type { TableUrlState } from "@/hooks/use-table-url-state";
import { cn } from "@/lib/utils";

/**
 * The two states of the workers screen, and the URL param that carries the choice.
 *
 * ⚠ **Not `useState`.** The design's whole claim about the switch is that it
 * changes *how the same set is drawn* and never *which set* — filters, search,
 * sort and page are one shared state. That is only true if the view is in the URL
 * beside them, so a link an admin pastes reopens the same rows in the same
 * drawing.
 */
export const WORKER_VIEWS = ["table", "matrix"] as const;
export type WorkerView = (typeof WORKER_VIEWS)[number];
export const WORKER_VIEW_PARAM = "view";

export function isWorkerView(value: string | null): value is WorkerView {
  return value === "table" || value === "matrix";
}

/**
 * The workers table's toolbar — §01, two rows, inside the table card.
 *
 * **Row 1 is how the list is drawn.** The Table/Matrix switch sits at the far
 * left, above the filter row and inside the same card as the rows, which is what
 * places it in the *drawing* layer rather than the *which list* layer. The mono
 * line beside it says out loud what stays: `same filters · same page`. Search,
 * the column picker and density follow.
 *
 * **Row 2 is how the list is narrowed.** The shell's own Filters button, and a
 * `Sorted by` control.
 *
 * The shell's chip row renders directly beneath this. §01 draws the chips on row
 * 2 beside the Filters button; they stay on the shell's line for the reason
 * recorded for the properties toolbar — one filter idiom across every table beats
 * a per-screen drawing, and the shell's chips are the only thing that can clear a
 * key a summary tile wrote.
 */
export function WorkersToolbar({
  state,
  view,
  onViewChange,
  filtersTrigger,
  columnPicker,
  density,
  sortOptions,
}: {
  state: TableUrlState;
  view: WorkerView;
  onViewChange: (view: WorkerView) => void;
  filtersTrigger: ReactNode;
  columnPicker: ReactNode;
  density: ReactNode;
  /** `columnId:dir` → label, in the order the control offers them. */
  sortOptions: { value: string; label: string }[];
}) {
  const t = useTranslations("workers");
  const tCommon = useTranslations("common");

  const sortValue = state.sort ? `${state.sort.key}:${state.sort.dir}` : "";
  const sortLabel =
    sortOptions.find((o) => o.value === sortValue)?.label ?? t("toolbar.sortedByNone");

  return (
    <div className="flex flex-col gap-2.5 px-4 pb-3 pt-3.5 sm:px-5">
      {/* Row 1 — the drawing. */}
      <div className="flex flex-wrap items-center gap-2.5">
        <ViewSwitch value={view} onChange={onViewChange} />

        <span className="hidden font-mono text-[11px] text-muted-foreground/70 lg:inline">
          {t("toolbar.sameSet")}
        </span>

        <div className="flex-1" />

        <div className="relative w-full sm:w-[290px]">
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

        {columnPicker}
        {density}
      </div>

      {/* Row 2 — the narrowing. */}
      <div className="flex flex-wrap items-center gap-2.5">
        {filtersTrigger}

        <div className="flex-1" />

        <span className="whitespace-nowrap text-[11px] text-muted-foreground">
          {t("toolbar.sortedBy")}
        </span>
        {/* The same `state.sort` the column headers drive, so a header click and
            this dropdown cannot disagree about how the table is ordered. */}
        <Select
          value={sortValue}
          onValueChange={(v) => {
            const [key, dir] = String(v).split(":");
            state.setSort(key ? { key, dir: dir === "asc" ? "asc" : "desc" } : null);
          }}
          items={sortOptions}
        >
          <SelectTrigger
            aria-label={t("toolbar.sortedBy")}
            className="h-[30px] w-auto gap-1.5 rounded-lg px-2.5 text-[12.5px]"
          >
            <span className="font-medium">{sortLabel}</span>
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

/**
 * Two drawings of one set.
 *
 * Exported because **both** states draw it: the switch belongs to the screen, not
 * to the Table's toolbar, and two copies could disagree about which is lit.
 *
 * A segmented control rather than tabs: the stage tabs directly below choose
 * **which** workers, and two tab strips stacked would ask an admin to work out
 * which of them changes the population. This one is visibly a different kind of
 * control — a raised pill inside a sunken track — which is the distinction doing
 * the work.
 */
export function ViewSwitch({
  value,
  onChange,
}: {
  value: WorkerView;
  onChange: (view: WorkerView) => void;
}) {
  const t = useTranslations("workers");
  const items = [
    { key: "table" as const, label: t("view.table"), Icon: LayoutList },
    { key: "matrix" as const, label: t("view.matrix"), Icon: LayoutGrid },
  ];

  return (
    <div
      role="group"
      aria-label={t("view.label")}
      className="flex flex-none gap-0.5 rounded-[10px] bg-shell-tint p-[3px]"
    >
      {items.map(({ key, label, Icon }) => {
        const on = value === key;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(key)}
            className={cn(
              "flex h-7 items-center gap-[7px] rounded-lg px-3 text-[12.5px] transition-colors",
              "outline-none focus-visible:ring-2 focus-visible:ring-ring",
              on
                ? "bg-card font-semibold text-primary shadow-sm"
                : "font-medium text-ink-soft hover:text-foreground",
            )}
          >
            <Icon className="size-[14px]" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
