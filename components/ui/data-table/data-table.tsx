"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Filter, Rows3, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  FilterBar,
  FilterChips,
  countActiveFields,
  type FilterField,
  type FilterSection,
} from "@/components/ui/filter-bar";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RowLink } from "@/components/ui/row-link";
import { useColumnPrefs } from "@/hooks/use-column-prefs";
import type { TableUrlState } from "@/hooks/use-table-url-state";
import { visibleColumns, type TableDensity } from "@/lib/ui/table-prefs";
import { applyClientPipeline } from "@/lib/ui/table-rows";
import { cn } from "@/lib/utils";
import { ColumnPicker } from "./column-picker";
import { StageTabs } from "./stage-tabs";
import { TableFooter } from "./table-footer";
import { ToolbarButton, ToolbarCount } from "./toolbar-button";
import {
  ROW_HEIGHT,
  TableEmpty,
  TableError,
  TableForbidden,
  TableNoMatch,
  TableSkeletonRows,
} from "./table-states";
import type { DataColumn, DataSource, StageTab } from "./types";

export interface DataTableProps<Row> {
  /** From `useTableUrlState`, owned by the page so the query and the table agree. */
  state: TableUrlState;
  /** Stable id for this queue — the key column preferences are stored under. */
  scope: string;
  /**
   * Memoize this. The labels are translated, so the array cannot live at module
   * scope, and a fresh array every render rebuilds the preference callbacks.
   */
  columns: DataColumn<Row>[];
  source: DataSource<Row>;
  rowKey: (row: Row) => string;
  /** Makes the whole row the link to the detail. */
  rowHref?: (row: Row) => string;
  /** Accessible label for a row's link, e.g. the subject's name. */
  rowLabel?: (row: Row) => string;
  /**
   * Classes for the whole `<tr>`, from the row's own state.
   *
   * A `cell` renderer cannot reach outside its own `<td>`, and two things the
   * workers design draws live at row scope: a **left rail** in the account tone
   * (a blocked worker is red down the edge of the row, not only in one cell) and a
   * **row ground** for the review queue. Both are statements about the row, so
   * they belong on the row.
   *
   * Applied after the density height, so a caller can override the ground; it
   * cannot override the height, which is the design system's and not a per-screen
   * choice.
   */
  rowClassName?: (row: Row) => string | undefined;
  /**
   * The row as a **card**, for viewports below `md`.
   *
   * §08 of the design system: below 768px a table becomes a stack of row-cards
   * and **never** a horizontally scrolling table. A table cannot be reflowed into
   * one — the columns an admin needs on a phone are a different, shorter
   * selection than the seven on a desktop, chosen by the screen rather than by the
   * picker — so the caller draws the card and the shell decides when to show it.
   *
   * Opt-in. A queue that does not pass one keeps today's behaviour exactly: the
   * table, scrolling inside its own container.
   *
   * `index` is the same 1-based page position `cell` receives.
   */
  mobileCard?: (row: Row, index: number) => ReactNode;

  title: string;
  subtitle?: string;
  actions?: ReactNode;

  /**
   * Omit for a queue with no stage axis. Row 2 then renders nothing rather than a
   * strip holding one pointless tab — the properties and tasks tables have no
   * such axis, and inventing an "All" tab to satisfy this prop would put a
   * control on screen that narrows nothing.
   */
  tabs?: StageTab[];
  /** Required alongside `tabs`; the accessible name for the strip. */
  tabsLabel?: string;

  /**
   * Replaces the shell's three toolbar rows with the caller's own. The filter
   * **band** and the chip row are unaffected — the caller places
   * `filtersTrigger` and the shell still owns what it opens.
   *
   * Exists because `Uyer-Admin-Properties.dc.html` draws a **different** toolbar
   * for the properties table — two rows, a `FILTER` strip of dropdown pills and a
   * `Sorted by` control, no band and no tabs — while needing everything else this
   * shell provides: the column registry and picker, the URL state, the client
   * pipeline, the four notice states and the row-height system. A bespoke table
   * would have thrown all of that away to change a header.
   *
   * The caller gets the shell's own state so its controls are real, not a second
   * copy: `total` is the pipeline's count, and `columnPicker` is the same
   * instance the default toolbar renders.
   *
   * Omit it and every existing consumer is untouched.
   */
  toolbar?: (ctx: {
    state: TableUrlState;
    total: number;
    fields?: FilterField[];
    activeFilters: number;
    /** The shell's own Filters button, driving the shell's own band. */
    filtersTrigger: ReactNode;
    columnPicker: ReactNode;
    density: ReactNode;
  }) => ReactNode;

