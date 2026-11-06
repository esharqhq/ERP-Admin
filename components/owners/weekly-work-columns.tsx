"use client";

import type { useTranslations } from "next-intl";
import type { DataColumn } from "@/components/ui/data-table";
import { TaskStatusBadge } from "@/components/tasks/task-status-badge";
import {
  compareText,
  compareWeeklySchedule,
  compareWeeklyStatus,
  workerSummary,
  type WeeklyTaskRow,
} from "@/lib/tasks/weekly-rows";

type OwnersT = ReturnType<typeof useTranslations<"owners">>;

/** "Tue 01 Sep" — read from the date key as a local day, never through UTC. */
export function weeklyDayLabel(row: WeeklyTaskRow, locale: string): string {
  const d = new Date(`${row.scheduledDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "–";
  return d.toLocaleDateString(locale, { weekday: "short", day: "2-digit", month: "short" });
}

/** `HH:mm` out of the wire's `scheduledAt`, as the calendar prints it. */
export function weeklyTime(row: WeeklyTaskRow): string {
  const iso = row.scheduledAt ?? "";
  const time = iso.includes("T") ? iso.split("T")[1] : iso;
  return time.slice(0, 5) || "–";
}

/** Two names and a `+n`, or the empty-cell dash for a job nobody holds yet. */
export function WorkersCell({ row, t }: { row: WeeklyTaskRow; t: OwnersT }) {
  const staff = workerSummary(row);
  if (staff.names.length === 0) {
    return <span className="text-muted-foreground">{t("work.unstaffed")}</span>;
  }
  return (
    <span className="truncate">
      {staff.names.join(", ")}
      {staff.extra > 0 ? (
        <span className="ml-1 font-mono tabular-nums text-muted-foreground">
          {t("work.more", { count: staff.extra })}
        </span>
      ) : null}
    </span>
  );
}

/**
 * The booked-work table's columns, for the `DataTable` shell.
 *
 * Date is locked: it is what makes a row a row — a property booked twice in one
 * week is two rows told apart only by the day. Every column whose values in a
 * week has a natural order for sorts (`compareWeeklyStatus` puts open work first).
 */
export function weeklyWorkColumns({
  t,
  locale,
}: {
  t: OwnersT;
  locale: string;
}): DataColumn<WeeklyTaskRow>[] {
  return [
    {
      id: "date",
      locked: true,
      label: t("work.columns.date"),
      compare: compareWeeklySchedule,
      className: "w-[8.5rem]",
      cell: (row) => (
        <span className="whitespace-nowrap font-mono text-[13px] tabular-nums">
          {weeklyDayLabel(row, locale)}
        </span>
      ),
    },
    {
      id: "time",
      label: t("work.columns.time"),
      // Time of day alone — sorting by `date` already orders day-then-time.
      compare: (a, b) => weeklyTime(a).localeCompare(weeklyTime(b)),
      className: "w-20",
      cell: (row) => (
        <span className="font-mono text-[13px] tabular-nums text-muted-foreground">
          {weeklyTime(row)}
        </span>
      ),
    },
    {
      id: "property",
      label: t("work.columns.property"),
      compare: (a, b) => compareText(a.propertyName, b.propertyName),
      className: "max-w-[14rem]",
      cell: (row) => (
        <span className="block truncate text-[13.5px] font-medium">
          {row.propertyName || "–"}
        </span>
      ),
    },
    {
      id: "workers",
      label: t("work.columns.worker"),
      className: "max-w-[14rem]",
      cell: (row) => (
        <span className="flex min-w-0 text-[13.5px]">
          <WorkersCell row={row} t={t} />
        </span>
      ),
    },
    {
      id: "booking",
      label: t("work.columns.booking"),
      compare: (a, b) => compareText(a.groupTitle, b.groupTitle),
      className: "max-w-[14rem]",
      cell: (row) => (
        <span className="block truncate text-[13.5px] text-muted-foreground">
          {row.groupTitle || "–"}
        </span>
      ),
    },
    {
      id: "status",
      label: t("work.columns.status"),
      compare: compareWeeklyStatus,
      cell: (row) => <TaskStatusBadge status={row.status} />,
    },
  ];
}

/**
 * One booked day below 768px: booking and property, then status · day · time,
 * then who is on it. The shell lays the full-card link over it.
 */
export function WeeklyWorkRowCard({
  row,
  t,
  locale,
}: {
  row: WeeklyTaskRow;
  t: OwnersT;
  locale: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2 px-4 py-3.5">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-sm font-semibold">
          {row.groupTitle || row.propertyName || "–"}
        </span>
        {row.groupTitle ? (
          <span className="truncate text-xs text-muted-foreground">
            {row.propertyName || "–"}
          </span>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <TaskStatusBadge status={row.status} />
        <span className="whitespace-nowrap text-xs font-semibold">
          {weeklyDayLabel(row, locale)}
          <span className="ml-1.5 font-mono font-normal tabular-nums text-muted-foreground">
            {weeklyTime(row)}
          </span>
        </span>
      </div>
      <div className="flex min-w-0 border-t border-border pt-2 text-[13px]">
        <WorkersCell row={row} t={t} />
      </div>
    </div>
  );
}
