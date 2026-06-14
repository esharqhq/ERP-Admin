"use client";

import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useTranslations } from "next-intl";

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterGroup {
  /** Unique key identifying this filter dimension. */
  key: string;
  /** Heading shown above the group's options. */
  label: string;
  options: FilterOption[];
}

export interface FilterMenuProps {
  groups: FilterGroup[];
  /** Map of group key → selected option value. An empty/absent value means "all". */
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  /** Trigger button label; defaults to the shared `common.filter` translation. */
  label?: string;
  /** Label for the "no filter" option in every group. */
  allLabel: string;
}

/**
 * Reusable filter dropdown for list/table screens. Renders one single-select
 * radio group per `FilterGroup`, with an "all" reset option, and shows a badge
 * with the number of active (non-"all") filters. State lives in the caller —
 * pair it with `useTableFilters` for the matching filtering logic.
 */
export function FilterMenu({ groups, values, onChange, label, allLabel }: FilterMenuProps) {
  const t = useTranslations("common");
  const activeCount = groups.reduce((n, g) => n + (values[g.key] ? 1 : 0), 0);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="sm" className="gap-2" />}
      >
        <Filter className="size-4" />
        <span className="hidden sm:inline">{label ?? t("filter")}</span>
        {activeCount > 0 && (
          <span className="ml-0.5 flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground tabular-nums">
            {activeCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {groups.map((group, i) => (
          <div key={group.key}>
            {i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={values[group.key] ?? ""}
              onValueChange={(value) => onChange(group.key, value as string)}
            >
              <DropdownMenuRadioItem value="">{allLabel}</DropdownMenuRadioItem>
              {group.options.map((opt) => (
                <DropdownMenuRadioItem key={opt.value} value={opt.value}>
                  {opt.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
