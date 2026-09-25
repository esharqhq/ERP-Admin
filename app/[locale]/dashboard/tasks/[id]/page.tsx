"use client";

import { use, useState } from "react";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, Copy, Star, UserPlus, UserMinus, RefreshCw, ShieldCheck, LockKeyhole, MessageSquareWarning } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Can } from "@/components/auth/can";
import { ConfirmDialog } from "@/components/tasks/confirm-dialog";
import { CloneOrderDialog } from "@/components/tasks/clone-order-dialog";
import { AssignWorkerDialog } from "@/components/tasks/assign-worker-dialog";
import { RateWorkerDialog } from "@/components/tasks/rate-worker-dialog";
import { OutcomeDialog } from "@/components/tasks/outcome-dialog";
import { TaskDaysBadge } from "@/components/tasks/task-days-badge";
import { toastGroupCancel } from "@/components/tasks/group-cancel-toast";
import { TaskStatusBadge } from "@/components/tasks/task-status-badge";
import {
  SupervisorOverrideDialog,
  canOverrideSupervisor,
} from "@/components/tasks/supervisor-override-dialog";
import {
  ForceCloseDialog,
  canForceClose,
} from "@/components/tasks/force-close-dialog";
import {
  useTaskGroup,
  useCancelTaskGroup,
  useAssignWorker,
  useUnassignWorker,
  useRateWorker,
} from "@/hooks/use-tasks";
import { useWalkInOwnerId } from "@/hooks/use-owners";
import { isGroupActive } from "@/lib/tasks/staffing";
import { isWalkInSource } from "@/lib/tasks/clone-order";
import { canonicalTaskStatus } from "@/lib/tasks/status-vocab";
import { outcomeChoices } from "@/lib/tasks/outcome-override";
import { useClock } from "@/hooks/use-today";
import {
  normalizeStatus,
  type TaskItemDto,
  type TaskWorkerDto,
} from "@/lib/types/task.types";

/**
 * ⚠ The four known reasons are translated; anything else prints verbatim. The
 * set is not closed — `ClosedReplacement` is forward-declared for ·5 and more
 * may follow — and a word we cannot name is more honest shown than guessed at.
 */
const CLOSURE_REASONS = new Set([
  "OwnerAccepted",
  "AutoAccepted",
  "ClosedForced",
  "ClosedReplacement",
]);

function closureReasonLabel(reason: string, t: (k: string) => string): string {
  return CLOSURE_REASONS.has(reason) ? t(`reasons.${reason}`) : reason;
}

interface TaskActions {
  onAssign: (taskId: string) => void;
  onSupervisor: (task: TaskItemDto) => void;
  onForceClose: (task: TaskItemDto) => void;
  onRate: (taskId: string, tw: TaskWorkerDto) => void;
  onOutcome: (task: TaskItemDto, tw: TaskWorkerDto) => void;
  onUnassign: (taskId: string, tw: TaskWorkerDto) => void;
}

type ModalState =
  | { type: "cancelGroup" }
  | { type: "clone" }
  | { type: "assign"; taskId: string }
  | { type: "supervisor"; task: TaskItemDto }
  | { type: "forceClose"; task: TaskItemDto }
  | { type: "rate"; taskId: string; tw: TaskWorkerDto }
  | { type: "outcome"; task: TaskItemDto; tw: TaskWorkerDto }
  | { type: "unassign"; taskId: string; tw: TaskWorkerDto }
  | null;

function OutcomeBadge({ outcome }: { outcome: string }) {
  const s = normalizeStatus(outcome);
  const variant =
    s === "completed"
      ? "default"
      : s === "noshow" || s === "removed"
        ? "destructive"
        : "outline";
  return <Badge variant={variant}>{outcome || "—"}</Badge>;
}

function fmtDateTime(iso: string | null, locale: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </span>
      <span className="text-sm break-words">{value}</span>
    </div>
  );
}

