"use client";

import { useState, type ReactNode } from "react";
import { Check, Info, Search, SlidersHorizontal, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { FilterGroup, FilterOption } from "@/components/ui/filter-menu";
// Re-exported so a screen building `fields` imports its option type from the same
// module as the field types, rather than reaching into the older menu component.
export type { FilterOption };
import { countRangeError, rangeError } from "@/lib/ui/filter-validation";
import { DateRangeControl, DayControl } from "@/components/ui/date-range-field";
import { cn } from "@/lib/utils";

/**
 * One filter dimension. `kind` defaults to `"select"`, which is what keeps the
 * older `groups` callers working untouched.
 *
 * A range names **both** of its wire params explicitly rather than deriving a
 * second key by suffixing one. The mapping from the values bag to a query stays
 * 1:1 and greppable, which matters because these key names are the API's.
 */
/**
 * Which titled group of the band a control sits in. A plain string rather than a
 * union so a screen can name its own groups; the band matches it against the
 * `sections` it was given and puts anything unmatched above them, ungrouped.
 */
export type FilterSectionId = string;

/** One titled group of the band. Order here is the order on screen. */
export interface FilterSection {
  id: FilterSectionId;
  title: string;
  /** A short count or caveat beside the title — “5 filters · all three-state”. */
  note?: string;
  icon?: ReactNode;
}

export interface SelectField {
  kind?: "select";
  section?: FilterSectionId;
  key: string;
  label: string;
  options: FilterOption[];
  hint?: string;
}

/**
 * Several values on one wire param, comma-joined — `?stage=Review,Approved`.
 *
 * Rendered as a row of toggle chips **inline**, never behind a popover. The
 * design puts these inside the filter band, which is already an opened region, so
 * a second layer would be a click that buys nothing; and a dropdown menu is the
 * wrong container for the searchable variant for the same reason the drawer note
 * below gives — menu typeahead fights with typing into a box.
 */
export interface MultiSelectField {
  kind: "multiSelect";
  section?: FilterSectionId;
  key: string;
  label: string;
  options: FilterOption[];
  /** A filter box above the list. Worth it past roughly eight options. */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Shown to the right of each chip — how many rows carry that value. */
  counts?: Record<string, number>;
  hint?: string;
}

export interface DateRangeField {
  kind: "dateRange";
  section?: FilterSectionId;
  fromKey: string;
  toKey: string;
  label: string;
  hint?: string;
  /**
   * Computed by the **caller**, never derived here. The owners page passes
   * `values.neverOrdered === "true"`, because combining that with a date
   * bound is a `400`. Keeping the rule at the call site is what stops this
   * shared component from collecting per-screen conditionals.
   */
  disabled?: boolean;
}

export interface NumberRangeField {
  kind: "numberRange";
  section?: FilterSectionId;
  minKey: string;
  maxKey: string;
  label: string;
  hint?: string;
  disabled?: boolean;
}

/**
 * Several switches under **one** heading, in one grid cell.
 *
 * A switch is **two** states where `triState` has three, and the difference is
 * the question being asked. `triState` exists for a dimension whose `false` is a
 * real query — *"owners who HAVE ordered"* — and where sending it is not the same
 * as omitting the param. A switch is for a **defect** filter: *"only the ones
 * with no photos"*. Its `false` would mean "only the ones with photos", which
 * nobody has asked for and which a switch cannot express anyway. Off writes an
 * **empty** value, never `"false"`, so the param leaves the URL rather than
 * encoding a narrowing nobody chose.
 *
 * Three `boolean` fields each took a cell of their own, which spread them across
 * the band with a column heading over each — a lot of width and three headings for
 * what the design draws as one short list ("BOOLEANS", label left, switch right).
 *
 * It counts as **one dimension** in the `Filters · n` badge, the same way a range
 * owning two params counts as one: the badge answers "how many things are
 * narrowing this list", and a group of switches is one thing an admin reasons
 * about.
 */
export interface BooleanGroupField {
  kind: "booleanGroup";
  section?: FilterSectionId;
  /** The heading over the list. */
  label: string;
  hint?: string;
  items: { key: string; label: string }[];
}

export interface TriStateField {
  kind: "triState";
  section?: FilterSectionId;
  key: string;
  label: string;
  anyLabel: string;
  trueLabel: string;
  falseLabel: string;
  hint?: string;
}

/**
 * **One** date on **one** wire param — not a range with a suppressed second bound.
 *
 * The workers table's `availableOn` is the shape this exists for: the API takes a
 * single `YYYY-MM-DD` and answers *“who said they can work that day”*. A
 * `dateRange` pointed at the same key twice would render two boxes for a
 * parameter that accepts one value, and the second box could only ever overwrite
 * the first.
 */
export interface DateField {
  kind: "date";
  section?: FilterSectionId;
  key: string;
  label: string;
  hint?: string;
  disabled?: boolean;
  /** Shown while nothing is picked. Defaults to the shared “pick a date”. */
  placeholder?: string;
}

export type FilterField =
  | SelectField
  | MultiSelectField
  | DateField
  | DateRangeField
  | NumberRangeField
  | BooleanGroupField
  | TriStateField;

/** How a `multiSelect` value is carried on the wire, and read back off it. */
export function parseMulti(value: string | undefined): string[] {
  return (value ?? "").split(",").filter(Boolean);
}

export function serializeMulti(values: string[]): string {
  return values.join(",");
}

export interface FilterBarProps {
  /** Legacy select-only shape, still used by four screens. */
  groups?: FilterGroup[];
  /** The four-kind shape. Pass this **or** `groups`, not both. */
  fields?: FilterField[];
  /** Map of wire-param key → value. An empty/absent value means "all". */
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  /**
   * Several keys in **one** write. Required by any caller whose values live
   * somewhere that does not merge concurrent writes — a URL, above all.
   *
   * A range owns two params and two of its controls move both at once: a date
   * preset sets both bounds, and clearing a range chip clears both. With a
   * `useState` bag two sequential `onChange` calls merge and nothing is lost; with
   * `useTableUrlState` each call merges into the query captured at render, so the
   * second discards the first and one bound silently survives. Pass
   * `state.setFilters` and neither can happen.
   */
  onChangeMany?: (patch: Record<string, string>) => void;
  /** Clears every dimension at once. */
  onReset: () => void;
  /** Label for the "no filter" option in every select. */
  allLabel: string;
  clearLabel: string;
  /** Shown under a range whose bounds are reversed. */
  orderErrorLabel?: string;
  /** Shown under a count range with a negative bound. */
  negativeErrorLabel?: string;
  /**
   * Move the controls into a drawer behind a trigger, leaving a chip per active
   * filter in the row. Use it past roughly four dimensions: beyond that an
   * always-visible row costs more attention than it saves, and on this app's
   * widest table it simply ran off the screen.
   *
   * A **drawer** rather than a dropdown menu on purpose — menus implement
   * typeahead and arrow-key navigation, which fight with typing into a date or
   * number input.
   */
  collapsible?: boolean;
  /**
   * How the controls are presented. Supersedes `collapsible`, which maps to
   * `"drawer"` and stays for the one caller still passing it.
   *
   * - `"row"` — always visible, one grid.
   * - `"drawer"` — behind a `Sheet` trigger this component renders.
   * - `"band"` — an inline region **inside the table card**, which is what the
   *   documents queues use: the design is explicit that it is *"a band inside the
   *   card — not a modal, not a drawer. The table stays visible while you
   *   filter."* The trigger belongs on the toolbar row, so the **caller** renders
   *   it and drives `open`; this component renders the region or nothing.
   */
  variant?: "row" | "drawer" | "band";
  /** Band mode only. */
  open?: boolean;
  /** Drawer heading. Defaults to the shared `common.filter` translation. */
  triggerLabel?: string;
  /**
   * Band mode only — a line under the controls explaining how they behave. The
   * queues use it to say that filters apply live, so nobody hunts for an Apply
   * button that does not exist.
   */
  note?: string;
  /**
   * Band mode only — draw the fields under **titled groups**, in this order.
   *
   * Twenty controls in one flat grid is a wall an admin has to read end to end to
   * find the one they came for; §03 of the workers design draws five titled groups
   * with a count beside each, and the grouping is the whole reason a 22-filter band
   * is usable at all. Below that count the flat grid is better — headings over
   * three controls are furniture — so this is opt-in and every existing caller is
   * untouched by it.
   *
   * A field whose `section` matches none of these, or which declares none, renders
   * **above** the groups, ungrouped. That is deliberate: an unclassified control
   * must never become invisible because a section id was mistyped.
   */
  sections?: FilterSection[];
}

/**
 * A type guard rather than an inline `(f.kind ?? "select") === "select"`: the
 * nullish default defeats TypeScript's narrowing of the union, so without this
 * the `options` access below is an error.
 */
function isSelect(field: FilterField): field is SelectField {
  return (field.kind ?? "select") === "select";
}

/** The two kinds that carry an option list, and so can be empty enough to hide. */
function hasOptions(field: FilterField): field is SelectField | MultiSelectField {
  return isSelect(field) || field.kind === "multiSelect";
}

/** Every wire key a field owns — one for a select, two for a range. */
function keysOf(field: FilterField): string[] {
  if (field.kind === "dateRange") return [field.fromKey, field.toKey];
  if (field.kind === "numberRange") return [field.minKey, field.maxKey];
  if (field.kind === "booleanGroup") return field.items.map((i) => i.key);
  return [field.key];
}

/**
 * Active **dimensions**, which is what a "Filters · 3" badge means. Not the number
 * of set params: a date range owns two and is one filter.
 *
 * Exported because the table shell badges the trigger while the fields and values
 * live in the caller — `useTableUrlState` deliberately does not offer this, since
 * it knows wire params and not which of them belong together.
 */
export function countActiveFields(
  fields: FilterField[],
  values: Record<string, string>,
): number {
  return fields.filter((f) => keysOf(f).some((k) => values[k])).length;
}

/**
 * A sentinel rather than `""` for the "all" option: several select
 * implementations treat an empty value as "nothing selected" and refuse it as an
 * item value. It is translated back to `""` on the way out, which is what the
 * query mappers read as "no filter".
 */
const ALL = "__all";

/**
 * The two halves of a chip — which dimension, and what it is set to — or `null`
 * when the field is not active.
 *
 * Two halves rather than one sentence because the band chip prints them in
 * different colours: the design greys the dimension name and leaves the value in
 * ink, so an eye scanning the strip lands on the values. The plain chip still
 * joins them with a colon, unchanged.
 */
export function describeField(
  field: FilterField,
  values: Record<string, string>,
): { label: string; value: string } | null {
  const v = (k: string) => values[k] ?? "";
  if (isSelect(field)) {
    if (!v(field.key)) return null;
    // The option's LABEL, never its value — for a city or owner that is a UUID.
    const opt = field.options.find((o) => o.value === v(field.key));
    return { label: field.label, value: opt?.label ?? v(field.key) };
  }
  if (field.kind === "multiSelect") {
    const picked = parseMulti(v(field.key));
    if (picked.length === 0) return null;
    const label = (value: string) =>
      field.options.find((o) => o.value === value)?.label ?? value;
    // The first choice by name and the rest as a count. Three labels joined by
    // commas overruns the chip and truncates mid-word, which reads as a bug.
    return {
      label: field.label,
      value:
        picked.length === 1
          ? label(picked[0])
          : `${label(picked[0])} +${picked.length - 1}`,
    };
  }
  if (field.kind === "booleanGroup") {
    const on = field.items.filter((i) => v(i.key) === "true");
    if (on.length === 0) return null;
    // The first by name and the rest as a count — the same shape a multi-select
    // chip uses, so three switched on does not overrun the chip and truncate
    // mid-word. Clicking the chip clears every switch in the group, which is what
    // a range chip does with its two bounds.
    return {
      label: field.label,
      value: on.length === 1 ? on[0].label : `${on[0].label} +${on.length - 1}`,
    };
  }
  if (field.kind === "date") {
    if (!v(field.key)) return null;
    // The wire's own `YYYY-MM-DD`, unformatted: it is what the URL carries and
    // what the admin picked, and a localised re-rendering here would disagree
    // with the box above.
    return { label: field.label, value: v(field.key) };
  }
  if (field.kind === "triState") {
    if (!v(field.key)) return null;
    return {
      label: field.label,
      value: v(field.key) === "true" ? field.trueLabel : field.falseLabel,
    };
  }
  const [a, b] =
    field.kind === "dateRange"
      ? [v(field.fromKey), v(field.toKey)]
      : [v(field.minKey), v(field.maxKey)];
  if (!a && !b) return null;
  // An open bound reads as "3 or more" / "up to 9" rather than a dangling dash.
  if (a && !b) return { label: field.label, value: `≥ ${a}` };
  if (!a && b) return { label: field.label, value: `≤ ${b}` };
  return { label: field.label, value: `${a} – ${b}` };
}

/** Label + optional hint. The hint is a tooltip so it costs no vertical space. */
function FieldLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="flex items-center gap-1">
      {/* Wider tracking because it is all-caps at 11px, where default spacing
          closes the letters up and hurts legibility. */}
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </span>
      {hint && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  aria-label={hint}
                  className="text-muted-foreground/70 transition-colors hover:text-foreground"
                />
              }
            >
              <Info className="size-3" />
            </TooltipTrigger>
            <TooltipContent className="max-w-56">{hint}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

/**
 * Two inputs inside **one** border, so proximity says "one range". Two separately
 * bordered boxes with a dash between them read as two unrelated filters, which is
 * what this replaced.
 */
function RangeShell({
  disabled,
  children,
}: {
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex h-9 items-center rounded-md border border-input bg-background shadow-xs transition-[color,box-shadow]",
        "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
        disabled && "opacity-50",
      )}
    >
      {children}
    </div>
  );
}

