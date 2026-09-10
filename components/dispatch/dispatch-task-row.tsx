"use client";

import { Link } from "@/i18n/navigation";
import { Eye, Plus, UserPlus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";
import { StaffingPipMeter } from "@/components/tasks/staffing-pip-meter";
import {
  crewState,
  durationHours,
  propertyHue,
  rowStaffing,
  type GroupFacts,
} from "@/lib/tasks/dispatch-row";
import { isOpen } from "@/lib/tasks/staffing";
import { initials } from "@/lib/ui/initials";
import { normalizeStatus, type TaskItemDto, type TaskWorkerDto } from "@/lib/types/task.types";
import { cn } from "@/lib/utils";

/**
 * The task's own status, with a dot, as the design draws it.
 *
 * Deliberately the **raw** status rather than `deriveTaskStatus`, which is right
 * for the Tasks table and wrong here: it collapses a bare shift today into
 * `Unstaffed`, which this row already says twice — in the meter and in the red
 * accent bar. A third telling would spend the pill on a fact and leave the admin
 * without the one thing the pill is for, which is where the task is in its own
 * lifecycle.
 *
 * `TASK_STATUS_VISUAL` is not reused for the same reason `pip-layout` stopped
 * returning hexes: it holds literal colours. These are tokens.
 */
const STATUS_TONE: Record<string, string> = {
  active: "bg-status-active-tint text-status-active",
  pending: "bg-muted text-muted-foreground",
  review: "bg-status-pending-tint text-status-pending-deep",
  done: "bg-status-active-tint/50 text-status-active/80",
  cancelled: "bg-muted/60 text-muted-foreground/60",
};

function StatusPill({ status }: { status: string }) {
  const key = normalizeStatus(status);
  return (
    <span
      className={cn(
        "flex h-[19px] flex-none items-center gap-1.5 whitespace-nowrap rounded-md px-1.5 text-[10.5px] font-semibold",
        // An unexpected status must still render — never treat the enum as closed.
        STATUS_TONE[key] ?? "bg-muted text-muted-foreground",
      )}
    >
      <span aria-hidden className="size-[5px] rounded-full bg-current opacity-70" />
      {status || "—"}
    </span>
  );
}

/**
 * One task, as a **row** rather than a card.
 *
 * ⚠ An earlier pass drew each task as its own `Card`, which is why the board did
 * not read like the design at any zoom: a stack of floating cards has no columns,
 * so nothing lined up down the page and the time — the thing the admin scans —
 * had no place of its own. Rows inside one surface give the board its gutters:
 *
 * ```
 * │ 08:00  │ • Sonnenhof  [Active]      ▰▱▱ 1/3   [Assign] [👁]
 * │ in 3 h │   Housekeeping · 6 h       2 bodies short
 * │        │ (DK Dilnoza · checked in ×) (+ 2 slots open)
 * ```
 *
 * The 3px bar at the left edge is the row's own urgency, so a bare shift starting
 * today is findable without reading anything.
 */
export function DispatchTaskRow({
  task,
  propertyName,
  group,
  urgent,
  hoursLeft,
  onAssign,
  onUnassign,
}: {
  task: TaskItemDto;
  propertyName: string;
  /** Title and eligibility facts, absent until the group list arrives. */
  group: GroupFacts | undefined;
  urgent: boolean;
  /** Whole hours until start; negative once started, `null` before the clock. */
  hoursLeft: number | null;
  onAssign: (taskId: string) => void;
  onUnassign: (taskId: string, tw: TaskWorkerDto) => void;
}) {
  const t = useTranslations("dispatch");
  const staffing = rowStaffing(task);
  const bare = staffing.filled === 0;
  const time = (task.scheduledAt ?? "").slice(11, 16);
  const hours = durationHours(task.scheduledAt, task.deadline);
  /** Closed tasks lose the button — the server has no such guard (`staffing.ts`). */
  const canFill = isOpen(task);

  return (
    <div
      className={cn(
        "relative border-b border-border/60 px-4 py-3 last:border-b-0",
        bare && urgent && "bg-destructive/[0.03]",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0 start-0 w-[3px]",
          bare && urgent
            ? "bg-destructive"
            : staffing.covered
              ? "bg-transparent"
              : "bg-status-pending/70",
        )}
      />

      <div className="flex items-center gap-3">
        {/* The time gutter. Fixed width so every row's clock is on one line. */}
        <span className="flex w-[62px] flex-none flex-col gap-px">
          <span
            className={cn(
              "font-mono text-sm font-semibold tabular-nums tracking-tight",
              urgent ? "text-destructive" : "text-foreground",
            )}
          >
            {time || "—"}
          </span>
          {hoursLeft !== null ? (
            <span className="whitespace-nowrap text-[10px] text-muted-foreground">
              {hoursLeft < 0
                ? t("started", { count: Math.abs(hoursLeft) })
                : t("startsIn", { count: hoursLeft })}
            </span>
          ) : null}
        </span>

        <span aria-hidden className="h-[30px] w-px flex-none bg-border/70" />

        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex min-w-0 items-center gap-2">
            {/*
              ⚠ Derived from the id, never stored — `PropertyDto` has no colour
              and no admin can set one. It is here to tell two rows apart, not to
              name a brand.
            */}
            <span
              aria-hidden
              className="size-[7px] flex-none rounded-full"
              style={{ background: propertyHue(task.propertyId) }}
            />
            <span className="truncate text-sm font-semibold tracking-tight">
              {propertyName}
            </span>
            <StatusPill status={task.status} />
          </span>
          {/*
            The title comes from the task's GROUP, which is a second request —
            `TaskItemDto` has no title field at all. `null` is normal (the field is
            optional server-side), so the line degrades to the duration alone, and
            to nothing when there is no deadline either.
          */}
          <span className="truncate text-xs text-muted-foreground">
            {[group?.title, hours !== null ? t("hours", { count: hours }) : null]
              .filter(Boolean)
              .join(" · ") || "—"}
          </span>
        </span>

        <span className="flex w-[126px] flex-none flex-col gap-1">
          <span className="flex items-center gap-1.5">
            <StaffingPipMeter
              filled={staffing.filled}
              required={staffing.required}
              urgent={urgent}
            />
            <span
              className={cn(
                "font-mono text-xs font-semibold tabular-nums",
                staffing.covered
                  ? "text-status-active"
                  : urgent && bare
                    ? "text-destructive"
                    : "text-status-pending-deep",
              )}
            >
              {staffing.filled} / {staffing.required}
            </span>
          </span>
          <span
            className={cn(
              "whitespace-nowrap text-[10px]",
              staffing.covered ? "text-muted-foreground" : "text-status-pending-deep/80",
            )}
          >
            {staffing.covered
              ? t("fullyStaffed")
              : t("bodiesShort", { count: staffing.gap })}
          </span>
        </span>

        <span className="flex flex-none items-center gap-1.5">
          {canFill ? (
            <Can permission="task:assign_worker_any">
              {/*
                Filled, not outlined — it is the row's only action and the reason
                the screen exists. It goes red on an urgent row so the eye lands
                on the shift that is about to start short.
              */}
              <Button
                size="sm"
                variant={staffing.covered ? "outline" : "default"}
                className={cn(
                  "gap-1.5",
                  !staffing.covered && urgent && "bg-destructive hover:bg-destructive/90",
                )}
                onClick={() => onAssign(task.id)}
              >
                <UserPlus className="size-3.5" />
                {staffing.covered ? t("add") : t("assign")}
              </Button>
            </Can>
          ) : null}
          {/* Icon-only: the label was three times the width of the thing it opened. */}
          <Button
            variant="outline"
            size="icon-sm"
            nativeButton={false}
            className="size-[30px] text-muted-foreground"
            title={t("viewGroup")}
            aria-label={t("viewGroup")}
            render={<Link href={`/dashboard/tasks/${task.groupId}`} />}
          >
            <Eye className="size-3.5" />
          </Button>
        </span>
      </div>

      {/*
        The crew line, indented to clear the time gutter so the names sit under
        the property they belong to.
      */}
      {task.workers.length > 0 || !staffing.covered ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 ps-[75px]">
          {task.workers.map((tw) => {
            const state = crewState(tw);
            const vacated = state === "vacated";
            return (
              <span
                key={tw.id}
                className={cn(
                  "flex h-[26px] items-center gap-1.5 rounded-full ps-1 pe-1 ring-1 ring-inset",
                  vacated
                    ? "bg-card text-muted-foreground/60 ring-border/50"
                    : state === "checkedIn"
                      ? "bg-status-active-tint text-status-active ring-status-active/25"
                      : "bg-muted text-foreground ring-border",
                )}
              >
                <span
                  className={cn(
                    "flex size-[18px] flex-none items-center justify-center rounded-full text-[9px] font-bold",
                    vacated ? "bg-muted" : "bg-background/60",
                  )}
                >
                  {initials(tw.workerName)}
                </span>
                <span
                  className={cn(
                    "whitespace-nowrap text-xs font-medium",
                    vacated && "line-through",
                  )}
                >
                  {tw.workerName ?? tw.workerId.slice(0, 8)}
                </span>
                <span className="whitespace-nowrap text-[10.5px] opacity-70">
                  {t(`crew.${state}`)}
                </span>
                {vacated ? null : (
                  <Can permission="task:unassign_worker_any">
                    <button
                      type="button"
                      title={t("unassign")}
                      aria-label={t("unassign")}
                      onClick={() => onUnassign(task.id, tw)}
                      className="flex size-5 flex-none items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="size-3" />
                    </button>
                  </Can>
                )}
              </span>
            );
          })}

          {/* What is still missing, as a thing rather than as an absence. */}
          {!staffing.covered ? (
            <span
              className={cn(
                "flex h-[26px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[11.5px] font-medium ring-1 ring-inset",
                urgent && bare
                  ? "text-destructive ring-destructive/40"
                  : "text-status-pending-deep ring-status-pending/45",
              )}
            >
              <Plus className="size-3" />
              {t("slotsOpen", { count: staffing.gap })}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
