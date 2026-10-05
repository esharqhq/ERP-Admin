"use client";

import { LockKeyhole, MessageSquareWarning, ShieldCheck, Star, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { DayAlertBox } from "@/components/tasks/detail/day-alert";
import { DayStateChip } from "@/components/tasks/detail/day-state-chip";
import { DayTimeline } from "@/components/tasks/detail/day-timeline";
import { DayWorkers } from "@/components/tasks/detail/day-workers";
import type { DetailModal } from "@/components/tasks/detail/detail-modals";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCurrentPermissions } from "@/hooks/use-current-permissions";
import { Link } from "@/i18n/navigation";
import { dayActions, isClosedDay, visibleDayActions } from "@/lib/tasks/detail/day-actions";
import { formatDayLong, formatHm, instant } from "@/lib/tasks/detail/day-time";
import { supervisorLabel } from "@/lib/tasks/detail/day-view";
import { canonicalTaskStatus } from "@/lib/tasks/status-vocab";
import type { TaskComplaintDto, TaskItemDto } from "@/lib/types/task.types";

/**
 * The selected day: title, buttons (`dayActions`, one solid primary at most),
 * timeline, alert, supervisor + summary, workers.
 */
export function DayPanel({
  task,
  complaint,
  now,
  locale,
  todayKey,
  onModal,
}: {
  task: TaskItemDto;
  complaint: TaskComplaintDto | null;
  now: number;
  locale: string;
  todayKey: string;
  onModal: (m: Exclude<DetailModal, null>) => void;
}) {
  const t = useTranslations("tasks.detail");
  const tTasks = useTranslations("tasks");
  const state = canonicalTaskStatus(task.status);
  const { permissions } = useCurrentPermissions();
  // Filtered to what this admin holds; an unknown grant set (null) hides all (fail closed).
  const actions = visibleDayActions(dayActions(task), (p) => permissions?.has(p) ?? false);
  const start = instant(task.scheduledAt);
  const end = instant(task.deadline);
  const count = task.requiredWorkerCount;
  const windowLine =
    start === null
      ? null
      : end === null
        ? t("dayWindowOpen", { start: formatHm(start, locale), count })
        : t("dayWindow", { start: formatHm(start, locale), end: formatHm(end, locale), count });
  const title = `${formatDayLong(task.scheduledDate, locale)}${task.scheduledDate === todayKey ? ` · ${t("today")}` : ""}`;

  const openDay = state === "pending" || state === "checkedIn";
  const sup = supervisorLabel(task);
  const supervisorText =
    sup.kind === "name"
      ? sup.text
      : sup.kind === "notYet"
        ? t("supervisorNotYet")
        : sup.kind === "dash"
          ? "–"
          : t("supervisorNone");
  const summary = task.workSummary?.trim();
  const summaryText = summary || (openDay ? t("summaryLater") : state === "cancelled" ? "–" : t("summaryNone"));

  return (
    <Card className="gap-5 px-5 py-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-xl font-bold tracking-tight">{title}</h2>
            <DayStateChip task={task} />
          </div>
          {windowLine ? <span className="text-[13px] text-muted-foreground">{windowLine}</span> : null}
        </div>
        <div className="flex flex-wrap gap-2 md:justify-end">
          {actions.includes("supervisor") ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => onModal({ type: "supervisor", task })}
            >
              <ShieldCheck className="size-3.5" />
              {tTasks("supervisor.submit")}
            </Button>
          ) : null}
          {actions.includes("forceClose") ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-destructive"
              onClick={() => onModal({ type: "forceClose", task })}
            >
              <LockKeyhole className="size-3.5" />
              {tTasks("forceClose.action")}
            </Button>
          ) : null}
          {actions.includes("assign") ? (
            <Button size="sm" className="gap-1.5" onClick={() => onModal({ type: "assign", taskId: task.id })}>
              <UserPlus className="size-3.5" />
              {tTasks("actions.assign")}
            </Button>
          ) : null}
          {actions.includes("openComplaint") ? (
            <Button
              size="sm"
              nativeButton={false}
              className="gap-1.5"
              render={<Link href={`/dashboard/complaints/${task.id}`} />}
            >
              <MessageSquareWarning className="size-3.5" />
              {tTasks("actions.viewComplaint")}
            </Button>
          ) : null}
          {actions.includes("rateTeam") ? (
            <Button size="sm" className="gap-1.5" onClick={() => onModal({ type: "rateTeam", task })}>
              <Star className="size-3.5" />
              {tTasks("rateTeam.action")}
            </Button>
          ) : null}
          {actions.length === 0 && isClosedDay(task) ? (
            <span className="flex h-8 items-center text-xs text-muted-foreground">{t("noActions")}</span>
          ) : null}
        </div>
      </div>

      <DayTimeline task={task} complaint={complaint} locale={locale} />
      <DayAlertBox task={task} complaint={complaint} now={now} locale={locale} />

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-1 rounded-xl bg-muted/40 p-3 ring-1 ring-inset ring-border">
          <span className="overline-label text-muted-foreground">{t("supervisor")}</span>
          <span className="text-sm font-semibold">{supervisorText}</span>
          <span className="text-[11px] text-muted-foreground">{t("supervisorSub")}</span>
        </div>
        <div className="flex flex-col gap-1 rounded-xl bg-muted/40 p-3 ring-1 ring-inset ring-border">
          <span className="overline-label text-muted-foreground">{t("summary")}</span>
          <span
            className={
              summary ? "text-[13px] leading-relaxed whitespace-pre-wrap" : "text-[13px] text-muted-foreground"
            }
          >
            {summaryText}
          </span>
        </div>
      </div>

      <DayWorkers
        task={task}
        now={now}
        locale={locale}
        onAssign={() => onModal({ type: "assign", taskId: task.id })}
        onRate={(tw) => onModal({ type: "rate", taskId: task.id, tw })}
        onOutcome={(tw) => onModal({ type: "outcome", task, tw })}
        onUnassign={(tw) => onModal({ type: "unassign", taskId: task.id, tw })}
      />
    </Card>
  );
}
