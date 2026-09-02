"use client";

import type { ReactNode } from "react";
import { AlertTriangle, Inbox, ShieldOff, SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { TableDensity } from "@/lib/ui/table-prefs";

/**
 * The four things a queue says instead of rows.
 *
 * They are four and not one because the fix is different in each case, and a
 * single "no data" would send an admin to the wrong one every time: clear a
 * filter, reload, ask for a permission, or wait for someone to submit something.
 *
 * **Panels, not table rows.** A `<td colSpan>` is only as tall as its own text,
 * so once the card stretches to the bottom of the window the message sat pinned
 * under the header with the whole card blank beneath it. Outside the table it
 * centres in the space the rows would have taken, which is where the eye goes.
 * Nothing in here needs to know the column count any more.
 */

/**
 * The design system's two heights (§08 · Table, Anatomy): **56px comfortable,
 * 44px compact, never below 40px**. Both were one step short — 52 and 40 — and
 * compact sat exactly on the floor the rule names rather than above it.
 *
 * Shared by every queue on this shell, so a change here moves them all. That is
 * the point of the shell; it is also why the two values are the system's and not
 * a per-screen choice.
 */
const ROW_HEIGHT: Record<TableDensity, string> = {
  comfortable: "h-14",
  compact: "h-11",
};

export function TableState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    // Vertical padding is small on purpose: the panel is centred inside a region
    // that is already tall, and generous padding there only pushes it off-centre.
    <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
      <span className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </span>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground text-pretty">{body}</p>
      {action}
    </div>
  );
}

/** Nothing is waiting — and that is good news, not an error. */
export function TableEmpty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <TableState
      icon={<Inbox className="size-4" />}
      title={title}
      body={body}
      action={action}
    />
  );
}

/**
 * Narrowed to nothing. Different copy from empty, and a Clear all — because here
 * the fix is the filter, not the data.
 */
export function TableNoMatch({ onClear }: { onClear: () => void }) {
  const t = useTranslations("common.table");
  const tCommon = useTranslations("common");
  return (
    <TableState
      icon={<SlidersHorizontal className="size-4" />}
      title={t("noMatchTitle")}
      body={t("noMatchBody")}
      action={
        <Button variant="outline" size="sm" onClick={onClear} className="mt-1">
          {tCommon("clearFilters")}
        </Button>
      }
    />
  );
}

export function TableError() {
  const t = useTranslations("common.table");
  return (
    <TableState
      icon={<AlertTriangle className="size-4" />}
      title={t("errorTitle")}
      body={t("errorBody")}
    />
  );
}

/**
 * The rows are hidden and the reason is named — but the tabs above stay, so the
 * admin can still see what exists and ask for the right grant.
 */
export function TableForbidden() {
  const t = useTranslations("common.table");
  return (
    <TableState
      icon={<ShieldOff className="size-4" />}
      title={t("forbiddenTitle")}
      body={t("forbiddenBody")}
    />
  );
}

/**
 * Skeletons at the **real** row height for the current density, so the table does
 * not shrink and jump when the rows land. The header and toolbar are already drawn
 * by the time this renders.
 *
 * These stay table rows: they stand in for rows, and they have to line up with
 * the columns above them to do that.
 */
export function TableSkeletonRows({
  columns,
  density,
  rows = 6,
}: {
  columns: number;
  density: TableDensity;
  rows?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <TableRow key={i} className={cn("hover:bg-transparent", ROW_HEIGHT[density])}>
          {Array.from({ length: columns }, (_, c) => (
            <TableCell key={c} className="px-4">
              {/* The first cell carries row identity and is visibly wider, so a
                  uniform bar would settle into an uneven grid on arrival. */}
              <Skeleton className={cn("h-4 rounded", c === 0 ? "w-40" : "w-20")} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

export { ROW_HEIGHT };
