"use client";

import { ChevronDown, ChevronUp, ShieldCheck, Star, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import {
  formatHours,
  type MatrixChip,
  type MatrixRow as Row,
  type OpenTaskCandidate,
} from "@/lib/workers/matrix";
import { stageTone, workerStatusPresentation } from "@/lib/workers/worker-status";
import { cn } from "@/lib/utils";
import { MatrixCell } from "./matrix-cell";

/** The frozen identity column, matched to the design's 300px. */
const IDENTITY = "w-[300px] flex-none";

export function MatrixRow({
  row,
  dayKeys,
  todayKey,
  failedDays,
  openTasksByDay,
  expanded,
  onToggle,
  onAssign,
  onOpenChip,
}: {
  row: Row;
  dayKeys: DayKey[];
  todayKey: DayKey;
  failedDays: boolean[];
  /** Index-aligned with `dayKeys` — shared across every row, computed once. */
  openTasksByDay: OpenTaskCandidate[][];
  expanded: boolean;
  onToggle: () => void;
  onAssign: (chip: MatrixChip) => void;
  onOpenChip: (chip: MatrixChip) => void;
}) {
  const t = useTranslations("workers.matrix");
  const tStage = useTranslations("workers.stage");
  const tAccount = useTranslations("workers.account");
  const tRating = useTranslations("workers.rating");
  const tProfessions = useTranslations("workers.professions");
  const status = workerStatusPresentation(row.worker);

  // The design's own gate on the badge's colour: a free day only reads as an
  // opportunity when the worker could actually be given the work. Mirrors
  // `bookable = stage Active && account Active` from the design's `matrix()`.
  const bookable = status.kind === "stage" && status.labelKey === "active";

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

          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="truncate text-[13px] font-semibold leading-tight">
              {row.worker.fullName || "—"}
            </span>
            <span className="flex flex-wrap items-center gap-1">
              <Badge
                tone={
                  status.tone === "solidCritical"
                    ? "danger"
                    : status.tone === "outlineWarning"
                      ? "warning"
                      : stageTone(status.labelKey)
                }
                className="h-[18px] gap-1 rounded-md px-1.5 text-[10px]"
              >
                <span
                  aria-hidden
                  className="size-1.5 shrink-0 rounded-full bg-current opacity-70"
                />
                {status.kind === "stage"
                  ? tStage(status.labelKey as "kyc")
                  : tAccount(status.labelKey as "blocked")}
              </Badge>
              {/*
                ⚠ Booked hours only. The design draws `38:30 / 36 h` with a delta,
                and **there is no contracted-hours field in the API** — no target
                exists to compare against, so none is invented. Filed as an ask.
              */}
              <span
                title={t("tasks", { count: row.taskCount })}
                className="font-mono text-[11px] font-semibold"
              >
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
              {/* The design's own thesis for this screen: a free day is an
                  assign target, so it is surfaced beside the status rather
                  than left for an admin to scan seven cells to find. Always
                  drawn — "full week" is as much the answer as "3 free" is —
                  and only tinted green when the worker is actually bookable. */}
              <span
                className={cn(
                  "rounded-md px-1.5 text-[10px] font-semibold",
                  bookable && row.freeDays > 0
                    ? "bg-status-active-tint text-status-active"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {row.freeDays > 0 ? t("freeDays", { count: row.freeDays }) : t("fullWeek")}
              </span>
            </span>
            <span className="flex min-w-0 items-center gap-1 truncate text-[10px] text-muted-foreground">
              {/* One profession, not the list — the row is 300px and rating
                  and city still need to fit beside it. Same single-value
                  shape the design's own `matrix()` draws (`skills[0]`). */}
              <span className="flex-none truncate">
                {row.worker.skills && row.worker.skills.length > 0
                  ? row.worker.skills[0]
                  : tProfessions("none")}
              </span>
              <span aria-hidden className="flex-none text-border">
                ·
              </span>
              <span className="flex flex-none items-center gap-0.5 font-semibold text-foreground/80">
                {row.worker.completedTasks === 0 ? (
                  tRating("new")
                ) : (
                  <>
                    <Star className="size-2.5 fill-current" strokeWidth={0} />
                    {row.worker.rating.toFixed(1)}
                  </>
                )}
              </span>
              <span aria-hidden className="flex-none text-border">
                ·
              </span>
              <span className="min-w-0 flex-1 truncate">{row.worker.city || "—"}</span>
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
            assignable={bookable && openTasksByDay[i].length > 0}
            candidates={openTasksByDay[i]}
            workerId={row.worker.id}
            workerName={row.worker.fullName}
            date={dayKeys[i]}
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