  fields?: FilterField[];
  /**
   * Draws the band's fields under titled groups, matched to each field's
   * `section`. Worth it past roughly six dimensions — the workers queue has
   * twenty, and one flat grid of twenty is a wall. Omit for a flat band.
   */
  sections?: FilterSection[];
  /** Explains that filters apply live. Defaults to the shared sentence. */
  filterNote?: string;

  searchPlaceholder: string;
  /** Copy for "nothing is waiting" — per queue, never a generic "no data". */
  empty: { title: string; body: string; action?: ReactNode };
  /**
   * Must contain `state.pageSize` or the select is handed a value none of its
   * items carry. The default matches `DEFAULT_PAGE_SIZE` and what the design
   * draws — `TablePagination`'s own default (50/100/200) does not.
   */
  pageSizeOptions?: number[];
}

const PAGE_SIZES = [25, 50, 100];

/**
 * The shell both documents queues render through.
 *
 * **The one rule that matters here.** The two endpoints behind these queues are not
 * alike: the owner side is a bare array with no query parameters at all, the worker
 * side is paged and filtered and sorted by the server. So the source declares which
 * it is, and this component narrows **only** in `client` mode. Running the client
 * pipeline over a server page would search and count the 25 rows on screen and
 * present the answer as the whole set — a filter that quietly lies. There is no
 * code path from `mode: "server"` into `applyClientPipeline`.
 *
 * Everything else is shared: three toolbar rows, the stage tabs, the filter band,
 * the column picker, density, and the four things the table says instead of rows.
 */
