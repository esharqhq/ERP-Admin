"use client";

import type { ReactNode } from "react";
import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import type { TableUrlState } from "@/hooks/use-table-url-state";

/**
 * The properties table's toolbar.
 *
 * Takes what `Uyer-Admin-Properties.dc.html` draws and the shell does not offer —
 * the **filtered** heading, the `n of m` pill and the `Sorted by` control — and
 * leaves the rest to the shell's own controls.
 *
 * The heading changing with the filter is the point: the design's mock reads
 * *"Apartment blocks · 8 of 86"*, so it says what you are looking at rather than
 * what the page is called.
 *
 * ⚠ **Filters live behind the shell's `Filters` button and its in-card band**,
 * not in the row of dropdown pills the design draws. Decided by the user after
 * seeing both: one filter idiom across every table beats a per-screen drawing, and
 * the band is what owners and the documents queues already use. It also closes a
 * hole the pills had — the summary tiles write filter keys, and only the band and
 * its chips can show and clear them.
 */
export function PropertiesToolbar({
  state,
  total,
  matched,
  heading,
  filtersTrigger,
  columnPicker,
  sortOptions,
}: {
  state: TableUrlState;
  /** Every row on the platform. */
  total: number;
  /** What the filters left, which is the first half of the `n of m` pill. */
  matched: number;
  /** The filtered name — a category when one is picked, else the page's own. */
  heading: string;
  filtersTrigger: ReactNode;
  columnPicker: ReactNode;
  /** `columnId:dir` → label, in the order the control offers them. */
  sortOptions: { value: string; label: string }[];
}) {
  const t = useTranslations("properties");
  const tCommon = useTranslations("common");

  const sortValue = state.sort ? `${state.sort.key}:${state.sort.dir}` : "";
  const sortLabel =
    sortOptions.find((o) => o.value === sortValue)?.label ?? t("toolbar.sortedByNone");

  return (
    <div className="flex flex-wrap items-center gap-2.5 px-4 py-3.5 sm:px-5">
      <span className="whitespace-nowrap text-[15px] font-semibold tracking-[-0.01em]">
        {heading}
      </span>
      <span className="flex h-5 items-center whitespace-nowrap rounded-md bg-accent px-2 font-mono text-[10px] font-semibold text-primary">
        {matched === total
          ? t("toolbar.all", { total })
          : t("toolbar.matched", { matched, total })}
      </span>

      <div className="flex-1" />

      <div className="relative w-full sm:w-[280px]">
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

      {/* The same `state.sort` the column headers drive, so the dropdown and a
          header click cannot disagree about how the table is ordered. */}
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
          className="h-9 w-auto gap-1.5 rounded-lg px-2.5 text-[13px]"
        >
          <span className="text-muted-foreground">{t("toolbar.sortedBy")}</span>
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

      {columnPicker}
    </div>
  );
}
