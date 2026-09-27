"use client";

import type { useTranslations } from "next-intl";
import { Repeat, UserPlus } from "lucide-react";
import { Can } from "@/components/auth/can";
import { Button } from "@/components/ui/button";
import type { DataColumn } from "@/components/ui/data-table";
import { StaffingPipMeter } from "@/components/tasks/staffing-pip-meter";
import { StatusCell } from "@/components/tasks/register/status-cell";
import { propertyHue } from "@/lib/tasks/dispatch-row";
import type { RegisterRow } from "@/lib/tasks/register/rows";
import { compareSchedule, compareStaffing, compareStatus } from "@/lib/tasks/register/sort";
import { professionHue } from "@/lib/workers/profession-hue";
import { cn } from "@/lib/utils";

export type RegisterT = ReturnType<typeof useTranslations<"tasks.register">>;

export interface ProfessionDisplay {
  label: string;
  hueKey: string;
}

export interface RegisterColumnsOptions {
  t: RegisterT;
  locale: string;
  /**
   * A profession id resolved for display: `label` in the reading locale, and
   * `hueKey` — the **English** name, locale-invariant, because that is what the
   * Workers table hashes (`WorkerRowDto.skills` is English only). Hashing the
   * German label would recolour the same profession under `de`. `null` when the
   * id is not in the lookup at all.
   */
  profession: (id: string) => ProfessionDisplay | null;
  onAssign: (row: RegisterRow) => void;
}

/** "Tue 01 Sep" — the day a row is worked, in the admin's own clock. */
export function dayLabel(row: RegisterRow, locale: string): string {
  if (Number.isNaN(row.startMs)) return "–";
  return new Intl.DateTimeFormat(locale, { weekday: "short", day: "2-digit", month: "short" })
    .format(new Date(row.startMs));
}

export function windowLabel(row: RegisterRow): string {
  return `${row.startTime}–${row.endTime ?? "…"}`;
}

function formatDateTime(iso: string | null | undefined, locale: string): string {
  if (!iso) return "–";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "–";
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  }).format(d);
}

function formatDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return "–";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "–";
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

/** A day that is over — its meter says nothing any more. */
function isClosed(row: RegisterRow): boolean {
  return row.status === "Done" || row.status === "Cancelled";
}

function isUrgent(row: RegisterRow): boolean {
  return row.unstaffedToday || row.startsSoon;
}

/** Design 01 · meterFg: green when covered, red when urgent, amber otherwise. */
function fractionTone(row: RegisterRow): string {
  if (row.staffing.covered) return "text-status-active";
  return isUrgent(row) ? "text-status-cancelled-deep" : "text-status-pending-deep";
}

function staffingWords(row: RegisterRow, t: RegisterT): string {
  if (row.over > 0) return t("staffing.over", { count: row.over });
  if (row.staffing.covered) return t("staffing.full");
  if (row.staffing.filled === 0) return t("staffing.none");
  return t("staffing.short", { count: row.staffing.gap });
}

/** Meter + `filled/required` on one line. `–` once the day is closed. */
export function StaffingLine({ row }: { row: RegisterRow }) {
  if (isClosed(row)) return <span className="text-muted-foreground">–</span>;
  return (
    <span className="flex items-center gap-2">
      <StaffingPipMeter
        filled={row.staffing.filled}
        required={row.staffing.required}
        urgent={isUrgent(row)}
        size="sm"
      />
      <span className={cn("font-mono text-xs font-bold tabular-nums", fractionTone(row))}>
        {row.staffing.filled}/{row.staffing.required}
      </span>
    </span>
  );
}

/**
 * Assign, only where a seat is open. Sits above the shell's full-row `RowLink`
 * (`z-[1]`) — without `relative z-[2]` the overlay would take the click and
 * open the booking instead.
 */
export function AssignButton({
  row,
  label,
  onAssign,
}: {
  row: RegisterRow;
  label: string;
  onAssign: (row: RegisterRow) => void;
}) {
  if (!row.assignable) return null;
  return (
    <Can permission="task:assign_worker_any">
      <span className="relative z-[2] inline-flex">
        <Button
          size="sm"
          variant={row.unstaffedToday ? "default" : "outline"}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAssign(row);
          }}
        >
          <UserPlus />
          {label}
        </Button>
      </span>
    </Can>
  );
}

/** Title with the repeat mark, then property dot · name · short id. */
export function TaskIdentity({ row, t }: { row: RegisterRow; t: RegisterT }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="truncate font-medium">{row.title ?? "–"}</span>
        {row.repeating && (
          <Repeat
            className="size-3.5 flex-none text-muted-foreground"
            aria-label={t("repeating")}
            role="img"
          />
        )}
      </span>
      <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
        <span
          aria-hidden
          className="size-1.5 flex-none rounded-full"
          // ⚠ The one inline colour: data-derived per property, as on Dispatch
          // (`dispatch-task-row.tsx`).
          style={{ backgroundColor: propertyHue(row.task.propertyId) }}
        />
        <span className="truncate">{row.task.propertyName ?? "–"}</span>
        <span className="flex-none font-mono text-[11px] tabular-nums text-muted-foreground">
          {row.task.id.slice(0, 8)}
        </span>
      </span>
    </div>
  );
}

