"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FilterGroup, FilterOption } from "@/components/ui/filter-menu";
import { countRangeError, rangeError } from "@/lib/ui/filter-validation";

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
 * Always-visible filter row — the alternative to `FilterMenu`, which hides the
 * same dimensions behind a dropdown. Use this where the filters are part of how
 * the screen is read rather than an occasional refinement.
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
}: FilterBarProps) {
  const normalized: FilterField[] =
    fields ?? (groups ?? []).map((g) => ({ kind: "select" as const, ...g }));

  const usable = normalized.filter((f) => !isSelect(f) || f.options.length > 0);

  // Counts dimensions, not inputs: a range with either bound set is one active
  // filter, not two.
  const activeCount = usable.filter((f) => keysOf(f).some((k) => values[k])).length;

  if (usable.length === 0) return null;

  // A sentinel rather than `""` for the "all" option: several select
  // implementations treat an empty value as "nothing selected" and refuse it as
  // an item value. It is translated back to `""` on the way out, which is what
  // the query mappers read as "no filter".
  const ALL = "__all";

  return (
    <div className="flex flex-wrap items-end gap-2.5">
      {usable.map((field) => {
        const wide = field.kind === "dateRange" || field.kind === "numberRange";
        return (
          <div
            key={keysOf(field).join(":")}
            className={
              wide
                ? "flex min-w-[13rem] flex-1 flex-col gap-1 sm:max-w-[17rem]"
                : "flex min-w-[9.5rem] flex-1 flex-col gap-1 sm:max-w-[13rem]"
            }
          >
            <label className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
              {field.label}
            </label>

            {isSelect(field) && (() => {
              const f = field;
              // `items` lets <SelectValue> render the chosen option's LABEL in the
              // trigger; without it the trigger falls back to the raw value, which
              // for a city or owner dimension is a UUID.
              const items = [{ value: ALL, label: allLabel }, ...f.options];
              const active = Boolean(values[f.key]);
              return (
                <Select
                  value={values[f.key] || ALL}
                  onValueChange={(v) => onChange(f.key, v === ALL ? "" : ((v as string) ?? ""))}
                  items={items}
                >
                  <SelectTrigger
                    size="sm"
                    className={
                      active ? "w-full border-primary/40 bg-primary/5 text-foreground" : "w-full"
                    }
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
              <div className="flex items-center gap-1.5">
                <Input
                  type="date"
                  aria-label={`${field.label} — from`}
                  value={values[field.fromKey] ?? ""}
                  max={values[field.toKey] || undefined}
                  disabled={field.disabled}
                  onChange={(e) => onChange(field.fromKey, e.target.value)}
                  className="h-8 text-xs"
                />
                <span className="text-xs text-muted-foreground">–</span>
                <Input
                  type="date"
                  aria-label={`${field.label} — to`}
                  value={values[field.toKey] ?? ""}
                  min={values[field.fromKey] || undefined}
                  disabled={field.disabled}
                  onChange={(e) => onChange(field.toKey, e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            )}

            {field.kind === "numberRange" && (
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  aria-label={`${field.label} — min`}
                  value={values[field.minKey] ?? ""}
                  disabled={field.disabled}
                  onChange={(e) => onChange(field.minKey, e.target.value)}
                  className="h-8 text-xs"
                />
                <span className="text-xs text-muted-foreground">–</span>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  aria-label={`${field.label} — max`}
                  value={values[field.maxKey] ?? ""}
                  disabled={field.disabled}
                  onChange={(e) => onChange(field.maxKey, e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            )}

            {/* A three-option select, deliberately not a checkbox: a checkbox
                cannot express the difference between omitting the param and
                sending `false`, and sending `false` hides every subject that has
                never ordered — usually the exact group being hunted for. */}
            {field.kind === "triState" && (() => {
              const items = [
                { value: ALL, label: field.anyLabel },
                { value: "true", label: field.trueLabel },
                { value: "false", label: field.falseLabel },
              ];
              const active = Boolean(values[field.key]);
              return (
                <Select
                  value={values[field.key] || ALL}
                  onValueChange={(v) => onChange(field.key, v === ALL ? "" : (v as string))}
                  items={items}
                >
                  <SelectTrigger
                    size="sm"
                    className={
                      active ? "w-full border-primary/40 bg-primary/5 text-foreground" : "w-full"
                    }
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

            {field.kind === "dateRange" &&
              rangeError(values[field.fromKey] ?? "", values[field.toKey] ?? "") && (
                <p className="text-[11px] text-destructive">{orderErrorLabel}</p>
              )}

            {field.kind === "numberRange" && (() => {
              const err = countRangeError(
                values[field.minKey] ?? "",
                values[field.maxKey] ?? "",
              );
              if (!err) return null;
              return (
                <p className="text-[11px] text-destructive">
                  {err === "negative" ? negativeErrorLabel : orderErrorLabel}
                </p>
              );
            })()}

            {field.hint && (
              <p className="text-[11px] text-muted-foreground">{field.hint}</p>
            )}
          </div>
        );
      })}

      {activeCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" />
          {clearLabel}
          <span className="flex size-4 items-center justify-center rounded-full bg-muted text-[10px] font-semibold tabular-nums">
            {activeCount}
          </span>
        </Button>
      )}
    </div>
  );
}
