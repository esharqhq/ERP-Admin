"use client";

import { ChevronDown, ChevronUp, ShieldCheck, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkerAvailability } from "@/hooks/use-worker-availability";
import { initials } from "@/lib/ui/initials";
import type { DayKey } from "@/lib/ui/week";
import {
  exceptionWindow,
  resolveAvailabilityWeek,
  windowLabel,
  type AvailabilityDay,
} from "@/lib/workers/availability";
import { formatHours, type MatrixChip, type MatrixRow as Row } from "@/lib/workers/matrix";
import { workerStatusPresentation } from "@/lib/workers/worker-status";
import { cn } from "@/lib/utils";
import { MatrixCell } from "./matrix-cell";

/** The frozen identity column, matched to the design's 252px. */
const IDENTITY = "w-[252px] flex-none";

export function MatrixRow({
  row,
  dayKeys,
  todayKey,
  failedDays,
  expanded,
  onToggle,
  onAssign,
  onOpenChip,
}: {
  row: Row;
  dayKeys: DayKey[];
  todayKey: DayKey;
  failedDays: boolean[];
  expanded: boolean;
  onToggle: () => void;
  onAssign: (chip: MatrixChip) => void;
  onOpenChip: (chip: MatrixChip) => void;
}) {
  const t = useTranslations("workers.matrix");
  const status = workerStatusPresentation(row.worker);

  /*
    ⚠ The single most expensive thing on this screen, and the reason the Matrix
    reads booked work rather than availability: **one request per worker.** It
    stays idle until this row is actually opened, so a 100-row page costs zero
    availability requests until somebody asks a question about one worker.
  */
  const availability = useWorkerAvailability(
    row.worker.id,
    exceptionWindow(dayKeys),
    expanded,
  );
  const week = resolveAvailabilityWeek(availability.data, dayKeys);

  return (
    <div className="flex flex-col border-b border-border/60">
      <div className="flex min-h-[78px]">
        <div
          className={cn(
            IDENTITY,
            "flex items-center gap-2.5 border-r border-border px-3.5 py-2",
            status.rail === "critical" && "border-l-[3px] border-l-status-cancelled",
            status.rail === "warning" && "border-l-[3px] border-l-status-pending",
          )}
        >
          <Avatar className="size-[30px] shrink-0">
            <AvatarFallback
              className={cn(
                "text-[10.5px] font-semibold",
                row.worker.status === "Blocked"
                  ? "bg-status-cancelled-tint text-status-cancelled"
                  : "bg-accent text-primary",
              )}
            >
              {initials(row.worker.fullName)}
            </AvatarFallback>
          </Avatar>

          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-[13px] font-semibold leading-tight">
              {row.worker.fullName || "—"}
            </span>
            <span className="flex items-center gap-1.5">
              {/*
                ⚠ Booked hours only. The design draws `38:30 / 36 h` with a delta,
                and **there is no contracted-hours field in the API** — no target
                exists to compare against, so none is invented. Filed as an ask.
              */}
              <span className="font-mono text-[11px] font-semibold">
                {row.hours === null ? "—" : t("hours", { hours: formatHours(row.hours) })}
              </span>
              {row.untimedCount > 0 && (
                // The total is a floor, and saying so is cheaper than a wrong sum.
                <span
                  title={t("untimedHint")}
                  className="rounded bg-muted px-1 font-mono text-[9px] font-bold text-muted-foreground"
                >
                  {t("untimed", { count: row.untimedCount })}
                </span>
              )}
            </span>
            <span className="truncate text-[10px] text-muted-foreground">
              {t("tasks", { count: row.taskCount })}
            </span>
          </div>

          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-label={t("toggleAvailability", {
              name: row.worker.fullName ?? "",
            })}
            className={cn(
              "flex size-[22px] flex-none items-center justify-center rounded-[7px] transition-colors",
              "outline-none focus-visible:ring-2 focus-visible:ring-ring",
              expanded
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {expanded ? (
              <ChevronUp className="size-3.5" strokeWidth={2.4} />
            ) : (
              <ChevronDown className="size-3.5" strokeWidth={2.4} />
            )}
          </button>
        </div>

        {row.cells.map((cell, i) => (
          <MatrixCell
            key={dayKeys[i]}
            chips={cell.chips}
            availability={expanded ? week[i] : undefined}
            isToday={dayKeys[i] === todayKey}
            isWeekend={i > 4}
            failed={failedDays[i]}
            onAssign={onAssign}
            onOpenChip={onOpenChip}
          />
        ))}
      </div>

      {expanded && (
        <div className="flex border-t border-dashed border-border bg-muted/20">
          <div
            className={cn(
              IDENTITY,
              "flex flex-col justify-center gap-0.5 border-r border-border px-3.5 py-2",
            )}
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-primary">
              {t("declared")}
            </span>
            <span className="font-mono text-[9.5px] text-muted-foreground">
              {t("oneRequest")}
            </span>
          </div>

          {availability.isLoading ? (
            <div className="flex flex-1 items-center gap-2 px-3 py-2">
              {dayKeys.map((k) => (
                <Skeleton key={k} className="h-5 flex-1 rounded-md" />
              ))}
            </div>
          ) : availability.isError ? (
            <div className="flex flex-1 items-center px-3 py-2 text-[11px] text-muted-foreground">
              {t("availabilityFailed")}
            </div>
          ) : (
            week.map((day, i) => (
              <AvailabilityCell key={dayKeys[i]} day={day} isToday={dayKeys[i] === todayKey} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

/**
 * One day of the declared strip.
 *
 * **Three sources, three appearances** — `Base` inherited, `Worker` hand-set,
 * `Admin` overridden. An admin edit that looked like the worker's own choice
 * would make "I changed it and nothing happened" the standing complaint, which is
 * exactly what the source pill prevents.
 */
function AvailabilityCell({
  day,
  isToday,
}: {
  day: AvailabilityDay;
  isToday: boolean;
}) {
  const t = useTranslations("workers.matrix");

  const source = day.state === "unknown" ? null : day.source;
  const admin = source === "Admin";

  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col items-start gap-1 border-r border-border/60 px-2 py-2",
        isToday && "bg-status-active-tint/15",
      )}
    >
      <span
        className={cn(
          "flex max-w-full items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
          day.state === "unknown"
            ? "bg-muted text-muted-foreground"
            : day.state === "closed"
              ? "bg-muted text-muted-foreground"
              : admin
                ? "bg-status-info-tint text-status-info"
                : "bg-status-active-tint text-status-active",
        )}
      >
        {day.state === "open" ? (
          <ShieldCheck className="size-2.5 flex-none" />
        ) : (
          <User className="size-2.5 flex-none" />
        )}
        <span className="min-w-0 truncate">
          {day.state === "open"
            ? windowLabel(day)
            : day.state === "closed"
              ? t("availability.closed")
              : /* Absence is unknown, not unavailable — the `?availableOn=` rule. */
                t("availability.unknown")}
        </span>
      </span>
      {source && (
        <span
          className={cn(
            "truncate font-mono text-[9.5px]",
            admin ? "text-status-info" : "text-muted-foreground/70",
          )}
        >
          {t(`availability.source.${source}` as "availability.source.Base")}
        </span>
      )}
    </div>
  );
}
