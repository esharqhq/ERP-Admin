"use client";

import { Info, SlidersHorizontal, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { countRangeError, rangeError } from "@/lib/ui/filter-validation";
import { cn } from "@/lib/utils";

/**
 * One filter dimension. `kind` defaults to `"select"`, which is what keeps the
 * older `groups` callers working untouched.
 *
 * A range names **both** of its wire params explicitly rather than deriving a
 * second key by suffixing one. The mapping from the values bag to a query stays
 * 1:1 and greppable, which matters because these key names are the API's.
 */
export type FilterField =
  | { kind?: "select"; key: string; label: string; options: FilterOption[]; hint?: string }
  | {
      kind: "dateRange";
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
  | {
      kind: "numberRange";
      minKey: string;
      maxKey: string;
      label: string;
      hint?: string;
      disabled?: boolean;
    }
  | {
      kind: "triState";
      key: string;
      label: string;
      anyLabel: string;
      trueLabel: string;
      falseLabel: string;
      hint?: string;
    };

export interface FilterBarProps {
  /** Legacy select-only shape, still used by four screens. */
  groups?: FilterGroup[];
  /** The four-kind shape. Pass this **or** `groups`, not both. */
  fields?: FilterField[];
  /** Map of wire-param key → value. An empty/absent value means "all". */
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
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
  /** Drawer heading. Defaults to the shared `common.filter` translation. */
  triggerLabel?: string;
}

/**
 * A type guard rather than an inline `(f.kind ?? "select") === "select"`: the
 * nullish default defeats TypeScript's narrowing of the union, so without this
 * the `options` access below is an error.
 */
function isSelect(
  field: FilterField,
): field is Extract<FilterField, { options: FilterOption[] }> {
  return (field.kind ?? "select") === "select";
}

/** Every wire key a field owns — one for a select, two for a range. */
function keysOf(field: FilterField): string[] {
  if (field.kind === "dateRange") return [field.fromKey, field.toKey];
  if (field.kind === "numberRange") return [field.minKey, field.maxKey];
  return [field.key];
}

/**
 * A sentinel rather than `""` for the "all" option: several select
 * implementations treat an empty value as "nothing selected" and refuse it as an
 * item value. It is translated back to `""` on the way out, which is what the
 * query mappers read as "no filter".
 */
const ALL = "__all";

/** What the chip for an active field should read. `null` when it is not active. */
function summarize(field: FilterField, values: Record<string, string>): string | null {
  const v = (k: string) => values[k] ?? "";
  if (isSelect(field)) {
    if (!v(field.key)) return null;
    // The option's LABEL, never its value — for a city or owner that is a UUID.
    const opt = field.options.find((o) => o.value === v(field.key));
    return `${field.label}: ${opt?.label ?? v(field.key)}`;
  }
  if (field.kind === "triState") {
    if (!v(field.key)) return null;
    return `${field.label}: ${v(field.key) === "true" ? field.trueLabel : field.falseLabel}`;
  }
  const [a, b] =
    field.kind === "dateRange"
      ? [v(field.fromKey), v(field.toKey)]
      : [v(field.minKey), v(field.maxKey)];
  if (!a && !b) return null;
  // An open bound reads as "3 or more" / "up to 9" rather than a dangling dash.
  if (a && !b) return `${field.label}: ≥ ${a}`;
  if (!a && b) return `${field.label}: ≤ ${b}`;
  return `${field.label}: ${a} – ${b}`;
}

/** Label + optional hint. The hint is a tooltip so it costs no vertical space. */
function FieldLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="flex items-center gap-1">
      {/* Wider tracking because it is all-caps at 11px, where default spacing
          closes the letters up and hurts legibility. */}
      <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
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

const BARE_INPUT =
  "h-full min-w-0 flex-1 border-0 bg-transparent px-2.5 text-xs shadow-none focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent";

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
  onReset,
  allLabel,
  clearLabel,
  orderErrorLabel,
  negativeErrorLabel,
  collapsible,
  triggerLabel,
}: FilterBarProps) {
  const t = useTranslations("common");

  const normalized: FilterField[] =
    fields ?? (groups ?? []).map((g) => ({ kind: "select" as const, ...g }));

  const usable = normalized.filter((f) => !isSelect(f) || f.options.length > 0);

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

      {field.kind === "dateRange" && (
        <RangeShell disabled={field.disabled}>
          <Input
            type="date"
            aria-label={`${field.label} — from`}
            value={values[field.fromKey] ?? ""}
            max={values[field.toKey] || undefined}
            disabled={field.disabled}
            onChange={(e) => onChange(field.fromKey, e.target.value)}
            className={BARE_INPUT}
          />
          <span aria-hidden className="text-muted-foreground/60">
            –
          </span>
          <Input
            type="date"
            aria-label={`${field.label} — to`}
            value={values[field.toKey] ?? ""}
            min={values[field.fromKey] || undefined}
            disabled={field.disabled}
            onChange={(e) => onChange(field.toKey, e.target.value)}
            className={BARE_INPUT}
          />
        </RangeShell>
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
   * control and one error slot, so every label sits on the same grid line — the
   * previous `items-end` row let a field with a hint under it drag its whole
   * column out of alignment. `auto-fit` also wraps instead of overflowing, which
   * is what pushed the last control off-screen.
   */
  const grid = (
    <div
      className={cn(
        "grid gap-x-4 gap-y-3.5",
        collapsible
          ? "grid-cols-1 sm:grid-cols-2"
          : "grid-cols-[repeat(auto-fit,minmax(11rem,1fr))]",
      )}
    >
      {usable.map((field) => {
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

  if (!collapsible) {
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
  onReset,
  clearLabel,
}: Pick<
  FilterBarProps,
  "groups" | "fields" | "values" | "onChange" | "onReset" | "clearLabel"
>) {
  const normalized: FilterField[] =
    fields ?? (groups ?? []).map((g) => ({ kind: "select" as const, ...g }));
  const active = normalized.filter((f) => keysOf(f).some((k) => values[k]));

  if (active.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {active.map((field) => {
        const text = summarize(field, values);
        if (!text) return null;
        return (
          <button
            key={keysOf(field).join(":")}
            type="button"
            // Clears every key the dimension owns, so a range goes in one click
            // rather than needing both bounds emptied.
            onClick={() => keysOf(field).forEach((k) => onChange(k, ""))}
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
