// components/walk-in/walk-in-order-sheet.tsx
"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Can } from "@/components/auth/can";
import { AssignWorkerDialog } from "@/components/tasks/assign-worker-dialog";
import { ConfirmDialog } from "@/components/tasks/confirm-dialog";
import { TaskStatusBadge } from "@/components/tasks/task-status-badge";
import {
  useAssignWorker,
  useCancelTaskGroup,
  useUnassignWorker,
} from "@/hooks/use-tasks";
import { activeWorkers, isOpen } from "@/lib/tasks/staffing";
import { classifyAssignError } from "@/lib/tasks/assign-errors";
import type { TaskGroupDto, TaskItemDto, TaskWorkerDto } from "@/lib/types/task.types";

type Modal =
  | { type: "assign"; taskId: string }
  | { type: "unassign"; taskId: string; worker: TaskWorkerDto }
  | { type: "cancelGroup" }
  | null;

/** `"09:00:00"` → `"09:00"`. The wire carries seconds; nobody needs to read them. */
function hhmm(time: string | null): string | null {
  return time ? time.slice(0, 5) : null;
}

/**
 * The detail for one order, over the list.
 *
 * Renders entirely from the `group` handed in — `getAdminTaskGroups` already
 * returns `dates`, `tasks` and `tasks[].workers` nested, so there is no second
 * request. `taskService.getTaskGroup` is deliberately not used: it refetches the
 * whole admin list and `.find()`s it, and its own comment warns that a capped
 * list would 404 a deep link.
 *
 * The parent passes the group looked up **by id out of the live list** on every
 * render, never a held copy — that is what makes an assignment appear here
 * without closing and reopening the sheet.
 */