/**
 * Mono, matching the date bounds beside it: §08 · Table puts numbers, times and
 * IDs in Geist Mono so a column of digits stacks, and a filter band that prints
 * its bounds in the body face beside a mono date reads as two systems.
 */
/**
 * `lg:` column counts by dimension count. 1 and 2 are absent because
 * `sm:grid-cols-2` already covers them.
 */
const COLS: Record<number, string> = {
  // 1 and 2 are deliberately absent: the base `sm:grid-cols-2` is already right
  // for them, and naming `lg:grid-cols-1` here would stretch a lone control the
  // full width of the band, which is the one width a filter never wants.
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
  6: "lg:grid-cols-6",
};

const BARE_INPUT =
  "h-full min-w-0 flex-1 border-0 bg-transparent px-2.5 font-mono text-xs shadow-none focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent";

/**
 * Toggle chips for a `multiSelect`, with an optional filter box above them.
 *
 * Its own component because the search term is local state, and a hook cannot
 * live inside the `control()` switch below.
 *
 * The box narrows **which chips are offered**, never which are selected: a value
 * chosen and then typed out of view stays on, and its chip in the row above still
 * says so. Hiding a live filter behind a search term would be a filter an admin
 * cannot find to remove.
 */
function MultiSelectChips({
  field,
  value,
  onChange,
}: {
  field: MultiSelectField;
  value: string;
  onChange: (next: string) => void;
}) {
  const t = useTranslations("common");
  const [term, setTerm] = useState("");
  const picked = parseMulti(value);

  const needle = term.trim().toLowerCase();
  const shown = needle
    ? field.options.filter((o) => o.label.toLowerCase().includes(needle))
    : field.options;

  const toggle = (option: string) =>
    onChange(
      serializeMulti(
        picked.includes(option)
          ? picked.filter((p) => p !== option)
          : [...picked, option],
      ),
    );

  return (
    <div className="flex flex-col gap-2">
      {field.searchable && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={field.searchPlaceholder ?? `${t("search")}…`}
            aria-label={field.searchPlaceholder ?? field.label}
            className="h-8 pl-8 text-xs"
          />
        </div>
      )}

      {/*
        Two renders, because the design draws two. A short set is a row of toggle
        chips ("STATUS — MULTI-SELECT"); a **searchable** one is a bordered
        checkbox list with its counts right-aligned ("CITY & DISTRICT —
        SEARCHABLE"). Chips are unreadable past a dozen options and a list of four
        wastes the box, so the `searchable` flag picks the shape as well as the
        search box.
      */}
      {field.searchable ? (
        <div className="overflow-hidden rounded-lg bg-card ring-1 ring-inset ring-border">
          {/* Shorter than it was: with a column per dimension the band is one
              row, and the list is the tallest thing in it. Four rows is enough to
              show that it scrolls. */}
          <div className="scrollbar-slim max-h-[132px] overflow-y-auto">
            {shown.map((option) => {
              const on = picked.includes(option.value);
              const count = field.counts?.[option.value];
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(option.value)}
                  className="flex w-full items-center gap-2.5 px-2.5 py-[7px] text-left text-[13px] outline-none transition-colors hover:bg-accent/50 focus-visible:bg-accent/50"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-[15px] flex-none items-center justify-center rounded-[4px] transition-colors",
                      on
                        ? "bg-primary text-primary-foreground"
                        : "ring-[1.5px] ring-inset ring-border",
                    )}
                  >
                    {on && <Check className="size-2.5" />}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {count != null && (
                    <span className="flex-none font-mono text-[11px] tabular-nums text-muted-foreground">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
            {shown.length === 0 && (
              <p className="px-2.5 py-2 text-xs text-muted-foreground">
                {t("noMatches")}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {shown.map((option) => {
            const on = picked.includes(option.value);
            const count = field.counts?.[option.value];
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(option.value)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors",
                  on
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background text-foreground hover:border-primary/40 hover:bg-primary/5",
                )}
              >
                {on && <Check className="size-3 shrink-0" />}
                <span className="truncate">{option.label}</span>
                {count != null && (
                  <span
                    className={cn(
                      "tabular-nums",
                      on ? "text-primary-foreground/70" : "text-muted-foreground",
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}

          {shown.length === 0 && (
            <p className="py-1 text-xs text-muted-foreground">{t("noMatches")}</p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Always-visible filter row, or a drawer once there are enough dimensions that a
 * row stops being readable — the alternative to `FilterMenu`, which hides the same
 * select-only dimensions behind a dropdown.
 *
 * State lives in the caller and this stays pure presentation, which is what lets
 * one component serve both worlds: server-filtered tables (owners, workers) whose
 * options come from a lookup, and client-filtered ones (properties, tasks) whose
 * options are derived from the rows on screen.
 *
 * A **select** with no options renders nothing. That is not defensive padding: on
 * a client-side screen an empty list means a control that could only ever say
 * "all", and a dead select reads as a broken one. Ranges and tri-states have no
 * option list and are always usable.
 */
export function FilterBar({
  groups,
  fields,
  values,
  onChange,
  onChangeMany,
  onReset,
  allLabel,
  clearLabel,
  orderErrorLabel,
  negativeErrorLabel,
  collapsible,
  variant,
  open,
  triggerLabel,
  note,
  sections,
}: FilterBarProps) {
  const t = useTranslations("common");
  const mode = variant ?? (collapsible ? "drawer" : "row");

  /**
   * Falls back to one `onChange` per key. That is correct for a caller holding
   * its values in `useState` — successive updates merge — and lossy for one
   * backed by the URL, which is why `onChangeMany` exists and the table shell
   * always passes it.
   */
  const writeMany =
    onChangeMany ??
    ((patch: Record<string, string>) => {
      for (const [key, value] of Object.entries(patch)) onChange(key, value);
    });

  const normalized: FilterField[] =
    fields ?? (groups ?? []).map((g) => ({ kind: "select" as const, ...g }));

  const usable = normalized.filter((f) => !hasOptions(f) || f.options.length > 0);

  // Counts dimensions, not inputs: a range with either bound set is one active
  // filter, not two.
  const active = usable.filter((f) => keysOf(f).some((k) => values[k]));

  if (usable.length === 0) return null;

  const control = (field: FilterField) => (
    <>
      {isSelect(field) && (() => {
        // `items` lets <SelectValue> render the chosen option's LABEL in the
        // trigger; without it the trigger falls back to the raw value, which for
        // a city or owner dimension is a UUID.
        const items = [{ value: ALL, label: allLabel }, ...field.options];
        const on = Boolean(values[field.key]);
        return (
          <Select
            value={values[field.key] || ALL}
            onValueChange={(v) => onChange(field.key, v === ALL ? "" : ((v as string) ?? ""))}
            items={items}
          >
            <SelectTrigger
              className={cn("w-full", on && "border-primary/40 bg-primary/5 text-foreground")}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {items.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      })()}

      {field.kind === "multiSelect" && (
        <MultiSelectChips
          field={field}
          value={values[field.key] ?? ""}
          onChange={(next) => onChange(field.key, next)}
        />
      )}

      {field.kind === "date" && (
        <DayControl
          label={field.label}
          disabled={field.disabled}
          placeholder={field.placeholder}
          value={values[field.key] ?? ""}
          onChange={(day) => onChange(field.key, day)}
        />
      )}

      {field.kind === "dateRange" && (
        <DateRangeControl
          label={field.label}
          disabled={field.disabled}
          value={{
            from: values[field.fromKey] ?? "",
            to: values[field.toKey] ?? "",
          }}
          // One write, both bounds — a preset moves both, and a URL-backed caller
          // would lose one of two sequential writes. See `onChangeMany`.
          onChange={(next) =>
            writeMany({ [field.fromKey]: next.from, [field.toKey]: next.to })
          }
        />
      )}

      {field.kind === "numberRange" && (
        <RangeShell disabled={field.disabled}>
          <Input
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            placeholder={t("min")}
            aria-label={`${field.label} — min`}
            value={values[field.minKey] ?? ""}
            disabled={field.disabled}
            onChange={(e) => onChange(field.minKey, e.target.value)}
            className={BARE_INPUT}
          />
          <span aria-hidden className="text-muted-foreground/60">
            –
          </span>
          <Input
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            placeholder={t("max")}
            aria-label={`${field.label} — max`}
            value={values[field.maxKey] ?? ""}
            disabled={field.disabled}
            onChange={(e) => onChange(field.maxKey, e.target.value)}
            className={BARE_INPUT}
          />
        </RangeShell>
      )}

      {field.kind === "booleanGroup" && (
        <div className="flex flex-col gap-1.5">
          {field.items.map((item) => {
            const on = values[item.key] === "true";
            return (
              <label
                key={item.key}
                className="flex cursor-pointer items-center justify-between gap-3"
              >
                <span className="min-w-0 text-[13px] leading-snug">{item.label}</span>
                <Switch
                  checked={on}
                  // Off clears the param rather than writing `"false"`.
                  onCheckedChange={(next) => onChange(item.key, next ? "true" : "")}
                />
              </label>
            );
          })}
        </div>
      )}

      {/* A three-option select, deliberately not a checkbox: a checkbox cannot
          express the difference between omitting the param and sending `false`,
          and sending `false` hides every subject that has never ordered — usually
          the exact group being hunted for. */}
      {field.kind === "triState" && (() => {
        const items = [
          { value: ALL, label: field.anyLabel },
          { value: "true", label: field.trueLabel },
          { value: "false", label: field.falseLabel },
        ];
        const on = Boolean(values[field.key]);
        return (
          <Select
            value={values[field.key] || ALL}
            onValueChange={(v) => onChange(field.key, v === ALL ? "" : (v as string))}
            items={items}
          >
            <SelectTrigger
              className={cn("w-full", on && "border-primary/40 bg-primary/5 text-foreground")}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {items.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      })()}
    </>
  );

  const error = (field: FilterField) => {
    if (field.kind === "dateRange") {
      return rangeError(values[field.fromKey] ?? "", values[field.toKey] ?? "")
        ? orderErrorLabel
        : null;
    }
    if (field.kind === "numberRange") {
      const err = countRangeError(values[field.minKey] ?? "", values[field.maxKey] ?? "");
      if (!err) return null;
      return err === "negative" ? negativeErrorLabel : orderErrorLabel;
    }
    return null;
  };

  /**
   * A grid, not a flex row of `flex-1` columns. Each cell owns one label, one
   * control and one error slot, so every label sits on the same grid line — an
   * `items-end` row let a field with a hint under it drag its whole column out of
   * alignment.
   *
   * **One column per dimension, so the band is one row.** Not `auto-fit`, which
   * decides the count from a min-width and so wraps at a width nobody chose; and
   * not a fixed four, which put a table's fifth dimension on a second row of its
   * own. Capped at six: past that the cells are too narrow for a date range to
   * hold two bounds, and a seventh dimension genuinely does belong on a second
   * row.
   *
   * The count is a static class from a lookup rather than an interpolated
   * `grid-cols-${n}` — Tailwind scans source text, so an interpolated class is
   * never generated.
   */
  const gridOf = (fields: FilterField[], maxCols: number) => (
    <div
      className={cn(
        "grid gap-x-4 gap-y-4",
        mode === "drawer"
          ? "grid-cols-1 sm:grid-cols-2"
          : cn("grid-cols-1 sm:grid-cols-2", COLS[Math.min(fields.length, maxCols)]),
      )}
    >
      {fields.map((field) => {
        const err = error(field);
        return (
          <div key={keysOf(field).join(":")} className="flex flex-col gap-1.5">
            <FieldLabel label={field.label} hint={field.hint} />
            {control(field)}
            {err && <p className="text-[11px] leading-snug text-destructive">{err}</p>}
          </div>
        );
      })}
    </div>
  );

  const grid = gridOf(usable, 6);

  /**
   * The same controls, under §03's five headings.
   *
   * **Four columns per group, not six.** A group holds three to five controls, and
   * six slots would leave one or two orphans stretched across a row — four keeps a
   * group either one tight row or two balanced ones, and it is the width at which a
   * date range still fits both of its bounds.
   *
   * Sections with nothing usable in them are dropped rather than drawn empty: a
   * select with no options already renders nothing (see `usable`), so a group whose
   * every control is an unpopulated lookup would otherwise be a heading over a gap.
   */
  const sectioned = (() => {
    if (!sections || sections.length === 0) return null;
    const seen = new Set<string>();
    const groups = sections
      .map((section) => {
        const fields = usable.filter((f) => f.section === section.id);
        for (const f of fields) seen.add(keysOf(f).join(":"));
        return { section, fields };
      })
      .filter((g) => g.fields.length > 0);

    // Anything the sections did not claim. Above the groups, so a mistyped id
    // costs an admin a heading, never the control itself.
    const loose = usable.filter((f) => !seen.has(keysOf(f).join(":")));

    return (
      <div className="flex flex-col gap-5">
        {loose.length > 0 && gridOf(loose, 4)}
        {groups.map(({ section, fields }) => (
          <section key={section.id} className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              {section.icon && (
                <span className="flex size-[22px] flex-none items-center justify-center rounded-[7px] bg-accent text-primary">
                  {section.icon}
                </span>
              )}
              <h3 className="text-xs font-bold tracking-[-0.01em]">{section.title}</h3>
              {section.note && (
                <span className="text-[11.5px] text-muted-foreground">
                  {section.note}
                </span>
              )}
              {/* The rule runs to the end of the row, which is what separates one
                  group from the next without a box around either. */}
              <div className="h-px flex-1 bg-border" />
            </div>
            {gridOf(fields, 4)}
          </section>
        ))}
      </div>
    );
  })();

  /**
   * The band renders nothing when closed rather than staying mounted and hidden:
   * the searchable multi-selects each hold a local search term, and dropping them
   * means reopening the panel offers the whole list again instead of whatever was
   * typed last time.
   */
  if (mode === "band") {
    if (!open) return null;
    return (
      /* Bottom line only. The toolbar row above already ends in one, so a
         `border-y` here would stack two hairlines into a visibly thicker rule
         exactly where the design draws a single one. */
      <div className="flex flex-col gap-3.5 border-b border-border bg-muted/30 px-4 py-4 sm:px-5">
        {sectioned ?? grid}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
          {note ? (
            <p className="max-w-2xl text-xs leading-snug text-muted-foreground text-pretty">
              {note}
            </p>
          ) : (
            <span />
          )}
          {active.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
              {clearLabel}
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (mode === "row") {
    return (
      <div className="flex flex-col gap-3">
        {grid}
        {active.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="w-fit gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
            {clearLabel}
          </Button>
        )}
      </div>
    );
  }

  const heading = triggerLabel ?? t("filter");

  // A fragment, not a wrapper: this goes into a toolbar row beside search, and an
  // extra flex container there would fight the parent's own layout. The chips live
  // in `FilterChips` below for the same reason.
  return (
    <>
      <Sheet>
        <SheetTrigger render={<Button variant="outline" size="sm" className="gap-2" />}>
          <SlidersHorizontal className="size-4" />
          {heading}
          {active.length > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground tabular-nums">
              {active.length}
            </span>
          )}
        </SheetTrigger>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{heading}</SheetTitle>
            <SheetDescription>
              {t("filtersActive", { count: active.length })}
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">{grid}</div>
        </SheetContent>
      </Sheet>
    </>
  );
}

/**
 * One chip per active filter — the price of collapsing the controls into a drawer,
 * and what stops "filters are on" from being invisible.
 *
 * Deliberately a **separate export** from `FilterBar`: the trigger belongs on the
 * toolbar row beside search, and chips belong on their own line, so the two cannot
 * be one node. Rendering nothing when no filter is set lets a caller pass
 * `undefined` and keep the toolbar a single row.
 */
export function FilterChips({
  groups,
  fields,
  values,
  onChange,
  onChangeMany,
  onReset,
  clearLabel,
}: Pick<
  FilterBarProps,
  | "groups"
  | "fields"
  | "values"
  | "onChange"
  | "onChangeMany"
  | "onReset"
  | "clearLabel"
>) {
  const normalized: FilterField[] =
    fields ?? (groups ?? []).map((g) => ({ kind: "select" as const, ...g }));
  const active = normalized.filter((f) => keysOf(f).some((k) => values[k]));

  if (active.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {active.map((field) => {
        // `describeField` returns the two halves the band chip colours
        // separately. The plain chip joins them, which is what `summarize` did
        // before it was split — the call site was not moved with it, so this
        // component threw a ReferenceError the moment any filter was set.
        const described = describeField(field, values);
        if (!described) return null;
        const text = `${described.label}: ${described.value}`;
        return (
          <button
            key={keysOf(field).join(":")}
            type="button"
            // Clears every key the dimension owns in ONE write, so a range goes
            // in one click. Two sequential writes would leave a URL-backed caller
            // holding one of the two bounds — see `onChangeMany`.
            onClick={() => {
              const cleared = Object.fromEntries(keysOf(field).map((k) => [k, ""]));
              if (onChangeMany) onChangeMany(cleared);
              else for (const k of keysOf(field)) onChange(k, "");
            }}
            className="group inline-flex max-w-[18rem] items-center gap-1.5 rounded-full border border-border bg-muted/50 py-1 pl-2.5 pr-2 text-xs text-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/5"
          >
            <span className="truncate">{text}</span>
            <X className="size-3 shrink-0 text-muted-foreground transition-colors group-hover:text-destructive" />
          </button>
        );
      })}

      {active.length > 1 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" />
          {clearLabel}
        </Button>
      )}
    </div>
  );
}
