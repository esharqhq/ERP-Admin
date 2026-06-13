"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Star, UserPlus, UserMinus, RefreshCw } from "lucide-react";
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
import { AssignWorkerDialog } from "@/components/tasks/assign-worker-dialog";
import { RateWorkerDialog } from "@/components/tasks/rate-worker-dialog";
import { OutcomeDialog } from "@/components/tasks/outcome-dialog";
import { TaskStatusBadge } from "@/components/tasks/task-status-badge";
import {
  useTaskGroup,
  useCancelTaskGroup,
  useAssignWorker,
  useUnassignWorker,
  useRateWorker,
  useOverrideOutcome,
} from "@/hooks/use-tasks";
import {
  normalizeStatus,
  type TaskItemDto,
  type TaskWorkerDto,
} from "@/lib/types/task.types";

interface TaskActions {
  onAssign: (taskId: string) => void;
  onRate: (taskId: string, tw: TaskWorkerDto) => void;
  onOutcome: (taskId: string, tw: TaskWorkerDto) => void;
  onUnassign: (taskId: string, tw: TaskWorkerDto) => void;
}

type ModalState =
  | { type: "cancelGroup" }
  | { type: "assign"; taskId: string }
  | { type: "rate"; taskId: string; tw: TaskWorkerDto }
  | { type: "outcome"; taskId: string; tw: TaskWorkerDto }
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
                <Can permission="task_worker:mark_outcome_any">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title={t("actions.outcome")}
                    onClick={() => actions.onOutcome(task.id, tw)}
                  >
                    <RefreshCw className="size-4" />
                  </Button>
                </Can>
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
  const terminal =
    normalizeStatus(task.status) === "cancelled" ||
    normalizeStatus(task.status) === "done";
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
          {!terminal && (
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
        </div>
      </CardHeader>
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
  const overrideOutcome = useOverrideOutcome(id);

  const close = () => setModal(null);
  const actions: TaskActions = {
    onAssign: (taskId) => setModal({ type: "assign", taskId }),
    onRate: (taskId, tw) => setModal({ type: "rate", taskId, tw }),
    onOutcome: (taskId, tw) => setModal({ type: "outcome", taskId, tw }),
    onUnassign: (taskId, tw) => setModal({ type: "unassign", taskId, tw }),
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
  const groupStatus = normalizeStatus(group.status);
  const groupCancellable = groupStatus === "pending" || groupStatus === "active";

  return (
    <div className="flex flex-col gap-6">
      {backBar}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">
            {group.title ?? "—"}
          </h1>
          <TaskStatusBadge status={group.status} />
        </div>
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
            cancelGroup.mutate(id, { onSuccess: close })
          }
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
          isPending={overrideOutcome.isPending}
          workerName={modal.tw.workerName ?? modal.tw.workerId.slice(0, 8)}
          current={modal.tw.outcome}
          onConfirm={(outcome) =>
            overrideOutcome.mutate(
              {
                taskId: modal.taskId,
                workerId: modal.tw.workerId,
                body: { outcome },
              },
              { onSuccess: close },
            )
          }
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
