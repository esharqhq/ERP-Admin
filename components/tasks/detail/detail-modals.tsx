"use client";

import { useTranslations } from "next-intl";
import { AssignWorkerDialog } from "@/components/tasks/assign-worker-dialog";
import { CloneOrderDialog } from "@/components/tasks/clone-order-dialog";
import { ConfirmDialog } from "@/components/tasks/confirm-dialog";
import { ForceCloseDialog } from "@/components/tasks/force-close-dialog";
import { toastGroupCancel } from "@/components/tasks/group-cancel-toast";
import { OutcomeDialog } from "@/components/tasks/outcome-dialog";
import { RateTeamDialog } from "@/components/tasks/rate-team-dialog";
import { RateWorkerDialog } from "@/components/tasks/rate-worker-dialog";
import { SupervisorOverrideDialog } from "@/components/tasks/supervisor-override-dialog";
import { useAssignWorker, useCancelTaskGroup, useRateWorker, useUnassignWorker } from "@/hooks/use-tasks";
import { getValidationMessage } from "@/lib/http/api-error";
import { outcomeChoices } from "@/lib/tasks/outcome-override";
import { ratingErrorKey } from "@/lib/tasks/team-rating";
import type { TaskGroupDto, TaskItemDto, TaskWorkerDto } from "@/lib/types/task.types";

export type DetailModal =
  | { type: "cancelGroup" }
  | { type: "clone" }
  | { type: "assign"; taskId: string }
  | { type: "supervisor"; task: TaskItemDto }
  | { type: "forceClose"; task: TaskItemDto }
  | { type: "rateTeam"; task: TaskItemDto }
  | { type: "rate"; taskId: string; tw: TaskWorkerDto }
  | { type: "outcome"; task: TaskItemDto; tw: TaskWorkerDto }
  | { type: "unassign"; taskId: string; tw: TaskWorkerDto }
  | null;

/**
 * The booking page's dialogs, moved out of the page as they were. Conditionally
 * mounted, so each open starts with fresh state.
 */
export function DetailModals({
  modal,
  group,
  groupId,
  sourceIsWalkIn,
  now,
  onClose,
}: {
  modal: DetailModal;
  group: TaskGroupDto;
  groupId: string;
  sourceIsWalkIn: boolean | null;
  /** The page's live clock — the same one the row's change-outcome icon reads. */
  now: number;
  onClose: () => void;
}) {
  const t = useTranslations("tasks");
  const cancelGroup = useCancelTaskGroup();
  const assignWorker = useAssignWorker(groupId);
  const unassignWorker = useUnassignWorker(groupId);
  const rateWorker = useRateWorker(groupId);

  const close = () => {
    // The per-worker star keeps its last refusal in the mutation; without a
    // reset it would greet the next worker's dialog. Only an error is reset — a
    // reset mid-flight would drop the pending call's own callbacks.
    if (rateWorker.isError) rateWorker.reset();
    onClose();
  };
  const rateWorkerError = (err: unknown): string | null => {
    if (!err) return null;
    const key = ratingErrorKey(err);
    return key ? t(`rateErrors.${key}`) : (getValidationMessage(err) ?? t("rateErrors.generic"));
  };
  const name = (tw: TaskWorkerDto) => tw.workerName ?? tw.workerId.slice(0, 8);

  if (!modal) return null;
  switch (modal.type) {
    case "supervisor":
      return <SupervisorOverrideDialog open onClose={close} task={modal.task} groupId={groupId} />;
    case "forceClose":
      return <ForceCloseDialog open onClose={close} task={modal.task} groupId={groupId} />;
    case "cancelGroup":
      return (
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
              { id: groupId, before: group.days },
              {
                onSuccess: (outcome) => {
                  toastGroupCancel(outcome, t);
                  close();
                },
              },
            )
          }
        />
      );
    case "clone":
      return sourceIsWalkIn === null ? null : (
        <CloneOrderDialog open onClose={close} source={group} isWalkIn={sourceIsWalkIn} />
      );
    case "assign":
      return (
        <AssignWorkerDialog
          open
          onClose={close}
          isPending={assignWorker.isPending}
          onAssign={(workerId) => assignWorker.mutate({ taskId: modal.taskId, workerId }, { onSuccess: close })}
        />
      );
    case "rateTeam":
      return <RateTeamDialog open onClose={close} task={modal.task} groupId={groupId} />;
    case "rate":
      return (
        <RateWorkerDialog
          open
          onClose={close}
          isPending={rateWorker.isPending}
          workerName={name(modal.tw)}
          initial={modal.tw.starRating}
          error={rateWorkerError(rateWorker.error)}
          onStarsChange={() => {
            if (rateWorker.isError) rateWorker.reset();
          }}
          onConfirm={(stars) =>
            rateWorker.mutate(
              { taskId: modal.taskId, workerId: modal.tw.workerId, body: { stars } },
              { onSuccess: close },
            )
          }
        />
      );
    case "outcome":
      return (
        <OutcomeDialog
          open
          onClose={close}
          taskId={modal.task.id}
          worker={modal.tw}
          choices={outcomeChoices(modal.task, modal.tw.outcome, now)}
          groupId={groupId}
        />
      );
    case "unassign":
      return (
        <ConfirmDialog
          open
          onClose={close}
          isPending={unassignWorker.isPending}
          title={t("actions.unassignTitle")}
          description={t("actions.unassignConfirm", { name: name(modal.tw) })}
          confirmLabel={t("actions.unassign")}
          destructive
          onConfirm={() =>
            unassignWorker.mutate(
              { taskId: modal.taskId, workerId: modal.tw.workerId },
              { onSuccess: close },
            )
          }
        />
      );
  }
}