export function DataTable<Row>({
  state,
  scope,
  columns,
  source,
  rowKey,
  rowHref,
  rowLabel,
  rowClassName,
  mobileCard,
  title,
  subtitle,
  actions,
  tabs,
  tabsLabel,
  toolbar,
  fields,
  sections,
  filterNote,
  searchPlaceholder,
  empty,
  pageSizeOptions = PAGE_SIZES,
}: DataTableProps<Row>) {
  const t = useTranslations("common.table");
  const tCommon = useTranslations("common");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { prefs, toggle, move, setDensity, reset } = useColumnPrefs(scope, columns);
  const shown = useMemo(() => visibleColumns(columns, prefs), [columns, prefs]);

  /**
   * The URL always carries the **column id**, in both modes. A server queue's wire
   * sort key is usually something else (`lastSeenAt` for a column called "Last
   * seen"), and letting that reach the address would make the same visible sort
   * produce two different links on two queues. The caller maps id → wire key.
   */
  const comparators = useMemo(() => {
    const out: Record<string, (a: Row, b: Row) => number> = {};
    for (const c of columns) if (c.compare) out[c.id] = c.compare;
    return out;
  }, [columns]);

  const page =
    source.mode === "client"
      ? applyClientPipeline({
          rows: source.rows,
          search: state.search,
          filters: state.filters,
          sort: state.sort,
          page: state.page,
          pageSize: state.pageSize,
          matches: source.matches,
          filter: source.filter,
          comparators,
        })
      : {
          rows: source.rows,
          total: source.total,
          /**
           * Clamped here too. The API decides the set, but `?page=7` outlives the
           * filter that made seven pages, and the pager would otherwise offer a
           * page number the server has no rows for.
           */
          page: Math.min(
            state.page,
            Math.max(1, Math.ceil(source.total / state.pageSize)),
          ),
        };

  const activeFilters = fields ? countActiveFields(fields, state.filters) : 0;
  const columnCount = Math.max(1, shown.length);

  /*
    Built once and handed to whichever toolbar renders. A custom toolbar drawing
    its own picker would be a second registry view over the same preferences —
    two controls that can disagree about which columns are on.
  */
  const columnPicker = (
    <ColumnPicker
      columns={columns}
      prefs={prefs}
      onToggle={toggle}
      onMove={move}
      onReset={reset}
    />
  );
  const densityToggle = (
    <DensityToggle density={prefs.density} onChange={setDensity} />
  );

  /*
    Shared for the same reason as the picker: a custom toolbar drawing its own
    Filters button would need its own `open` state, and two triggers over one band
    can disagree about whether it is showing.
  */
  const filtersTrigger =
    fields && fields.length > 0 ? (
      <ToolbarButton
        on={activeFilters > 0 || filtersOpen}
        aria-expanded={filtersOpen}
        onClick={() => setFiltersOpen((open) => !open)}
      >
        <Filter className="size-[15px]" />
        <span className="hidden sm:inline">{tCommon("filters")}</span>
        {/* Always rendered, `0` included. A badge that appears only once a filter
            is set makes the control change width as you use it, and "0" is the
            fastest way to say nothing is narrowing this list. */}
        <ToolbarCount on={activeFilters > 0 || filtersOpen} pill>
          {activeFilters}
        </ToolbarCount>
      </ToolbarButton>
    ) : null;

  /**
   * What the table says **instead of** rows — or `null` when it has rows.
   *
   * Order matters. A refusal is not an error and neither is an empty list, and an
   * admin sent to reload a page they are simply not allowed to read has been told
   * the wrong thing twice. Loading is deliberately not one of these: skeletons
   * stand in for rows, so they go inside the table where the columns are.
   */
  const notice = (() => {
    if (source.isForbidden) return <TableForbidden />;
    if (source.isLoading) return null;
    if (source.isError) return <TableError />;
    if (page.rows.length > 0) return null;

    /**
     * Two different emptinesses, because the fix is different. Search or a filter
     * narrowed it to nothing → say so and offer Clear all. Nothing narrowed it →
     * the queue is genuinely clear, which on a stage tab is worth saying with a
     * way over to the whole list. The **tab is not a filter**: an empty Review tab
     * is good news, not a filter to clear.
     */
    if (state.isFiltered) {
      return (
        <TableNoMatch
          onClear={() => {
            state.resetFilters();
            state.setSearchInput("");
          }}
        />
      );
    }
    return (
      <TableEmpty
        {...empty}
        action={
          empty.action ??
          (state.isDefaultTab ? undefined : (
            <Button
              variant="outline"
              size="sm"
              onClick={state.resetTab}
              className="mt-1"
            >
              {t("seeAll")}
            </Button>
          ))
        }
      />
    );
  })();

  const rows = notice ? null : source.isLoading ? (
    <TableSkeletonRows columns={columnCount} density={prefs.density} />
  ) : (
    page.rows.map((row, rowIndex) => (
      <TableRow
        key={rowKey(row)}
        className={cn(
          ROW_HEIGHT[prefs.density],
          rowHref && "relative cursor-pointer",
          rowClassName?.(row),
        )}
      >
        {shown.map((column, i) => (
          <TableCell
            key={column.id}
            className={cn(
              "px-4",
              column.align === "right" && "text-right",
              column.className,
            )}
          >
            {/* The whole row is the link, so right-click and middle-click still
                behave. It has to sit inside a cell to be positioned against the
                row, and the first one is the only cell guaranteed to exist. */}
            {i === 0 && rowHref && (
              <RowLink href={rowHref(row)} label={rowLabel?.(row)} />
            )}
            {/* The page's own offset, so `#` counts 26–50 on page two rather
                than restarting at 1. */}
            {column.cell(row, (page.page - 1) * state.pageSize + rowIndex + 1)}
          </TableCell>
        ))}
      </TableRow>
    ))
  );

  /**
   * The same rows, drawn as cards. `null` whenever the table is drawing a notice
   * or has nothing to draw, so the two branches can never both render.
   *
   * Loading falls back to the skeleton **rows** deliberately: a phone showing six
   * card-shaped skeletons and then six cards of a different height jumps twice,
   * where the shared block does not pretend to be either.
   */
  const cards =
    !mobileCard || notice || source.isLoading
      ? null
      : page.rows.map((row, rowIndex) => {
          const index = (page.page - 1) * state.pageSize + rowIndex + 1;
          return (
            <div
              key={rowKey(row)}
              className={cn(
                "relative border-b border-border last:border-b-0",
                rowHref && "cursor-pointer",
                rowClassName?.(row),
              )}
            >
              {/* Same full-row link as the table, so right-click and
                  open-in-new-tab behave identically on both drawings. */}
              {rowHref && <RowLink href={rowHref(row)} label={rowLabel?.(row)} />}
              {mobileCard(row, index)}
            </div>
          );
        });

  return (
    /*
      `grow shrink-0`, never `flex-1`. A queue with one row has to reach the
      bottom of the window — that is the growth half. The other half is why the
      basis stays `auto`: `flex-1` sets `flex-basis: 0`, and a flex item whose
      overflow is not `visible` has an automatic minimum size of **zero**, so a
      card carrying `overflow-hidden` would be free to shrink under twenty-five
      rows and clip the tail of them. Growing up from the content height can only
      ever add space; it can never take any away.

      This is inert wherever the parent is not a flex column, so the shell does
      not force a height chain on a page that does not want one.
    */
    <Card className="grow shrink-0 gap-0 overflow-hidden py-0">
      {toolbar ? (
        /* The caller's own toolbar, in place of rows 1–3. The **band and chips
           below are not replaced** — one filter surface, whichever toolbar opens
           it. It gets the shell's state and the shell's own controls, so those are
           the real ones rather than a second view over the same preferences. */
        toolbar({
          state,
          total: page.total,
          fields,
          activeFilters,
          filtersTrigger,
          columnPicker,
          density: densityToggle,
        })
      ) : (
        <>
      {/* Row 1 — who this list is and what can be done to it. */}
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4 sm:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-base font-semibold tracking-tight">
              {title}
            </h2>
            {!source.isLoading && !source.isForbidden && (
              <span className="flex h-[22px] items-center rounded-full bg-muted px-2 font-mono text-xs text-muted-foreground tabular-nums">
                {page.total}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {actions}
      </div>

      {/* Row 2 — the stages. Never merged into the row below: the design keeps the
          three rows separate because a single wrapping row reflows differently at
          every width and the tabs stop being findable. Absent entirely on a queue
          with no stage axis. */}
      {tabs && tabs.length > 0 && (
        <div className="px-4 pt-3.5 sm:px-5">
          <StageTabs
            tabs={tabs}
            value={state.tab}
            onChange={state.setTab}
            label={tabsLabel ?? title}
          />
        </div>
      )}

      {/* Row 3 — find within, narrow, choose columns, choose density.
          Search is a fixed 250px and the column/density pair is pushed to the far
          end, exactly as drawn: letting the field take the slack instead makes the
          two right-hand controls drift with the viewport and never sit still. */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3.5 sm:px-5">
        <div className="relative w-full sm:w-[250px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-[15px] -translate-y-1/2 text-muted-foreground" />
          <Input
            value={state.searchInput}
            onChange={(e) => state.setSearchInput(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="h-9 rounded-lg pl-9 text-[13.5px]"
          />
        </div>

        {filtersTrigger}

        <div className="flex items-center gap-2 sm:ml-auto">
          {columnPicker}
          {densityToggle}
        </div>
      </div>

        </>
      )}

      {/* The band, inside the card — the table stays visible while you filter. */}
      {fields && fields.length > 0 && (
        <FilterBar
          variant="band"
          open={filtersOpen}
          fields={fields}
          sections={sections}
          values={state.filters}
          onChange={state.setFilter}
          // The shell's values live in the URL, which does not merge concurrent
          // writes — a date preset moves two params and a range chip clears two.
          onChangeMany={state.setFilters}
          onReset={state.resetFilters}
          allLabel={tCommon("all")}
          clearLabel={tCommon("clearFilters")}
          note={filterNote ?? t("filtersLive")}
        />
      )}

      {/* One chip per active filter, on its own line, so "filters are on" is never
          invisible once the band is closed again. */}
      {fields && activeFilters > 0 && (
        <div className="border-b border-border px-4 py-2.5 sm:px-5">
          <FilterChips
            fields={fields}
            values={state.filters}
            onChange={state.setFilter}
            // Same reason as the band above: clearing a range chip is two params.
            onChangeMany={state.setFilters}
            onReset={state.resetFilters}
            clearLabel={tCommon("clearFilters")}
          />
        </div>
      )}
      {/* The rows region takes whatever height the toolbar above and the footer
          below leave over. Same `grow` reasoning as the card, and deliberately no
          `overflow-hidden` here — adding one would re-open the zero-minimum trap
          the card comment describes. */}
      <div className="flex grow flex-col">
        {cards && <div className="flex flex-col md:hidden">{cards}</div>}
        {/*
          Hidden rather than unmounted below `md`: the header still carries the
          sort controls, and a `hidden` subtree keeps them in the accessibility
          tree for a screen reader on a narrow viewport.
        */}
        <div className={cn("flex flex-col", mobileCard && "hidden md:flex")}>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {shown.map((column) => (
                <SortableHead
                  key={column.id}
                  column={column}
                  mode={source.mode}
                  sort={state.sort}
                  onSort={state.toggleSort}
                  label={(name) => t("sortBy", { column: name })}
                />
              ))}
            </TableRow>
          </TableHeader>
          {rows && <TableBody>{rows}</TableBody>}
        </Table>
        </div>

        {notice ? (
          <div className="flex grow items-center justify-center">{notice}</div>
        ) : (
          /* The design's own trailing spacer. It is what pins the footer to the
             bottom of a card taller than its rows — without it a one-row queue
             puts its pager under row one and leaves the rest of the card blank. */
          <div className="grow" />
        )}
      </div>

      {page.total > 0 && !source.isForbidden && (
        <div className="border-t border-border">
          <TableFooter
            page={page.page}
            pageSize={state.pageSize}
            total={page.total}
            pageSizeOptions={pageSizeOptions}
            onPageChange={state.setPage}
            onPageSizeChange={state.setPageSize}
          />
        </div>
      )}
    </Card>
  );
}

const HEAD = "h-10 px-4";

/**
 * Small-caps tracked register head. Repeated on the inner `<button>` rather than
 * only on the `<th>` — a form control does not inherit `text-transform` from its
 * cell, so putting it on the header alone renders every sortable column in
 * sentence case beside its uppercase neighbours.
 */
const HEAD_TEXT =
  "text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground";

/**
 * A column is sortable in the mode that can actually sort it: client mode needs a
 * comparator, server mode needs a wire key. A header that offers a sort the data
 * source cannot perform is a click that does nothing.
 *
 * **Only the sorted column carries an arrow**, and it turns forest while it does.
 * A dormant glyph on every sortable header is six pieces of furniture saying
 * nothing; one arrow on one column says where the order came from, which is the
 * only question a header answers.
 */
function SortableHead<Row>({
  column,
  mode,
  sort,
  onSort,
  label,
}: {
  column: DataColumn<Row>;
  mode: DataSource<Row>["mode"];
  sort: TableUrlState["sort"];
  onSort: (key: string) => void;
  label: (column: string) => string;
}) {
  const sortable = mode === "client" ? !!column.compare : !!column.sortKey;
  const active = sort?.key === column.id;
  const Icon = sort?.dir === "asc" ? ArrowUp : ArrowDown;

  if (!sortable) {
    return (
      <TableHead
        className={cn(
          HEAD,
          HEAD_TEXT,
          column.align === "right" && "text-right",
          column.className,
        )}
      >
        {column.label}
      </TableHead>
    );
  }

  return (
    <TableHead
      className={cn(HEAD, column.align === "right" && "text-right", column.className)}
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(column.id)}
        aria-label={label(column.label)}
        className={cn(
          HEAD_TEXT,
          "inline-flex items-center gap-1 transition-colors hover:text-foreground",
          column.align === "right" && "flex-row-reverse",
          active && "text-primary",
        )}
      >
        {column.label}
        {active && <Icon className="size-3" strokeWidth={2.4} />}
      </button>
    </TableHead>
  );
}

/**
 * Two states, so a toggle rather than a menu. The label names the density that is
 * **on**, which is what the design draws; the accessible name says what pressing
 * it does, because a button labelled with its current state is otherwise ambiguous.
 */
function DensityToggle({
  density,
  onChange,
}: {
  density: TableDensity;
  onChange: (density: TableDensity) => void;
}) {
  const t = useTranslations("common.table");
  const next: TableDensity = density === "comfortable" ? "compact" : "comfortable";
  const name = (d: TableDensity) =>
    d === "comfortable" ? t("densityComfortable") : t("densityCompact");

  return (
    <ToolbarButton
      onClick={() => onChange(next)}
      aria-label={`${t("density")}: ${name(density)}. ${name(next)}`}
      // No filled state: unlike Filters and Columns this owns no panel and
      // narrows nothing — it is always "on" in the sense those two mean, so
      // filling it would make the signal meaningless on the other two.
      aria-pressed={undefined}
    >
      <Rows3 className="size-[15px]" />
      <span className="hidden sm:inline">{name(density)}</span>
    </ToolbarButton>
  );
}