export function WalkInOrderSheet({
  group,
  onClose,
}: {
  group: TaskGroupDto | null;
  onClose: () => void;
}) {
  const t = useTranslations("walkIn.detail");
  const tOrders = useTranslations("walkIn.orders");
  const tAssign = useTranslations("workers.assignErrors");
  const tOnboarding = useTranslations("onboarding");
  const locale = useLocale();
  const [modal, setModal] = useState<Modal>(null);

  const groupId = group?.id;
  const assign = useAssignWorker(groupId);
  const unassign = useUnassignWorker(groupId);
  const cancelGroup = useCancelTaskGroup();

  function close() {
    setModal(null);
    assign.reset();
    unassign.reset();
    cancelGroup.reset();
    onClose();
  }

  /**
   * `classifyAssignError` decides which namespace this refusal is worded from;
   * this switch does the wording. `workers.assignErrors` holds copy for exactly
   * four codes — the contract-cover refusals live in the shared onboarding
   * catalog, so a lone `tAssign.has(code)` check would render "unknown" for every
   * one of them. Dispatch renders the same kinds from its own namespace.
   */
  const assignError = assign.isError
    ? (() => {
        const kind = classifyAssignError(assign.error);
        switch (kind.kind) {
          case "permission":
            return tOnboarding("permissionDenied");
          case "catalog":
            return tOnboarding(`apiErrors.${kind.labelKey}`);
          case "legacy":
            return tAssign(kind.code as Parameters<typeof tAssign>[0]);
          case "unknown":
            return tAssign("unknown");
        }
      })()
    : null;

  return (
    <Sheet open={!!group} onOpenChange={(open: boolean) => !open && close()}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-lg">
        {group ? (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2 pr-6">
                <span className="truncate">{group.title || tOrders("untitled")}</span>
                <TaskStatusBadge status={group.status} />
              </SheetTitle>
              <SheetDescription>
                {new Date(group.createdAt).toLocaleDateString(locale, {
                  dateStyle: "medium",
                })}
              </SheetDescription>
            </SheetHeader>

            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 px-4 py-3 text-sm">
              <dt className="text-muted-foreground">{t("property")}</dt>
              <dd className="truncate">{group.tasks[0]?.propertyName || "—"}</dd>
              <dt className="text-muted-foreground">{t("startTime")}</dt>
              <dd className="tabular-nums">{hhmm(group.defaultStartTime) ?? "—"}</dd>
              <dt className="text-muted-foreground">{t("deadline")}</dt>
              <dd className="tabular-nums">
                {hhmm(group.defaultDeadline) ?? t("noDeadline")}
              </dd>
              {group.instructions ? (
                <>
                  <dt className="text-muted-foreground">{t("instructions")}</dt>
                  <dd className="whitespace-pre-wrap">{group.instructions}</dd>
                </>
              ) : null}
            </dl>

            <div className="flex flex-col gap-2 px-4 pb-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                {t("jobs")}
              </h3>
              {group.tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noJobs")}</p>
              ) : (
                [...group.tasks]
                  .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
                  .map((task) => (
                    <JobRow
                      key={task.id}
                      task={task}
                      onAssign={() => {
                        assign.reset();
                        setModal({ type: "assign", taskId: task.id });
                      }}
                      onUnassign={(worker) => {
                        unassign.reset();
                        setModal({ type: "unassign", taskId: task.id, worker });
                      }}
                    />
                  ))
              )}
            </div>

            <Can permission="task_group:cancel_any">
              <div className="mt-auto border-t border-border px-4 py-3">
                <Button
                  variant="destructive"
                  onClick={() => {
                    cancelGroup.reset();
                    setModal({ type: "cancelGroup" });
                  }}
                >
                  {t("cancel")}
                </Button>
              </div>
            </Can>

            {modal?.type === "assign" ? (
              <AssignWorkerDialog
                open
                onClose={() => !assign.isPending && setModal(null)}
                isPending={assign.isPending}
                error={assignError}
                onAssign={(workerId: string) =>
                  assign.mutate(
                    { taskId: modal.taskId, workerId },
                    { onSuccess: () => setModal(null) },
                  )
                }
              />
            ) : null}

            {modal?.type === "unassign" ? (
              <ConfirmDialog
                open
                onClose={() => !unassign.isPending && setModal(null)}
                onConfirm={() =>
                  unassign.mutate(
                    { taskId: modal.taskId, workerId: modal.worker.workerId },
                    { onSuccess: () => setModal(null) },
                  )
                }
                isPending={unassign.isPending}
                title={t("unassignTitle")}
                description={t("unassignDescription")}
                confirmLabel={t("unassignConfirm")}
                destructive
                error={unassign.isError ? t("unassignFailed") : null}
              />
            ) : null}

            {/*
              `cancelDescription` states the three partial-cancel rules because the
              route is partially silent: only PENDING children more than an hour
              away are cancelled, ACTIVE/REVIEW survive, and when nothing qualifies
              it returns 204 having changed nothing — with no field saying so. An
              admin who reads 204 as "cancelled" walks away from work still going
              ahead.
            */}
            {modal?.type === "cancelGroup" ? (
              <ConfirmDialog
                open
                onClose={() => !cancelGroup.isPending && setModal(null)}
                onConfirm={() =>
                  cancelGroup.mutate(group.id, { onSuccess: () => setModal(null) })
                }
                isPending={cancelGroup.isPending}
                title={t("cancelTitle")}
                description={t("cancelDescription")}
                confirmLabel={t("cancelConfirm")}
                destructive
                error={cancelGroup.isError ? t("cancelFailed") : null}
              />
            ) : null}
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function JobRow({
  task,
  onAssign,
  onUnassign,
}: {
  task: TaskItemDto;
  onAssign: () => void;
  onUnassign: (worker: TaskWorkerDto) => void;
}) {
  const t = useTranslations("walkIn.detail");
  const staffed = activeWorkers(task);
  // Only open tasks may be staffed from here. The backend has no date or status
  // guard on admin-assign (GT_AdminFillHasNoDateOrStatusGuard) — it would happily
  // staff a finished job — so this is the guard.
  const open = isOpen(task);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] tabular-nums">{task.scheduledDate}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs tabular-nums text-muted-foreground">
            {staffed.length}/{task.requiredWorkerCount}
          </span>
          <TaskStatusBadge status={task.status} />
        </div>
      </div>

      {staffed.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("noWorkers")}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {staffed.map((w) => (
            <li key={w.id} className="flex items-center justify-between gap-2">
              <span className="truncate text-[13px]">{w.workerName || "—"}</span>
              <Can permission="task:unassign_worker_any">
                {open ? (
                  <Button variant="ghost" size="sm" onClick={() => onUnassign(w)}>
                    {t("unassign")}
                  </Button>
                ) : null}
              </Can>
            </li>
          ))}
        </ul>
      )}

      <Can permission="task:assign_worker_any">
        {open && staffed.length < task.requiredWorkerCount ? (
          <Button variant="outline" size="sm" className="self-start" onClick={onAssign}>
            {t("assign")}
          </Button>
        ) : null}
      </Can>
    </div>
  );
}
