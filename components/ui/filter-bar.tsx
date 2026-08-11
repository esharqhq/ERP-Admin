"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FilterGroup } from "@/components/ui/filter-menu";

export interface FilterBarProps {
  groups: FilterGroup[];
  /** Map of group key → selected option value. An empty/absent value means "all". */
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  /** Clears every dimension at once. */
  onReset: () => void;
  /** Label for the "no filter" option in every group. */
  allLabel: string;
  clearLabel: string;
}

/**
 * Always-visible filter row — the alternative to `FilterMenu`, which hides the
 * same dimensions behind a dropdown. Use this where the filters are part of how
 * the screen is read rather than an occasional refinement; the two share
 * `FilterGroup` and `useTableFilters`, so a screen can swap between them.
 *
 * A group with no options renders nothing. That is not defensive padding: the
 * option lists are derived from the rows actually present, so an empty list
 * means a control that could only ever say "all" — and a dead select reads as a
 * broken one.
 */
export function FilterBar({
  groups,
  values,
  onChange,
  onReset,
  allLabel,
  clearLabel,
}: FilterBarProps) {
  const usable = groups.filter((g) => g.options.length > 0);
  const activeCount = usable.reduce((n, g) => n + (values[g.key] ? 1 : 0), 0);

  if (usable.length === 0) return null;

  // A sentinel rather than `""` for the "all" option: several select
  // implementations treat an empty value as "nothing selected" and refuse it as
  // an item value. It is translated back to `""` on the way out, which is what
  // `useTableFilters` reads as "no filter".
  const ALL = "__all";

  return (
    <div className="flex flex-wrap items-end gap-2.5">
      {usable.map((group) => {
        // `items` lets <SelectValue> render the chosen option's LABEL in the
        // trigger; without it the trigger falls back to the raw value, which for
        // the owner dimension is a UUID.
        const items = [{ value: ALL, label: allLabel }, ...group.options];
        const active = Boolean(values[group.key]);
        return (
          <div key={group.key} className="flex min-w-[9.5rem] flex-1 flex-col gap-1 sm:max-w-[13rem]">
            <label className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
              {group.label}
            </label>
            <Select
              value={values[group.key] || ALL}
              onValueChange={(v) => onChange(group.key, v === ALL ? "" : ((v as string) ?? ""))}
              items={items}
            >
              <SelectTrigger
                size="sm"
                className={
                  active
                    ? "w-full border-primary/40 bg-primary/5 text-foreground"
                    : "w-full"
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