function WorkersTable({
  task,
  locale,
  actions,
}: {
  task: TaskItemDto;
  locale: string;
  actions: TaskActions;
}) {
  const t = useTranslations("tasks");
  const now = useClock();
  const workers = task.workers ?? [];
  if (workers.length === 0) {
    return (
      <p className="px-4 py-3 text-sm text-muted-foreground">
        {t("detail.noWorkers")}
      </p>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("detail.workerColumns.worker")}</TableHead>
          <TableHead>{t("detail.workerColumns.outcome")}</TableHead>
          <TableHead>{t("detail.workerColumns.rating")}</TableHead>
          <TableHead>{t("detail.workerColumns.checkIn")}</TableHead>
          <TableHead>{t("detail.workerColumns.checkOut")}</TableHead>
          <TableHead className="text-right">
            {t("detail.workerColumns.actions")}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {workers.map((tw) => (
          <TableRow key={tw.id}>
            <TableCell className="font-medium">
              {tw.workerName ?? tw.workerId.slice(0, 8)}
            </TableCell>
            <TableCell>
              <OutcomeBadge outcome={tw.outcome} />
            </TableCell>
            <TableCell className="text-sm">
              {tw.starRating != null ? (
                <span className="inline-flex items-center gap-1">
                  <Star className="size-3.5 fill-amber-400 text-amber-400" />
                  {tw.starRating.toFixed(1)}
                </span>
              ) : (
                "—"
              )}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {fmtDateTime(tw.checkinAt, locale)}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {fmtDateTime(tw.checkoutAt, locale)}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-0.5">
                <Can permission="task_worker:rate_any">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title={t("actions.rate")}
                    onClick={() => actions.onRate(task.id, tw)}
                  >
                    <Star className="size-4" />
                  </Button>
                </Can>
                {/* Hidden where §0j refuses every value — see `outcomeChoices`. */}
                {outcomeChoices(task, tw.outcome, now).length > 0 && (
                  <Can permission="task_worker:mark_outcome_any">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title={t("actions.outcome")}
                      onClick={() => actions.onOutcome(task, tw)}
                    >
                      <RefreshCw className="size-4" />
                    </Button>
                  </Can>
                )}
                <Can permission="task:unassign_worker_any">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title={t("actions.unassign")}
                    className="text-destructive"
                    onClick={() => actions.onUnassign(task.id, tw)}
                  >
                    <UserMinus className="size-4" />
                  </Button>
                </Can>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function TaskCard({
  task,
  locale,
  actions,
}: {
  task: TaskItemDto;
  locale: string;
  actions: TaskActions;
}) {
  const t = useTranslations("tasks");
  const tSup = useTranslations("tasks.supervisor");
  const tClose = useTranslations("tasks.forceClose");
  const state = canonicalTaskStatus(task.status);
  const terminal = state === "cancelled" || state === "done";
  // F-07 ·5: waiting on a ruling, not on staff — so no Assign, and a way to the ruling.
  const disputed = state === "rejected";
  const supervisor = (task.workers ?? []).find(
    (w) => w.workerId === task.supervisorWorkerId,
  );
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
        <div className="flex items-center gap-3">
          <CardTitle className="text-base">{task.scheduledDate}</CardTitle>
          <TaskStatusBadge status={task.status} />
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden gap-4 text-xs text-muted-foreground sm:flex">
            <span>
              {t("detail.taskColumns.started")}:{" "}
              {fmtDateTime(task.startedAt, locale)}
            </span>
            <span>
              {t("detail.taskColumns.completed")}:{" "}
              {fmtDateTime(task.completedAt, locale)}
            </span>
          </div>
          {!terminal && !disputed && (
            <Can permission="task:assign_worker_any">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => actions.onAssign(task.id)}
              >
                <UserPlus className="size-3.5" />
                {t("actions.assign")}
              </Button>
            </Can>
          )}
          {disputed && (
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              className="gap-1.5"
              render={<Link href={`/dashboard/complaints/${task.id}`} />}
            >
              <MessageSquareWarning className="size-3.5" />
              {t("actions.viewComplaint")}
            </Button>
          )}
          {/* ⚠ SUPER_ADMIN only. A MODERATOR gets a bodiless 403 — `Can` hides
              the button rather than letting them meet an error with no code in
              it. An empty-bodied 403 is the permission filter, never onboarding. */}
          {canOverrideSupervisor(task) && (
            <Can permission="task:supervisor_override_any">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => actions.onSupervisor(task)}
              >
                <ShieldCheck className="size-3.5" />
                {tSup("submit")}
              </Button>
            </Can>
          )}
          {canForceClose(task) && (
            <Can permission="task:force_close_any">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-destructive"
                onClick={() => actions.onForceClose(task)}
              >
                <LockKeyhole className="size-3.5" />
                {tClose("action")}
              </Button>
            </Can>
          )}
        </div>
      </CardHeader>
      {/* The two fields F-07 ·4 added to a day, plus ·3's closure reason. The
          summary is what an operator reads before judging a dispute. */}
      <div className="flex flex-col gap-1 px-6 pb-3 text-xs text-muted-foreground">
        <span>
          {tSup("current")}:{" "}
          <span className="text-foreground">
            {supervisor?.workerName ?? task.supervisorWorkerId ?? tSup("none")}
          </span>
        </span>
        <span>
          {tSup("summary")}:{" "}
          <span className="text-foreground">
            {task.workSummary?.trim() || tSup("noSummary")}
          </span>
        </span>
        {/* ⚠ Rendered only when present. `null` does NOT mean "the owner
            accepted it" — it means not closed, or closed before 2026-09-21. */}
        {task.closureReason ? (
          <span>
            {tClose("closedAs")}:{" "}
            <span className="text-foreground">
              {closureReasonLabel(task.closureReason, tClose)}
            </span>
          </span>
        ) : null}
      </div>
      <CardContent className="p-0">
        <WorkersTable task={task} locale={locale} actions={actions} />
      </CardContent>
    </Card>
  );
}



export default function TaskGroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations("tasks");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const { data: group, isLoading, isError } = useTaskGroup(id);

  const [modal, setModal] = useState<ModalState>(null);
  const cancelGroup = useCancelTaskGroup();
  const assignWorker = useAssignWorker(id);
  const unassignWorker = useUnassignWorker(id);
  const rateWorker = useRateWorker(id);
  const clock = useClock();
  // Tells a walk-in order apart for the copy dialog (its city and address).
  // One request per session, shared with the owner and walk-in pages.
  const walkIn = useWalkInOwnerId();

  const close = () => setModal(null);
  const actions: TaskActions = {
    onAssign: (taskId) => setModal({ type: "assign", taskId }),
    onRate: (taskId, tw) => setModal({ type: "rate", taskId, tw }),
    onOutcome: (task, tw) => setModal({ type: "outcome", task, tw }),
    onUnassign: (taskId, tw) => setModal({ type: "unassign", taskId, tw }),
    onSupervisor: (task) => setModal({ type: "supervisor", task }),
    onForceClose: (task) => setModal({ type: "forceClose", task }),
  };

  const backBar = (
    <Button
      variant="ghost"
      size="sm"
      nativeButton={false}
      className="w-fit gap-1.5 text-muted-foreground"
      render={<Link href="/dashboard/tasks" />}
    >
      <ArrowLeft className="size-4" />
      {t("detail.backToList")}
    </Button>
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        {backBar}
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !group) {
    return (
      <div className="flex flex-col gap-6">
        {backBar}
        <p className="text-sm text-destructive">{tCommon("error")}</p>
      </div>
    );
  }

  const sortedTasks = [...(group.tasks ?? [])].sort((a, b) =>
    a.scheduledDate.localeCompare(b.scheduledDate),
  );
  const groupCancellable = isGroupActive(group);
  /**
   * `null` while the walk-in lookup has not answered — and then the copy door
   * is hidden rather than offered as if ordinary: an old walk-in order read as
   * ordinary loses its city field and cannot be copied (`isWalkInSource`).
   */
  const sourceIsWalkIn = isWalkInSource(
    group,
    walkIn.isSuccess ? walkIn.data : undefined,
  );

  return (
    <div className="flex flex-col gap-6">
      {backBar}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">
            {group.title ?? "—"}
          </h1>
          <TaskDaysBadge group={group} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Any state can be copied (F-07 ·10, §0i·2) — a finished or
              cancelled booking is exactly what gets repeated. */}
          {sourceIsWalkIn !== null && (
            <Can permission="task_group:create_any">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setModal({ type: "clone" })}
              >
                <Copy className="size-3.5" />
                {t("clone.action")}
              </Button>
            </Can>
          )}
          {groupCancellable && (
            <Can permission="task_group:cancel_any">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setModal({ type: "cancelGroup" })}
              >
                {t("actions.cancelGroup")}
              </Button>
            </Can>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("detail.infoTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <InfoRow label={t("detail.info.propertyId")} value={group.propertyId} />
          <InfoRow label={t("detail.info.ownerId")} value={group.ownerId} />
          <InfoRow
            label={t("detail.info.startTime")}
            value={(group.defaultStartTime ?? "").slice(0, 5) || "—"}
          />
          <InfoRow
            label={t("detail.info.deadline")}
            value={(group.defaultDeadline ?? "").slice(0, 5) || "—"}
          />
          <InfoRow
            label={t("detail.info.ratingFloor")}
            value={group.ratingFloor}
          />
          <InfoRow
            label={t("detail.info.allowNewWorkers")}
            value={group.allowNewWorkers ? tCommon("yes") : tCommon("no")}
          />
          <InfoRow
            label={t("detail.info.createdAt")}
            value={fmtDateTime(group.createdAt, locale)}
          />
          <InfoRow
            label={t("detail.info.dates")}
            value={(group.dates ?? []).length}
          />
          {group.instructions ? (
            <div className="col-span-2 sm:col-span-3 lg:col-span-4">
              <InfoRow
                label={t("detail.info.instructions")}
                value={group.instructions}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          {t("detail.tasksTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {tCommon("resultsFound", { count: sortedTasks.length })}
        </p>
      </div>

      {sortedTasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("detail.noTasks")}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {sortedTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              locale={locale}
              actions={actions}
            />
          ))}
        </div>
      )}

      {/* ── Action modals (conditionally mounted → fresh state per open) ── */}
      {modal?.type === "supervisor" && (
        <SupervisorOverrideDialog
          open
          onClose={close}
          task={modal.task}
          groupId={id}
        />
      )}

      {modal?.type === "forceClose" && (
        <ForceCloseDialog open onClose={close} task={modal.task} groupId={id} />
      )}

      {modal?.type === "cancelGroup" && (
        <ConfirmDialog
          open
          onClose={close}
          isPending={cancelGroup.isPending}
          title={t("actions.cancelGroupTitle")}
          description={t("actions.cancelGroupConfirm")}
          confirmLabel={t("actions.cancelGroup")}
          destructive
          onConfirm={() =>
            cancelGroup.mutate(
              { id, before: group.days },
              {
                onSuccess: (outcome) => {
                  toastGroupCancel(outcome, t);
                  close();
                },
              },
            )
          }
        />
      )}

      {modal?.type === "clone" && sourceIsWalkIn !== null && (
        <CloneOrderDialog
          open
          onClose={close}
          source={group}
          isWalkIn={sourceIsWalkIn}
        />
      )}

      {modal?.type === "assign" && (
        <AssignWorkerDialog
          open
          onClose={close}
          isPending={assignWorker.isPending}
          onAssign={(workerId) =>
            assignWorker.mutate(
              { taskId: modal.taskId, workerId },
              { onSuccess: close },
            )
          }
        />
      )}

      {modal?.type === "rate" && (
        <RateWorkerDialog
          open
          onClose={close}
          isPending={rateWorker.isPending}
          workerName={modal.tw.workerName ?? modal.tw.workerId.slice(0, 8)}
          initial={modal.tw.starRating}
          onConfirm={(stars) =>
            rateWorker.mutate(
              { taskId: modal.taskId, workerId: modal.tw.workerId, body: { stars } },
              { onSuccess: close },
            )
          }
        />
      )}

      {modal?.type === "outcome" && (
        <OutcomeDialog
          open
          onClose={close}
          taskId={modal.task.id}
          worker={modal.tw}
          choices={outcomeChoices(modal.task, modal.tw.outcome, clock)}
          groupId={id}
        />
      )}

      {modal?.type === "unassign" && (
        <ConfirmDialog
          open
          onClose={close}
          isPending={unassignWorker.isPending}
          title={t("actions.unassignTitle")}
          description={t("actions.unassignConfirm", {
            name: modal.tw.workerName ?? modal.tw.workerId.slice(0, 8),
          })}
          confirmLabel={t("actions.unassign")}
          destructive
          onConfirm={() =>
            unassignWorker.mutate(
              { taskId: modal.taskId, workerId: modal.tw.workerId },
              { onSuccess: close },
            )
          }
        />
      )}
    </div>
  );
}
