"use client";

import { RefreshCw, Star, UserMinus, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { CheckinDoorLabel } from "@/components/attendance/checkin-door-label";
import { Can } from "@/components/auth/can";
import { Button } from "@/components/ui/button";
import { openSlots, rowActions, type RowActionKey } from "@/lib/tasks/detail/day-actions";
import { formatHm, instant, lateWorkers, workerLabel } from "@/lib/tasks/detail/day-time";
import { activeWorkers } from "@/lib/tasks/staffing";
import { canonicalTaskStatus } from "@/lib/tasks/status-vocab";
import { normalizeStatus, type TaskItemDto, type TaskWorkerDto } from "@/lib/types/task.types";
import { cn } from "@/lib/utils";

const OUTCOME_TONE: Record<string, string> = {
  completed: "bg-status-verified-tint text-status-verified",
  pending: "bg-muted text-muted-foreground",
  noshow: "bg-status-cancelled-tint text-status-cancelled-deep",
  removed: "bg-status-cancelled-tint text-status-cancelled-deep",
  cancelled: "bg-muted text-muted-foreground/70",
};

const OUTCOME_KEY: Record<string, string> = {
  completed: "Completed",
  pending: "Pending",
  noshow: "NoShow",
  removed: "Removed",
  cancelled: "Cancelled",
};

const ROW_GRID = "md:grid md:grid-cols-[minmax(0,2.2fr)_1.1fr_1.4fr_1fr_0.8fr_104px] md:items-center md:gap-3";

const PERMISSION: Record<RowActionKey, string> = {
  rate: "task_worker:rate_any",
  outcome: "task_worker:mark_outcome_any",
  unassign: "task:unassign_worker_any",
};

/**
 * The selected day's crew: a table at ≥ 768px, stacked cards below. Which icons
 * show is `rowActions`; open-slot rows are `openSlots` — both tested in `lib/`.
 */
export function DayWorkers({
  task,
  now,
  locale,
  onAssign,
  onRate,
  onOutcome,
  onUnassign,
}: {
  task: TaskItemDto;
  now: number;
  locale: string;
  onAssign: () => void;
  onRate: (tw: TaskWorkerDto) => void;
  onOutcome: (tw: TaskWorkerDto) => void;
  onUnassign: (tw: TaskWorkerDto) => void;
}) {
  const t = useTranslations("tasks.detail");
  const tActions = useTranslations("tasks.actions");
  const state = canonicalTaskStatus(task.status);
  const workers = task.workers ?? [];
  const slots = openSlots(task);
  const filled = activeWorkers(task).length;
  const late = new Set(lateWorkers(task, now).map((w) => w.id));
  const open = state === "pending" || state === "checkedIn";
  const cancelled = state === "cancelled";

  const staffTone = !open
    ? "text-muted-foreground"
    : filled === 0
      ? "text-status-cancelled-deep"
      : filled < task.requiredWorkerCount
        ? "text-status-pending-deep"
        : "text-muted-foreground";
  const staffNote = cancelled
    ? t("released")
    : !open
      ? ""
      : slots > 0
        ? t("openCount", { count: slots })
        : t("fullyStaffed");
  const hm = (iso: string | null) => {
    const ms = instant(iso);
    return ms === null ? "–" : formatHm(ms, locale);
  };
  const handler: Record<RowActionKey, (tw: TaskWorkerDto) => void> = {
    rate: onRate,
    outcome: onOutcome,
    unassign: onUnassign,
  };
  const icon: Record<RowActionKey, React.ReactNode> = {
    rate: <Star className="size-4" />,
    outcome: <RefreshCw className="size-4" />,
    unassign: <UserMinus className="size-4" />,
  };
  const iconLabel: Record<RowActionKey, string> = {
    rate: tActions("rate"),
    outcome: tActions("outcome"),
    unassign: tActions("unassign"),
  };

  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[15px] font-bold">
          {t("workers")}{" "}
          {!cancelled ? (
            <span className={cn("font-mono text-[13px] tabular-nums", staffTone)}>
              {filled}/{task.requiredWorkerCount}
            </span>
          ) : null}
        </h3>
        {staffNote ? <span className="text-xs text-muted-foreground">{staffNote}</span> : null}
      </div>

      <div className="overflow-hidden rounded-xl ring-1 ring-inset ring-border">
        <div className={cn("hidden border-b bg-muted/40 px-3.5 py-2 text-muted-foreground", ROW_GRID)}>
          <span className="overline-label">{t("columns.worker")}</span>
          <span className="overline-label">{t("columns.outcome")}</span>
          <span className="overline-label">{t("columns.checkIn")}</span>
          <span className="overline-label">{t("columns.checkOut")}</span>
          <span className="overline-label">{t("columns.rating")}</span>
          <span className="overline-label text-right">{t("columns.actions")}</span>
        </div>

        {workers.map((tw) => {
          const outcome = normalizeStatus(tw.outcome);
          const isSup = tw.workerId === task.supervisorWorkerId;
          const noShow = outcome === "noshow";
          const actions = rowActions(task, tw, now);
          const name = workerLabel(tw);
          return (
            <div
              key={tw.id}
              className={cn(
                "flex flex-col gap-2 border-b px-3.5 py-3 last:border-b-0",
                ROW_GRID,
                noShow && "bg-status-cancelled-tint/30",
              )}
            >
              <div className="flex items-center justify-between gap-2 md:contents">
                <span className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={cn(
                      "flex size-8 flex-none items-center justify-center rounded-full text-xs font-semibold",
                      isSup ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                    )}
                  >
                    {initials(name)}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span
                      className={cn(
                        "truncate text-[13px] font-semibold",
                        noShow && "text-status-cancelled-deep",
                        outcome === "cancelled" && "text-muted-foreground",
                      )}
                    >
                      {name}
                    </span>
                    {isSup ? (
                      <span className="text-[11px] font-semibold text-status-active">{t("supervisorTag")}</span>
                    ) : null}
                  </span>
                </span>
                {/* The row's one badge. */}
                <span
                  className={cn(
                    "inline-flex h-5 items-center self-center rounded-md px-2 text-[11px] font-semibold md:justify-self-start",
                    OUTCOME_TONE[outcome] ?? "text-muted-foreground ring-1 ring-inset ring-border",
                  )}
                >
                  {OUTCOME_KEY[outcome] ? t(`outcomes.${OUTCOME_KEY[outcome]}`) : tw.outcome || "–"}
                </span>
              </div>

              <dl className="grid grid-cols-3 gap-2 text-xs md:contents">
                <div className="flex flex-col gap-0.5">
                  <dt className="overline-label text-muted-foreground md:hidden">{t("columns.checkIn")}</dt>
                  <dd className="flex flex-col gap-0.5">
                    <span
                      className={cn("font-mono text-[13px] tabular-nums", late.has(tw.id) && "text-status-cancelled-deep")}
                    >
                      {hm(tw.checkinAt)}
                    </span>
                    <CheckinDoorLabel door={tw.checkinDoor} />
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="overline-label text-muted-foreground md:hidden">{t("columns.checkOut")}</dt>
                  <dd className="font-mono text-[13px] tabular-nums">{hm(tw.checkoutAt)}</dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="overline-label text-muted-foreground md:hidden">{t("columns.rating")}</dt>
                  <dd className="flex items-center gap-1 font-mono text-[13px] tabular-nums">
                    <Star
                      className={cn(
                        "size-3.5",
                        tw.starRating != null ? "fill-status-pending text-status-pending" : "text-muted-foreground/40",
                      )}
                    />
                    {tw.starRating != null ? tw.starRating.toFixed(1) : "–"}
                  </dd>
                </div>
              </dl>

              <div className="flex justify-end gap-0.5">
                {actions.map((key) => (
                  <Can key={key} permission={PERMISSION[key]}>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title={iconLabel[key]}
                      aria-label={iconLabel[key]}
                      className={key === "unassign" ? "text-destructive" : undefined}
                      onClick={() => handler[key](tw)}
                    >
                      {icon[key]}
                    </Button>
                  </Can>
                ))}
              </div>
            </div>
          );
        })}

        {Array.from({ length: slots }, (_, k) => (
          <div
            key={`slot-${k}`}
            className="flex items-center justify-between gap-3 border-b bg-muted/20 px-3.5 py-3 last:border-b-0"
          >
            <span className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-full text-muted-foreground ring-[1.5px] ring-inset ring-border">
                <UserPlus className="size-3.5" />
              </span>
              <span className="text-[13px] text-muted-foreground">{t("openSlot", { n: filled + k + 1 })}</span>
            </span>
            <Can permission="task:assign_worker_any">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={onAssign}>
                <UserPlus className="size-3.5" />
                {tActions("assign")}
              </Button>
            </Can>
          </div>
        ))}

        {workers.length === 0 && slots === 0 ? (
          <p className="px-3.5 py-5 text-center text-[13px] text-muted-foreground">{t("nobody")}</p>
        ) : null}
      </div>
    </section>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "–";
}
