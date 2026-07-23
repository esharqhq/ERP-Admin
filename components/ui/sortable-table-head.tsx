"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface SortableTableHeadProps {
  label: string;
  /** Whether this column is the active sort column. */
  active: boolean;
  /** Current sort direction (only meaningful when `active`). */
  direction: "asc" | "desc";
  onClick: () => void;
  className?: string;
}

export function SortableTableHead({
  label,
  active,
  direction,
  onClick,
  className,
}: SortableTableHeadProps) {
  const Icon = !active ? ChevronsUpDown : direction === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead
      className={cn(
        "text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground",
        className,
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 transition-colors hover:text-foreground",
          active && "text-foreground",
        )}
      >
        {label}
        <Icon className={cn("size-3.5", active ? "opacity-100" : "opacity-50")} />
      </button>
    </TableHead>
  );
}