/**
 * The register's columns (design 01 · 06): six on by default, four more in the
 * picker. Sorting is client-side over the loaded window — the route has none.
 */
export function registerColumns({
  t,
  locale,
  profession,
  onAssign,
}: RegisterColumnsOptions): DataColumn<RegisterRow>[] {
  return [
    {
      id: "task",
      label: t("columns.task"),
      // Row identity — never hidden (`ColumnMeta.locked`).
      locked: true,
      className: "min-w-[240px]",
      cell: (row) => <TaskIdentity row={row} t={t} />,
    },
    {
      id: "status",
      label: t("columns.status"),
      className: "w-[150px]",
      compare: compareStatus,
      cell: (row) => <StatusCell status={row.status} />,
    },
    {
      id: "schedule",
      label: t("columns.schedule"),
      className: "w-[150px]",
      compare: compareSchedule,
      cell: (row) => (
        <div className="flex flex-col gap-0.5">
          <span
            className={cn(
              "whitespace-nowrap text-[12.5px] font-semibold",
              row.startsSoon && "text-status-cancelled-deep",
            )}
          >
            {dayLabel(row, locale)}
          </span>
          <span
            className={cn(
              "whitespace-nowrap font-mono text-xs tabular-nums text-muted-foreground",
              row.startsSoon && "text-status-cancelled-deep",
            )}
          >
            {windowLabel(row)}
          </span>
        </div>
      ),
    },
    {
      id: "staffing",
      label: t("columns.staffing"),
      className: "w-[150px]",
      compare: compareStaffing,
      cell: (row) =>
        isClosed(row) ? (
          <span className="text-muted-foreground">–</span>
        ) : (
          <div className="flex flex-col gap-1">
            <StaffingLine row={row} />
            <span
              className={cn(
                "truncate text-[11px]",
                row.over > 0 ? "text-status-pending-deep" : "text-muted-foreground",
              )}
            >
              {staffingWords(row, t)}
            </span>
          </div>
        ),
    },
    {
      id: "professions",
      label: t("columns.professions"),
      className: "w-[170px]",
      cell: (row) => {
        if (row.professionIds.length === 0) {
          return <span className="text-muted-foreground">–</span>;
        }
        // Two, then a count — the Workers table's rule, so a third name never
        // truncates mid-word.
        const shown = row.professionIds.slice(0, 2);
        return (
          <div className="flex min-w-0 items-center gap-2.5">
            {shown.map((id) => {
              const p = profession(id);
              // Never the raw id: an unknown profession reads as an empty value.
              if (!p) {
                return (
                  <span key={id} className="text-xs text-muted-foreground">
                    –
                  </span>
                );
              }
              return (
                <span key={id} className="inline-flex min-w-0 items-center gap-1 text-xs">
                  <span
                    aria-hidden
                    className="size-1.5 flex-none rounded-full"
                    // Data-derived like the property dot; same key as Workers.
                    style={{ backgroundColor: professionHue(p.hueKey) }}
                  />
                  <span className="truncate">{p.label}</span>
                </span>
              );
            })}
            {row.professionIds.length > shown.length && (
              <span className="flex-none font-mono text-[11px] tabular-nums text-muted-foreground">
                +{row.professionIds.length - shown.length}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "deadline",
      label: t("columns.deadline"),
      defaultVisible: false,
      className: "w-[130px]",
      cell: (row) => (
        <span className="whitespace-nowrap font-mono text-xs tabular-nums">
          {formatDateTime(row.task.deadline, locale)}
        </span>
      ),
    },
    {
      id: "ratingFloor",
      label: t("columns.ratingFloor"),
      defaultVisible: false,
      className: "w-[120px]",
      cell: (row) => (
        <span className="whitespace-nowrap font-mono text-xs tabular-nums">
          {row.ratingFloor !== null && row.ratingFloor > 0 ? `≥ ${row.ratingFloor} ★` : "–"}
        </span>
      ),
    },
    {
      id: "created",
      label: t("columns.created"),
      defaultVisible: false,
      className: "w-[120px]",
      cell: (row) => (
        <span className="whitespace-nowrap font-mono text-xs tabular-nums">
          {formatDate(row.createdAt, locale)}
        </span>
      ),
    },
    {
      id: "taskId",
      label: t("columns.taskId"),
      defaultVisible: false,
      className: "w-[300px]",
      cell: (row) => (
        <span className="font-mono text-xs tabular-nums text-muted-foreground">{row.task.id}</span>
      ),
    },
    {
      id: "action",
      label: t("columns.action"),
      // Locked, and last in the registry: a locked column keeps its registry
      // index, so picker columns switched on land before it, not after.
      locked: true,
      align: "right",
      className: "w-[120px]",
      cell: (row) => <AssignButton row={row} label={t("assign")} onAssign={onAssign} />,
    },
  ];
}
