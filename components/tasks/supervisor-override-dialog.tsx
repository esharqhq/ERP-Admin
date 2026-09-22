"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSetTaskSupervisor } from "@/hooks/use-tasks";
import { getApiErrorCode, getValidationMessage } from "@/lib/http/api-error";
import { canonicalTaskStatus } from "@/lib/tasks/status-vocab";
import { normalizeStatus } from "@/lib/types/task.types";
import type { TaskItemDto } from "@/lib/types/task.types";

/**
 * Put an admin in charge of a day nobody can hand in —
 * `PUT /api/tasks/{taskId}/supervisor`, `task:supervisor_override_any`.
 *
 * ⚠⚠ **This is not an optimisation, and must not be worded as one.** The role
 * moves automatically one hour after the work day ends — but only to the
 * best-rated *other* worker **who checked in**. On a day where only one person
 * ever arrived, or where the supervisor is the only attendee, the hand-over does
 * **nothing at all** and the day stays unsubmitted for ever. An admin is the only
 * route out. (`task-lifecycle.md` §0c·2.)
 *
 * ⚠ **Only the day's own roster is offered.** `400 worker_not_on_day` refuses an
 * outsider, and rightly — an override onto somebody not booked would produce a
 * day nobody can hand in, which is the problem this door exists to solve.
 */
export function SupervisorOverrideDialog({
  open,
  onClose,
  task,
  groupId,
}: {
  open: boolean;
  onClose: () => void;
  task: TaskItemDto;
  groupId?: string;
}) {
  const t = useTranslations("tasks.supervisor");
  const tCommon = useTranslations("common");

  const [workerId, setWorkerId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const override = useSetTaskSupervisor(groupId);

  // Only workers who still hold a slot. A vacated row is not "on the day".
  const roster = (task.workers ?? []).filter(
    (w) => !["removed", "cancelled"].includes(normalizeStatus(w.outcome)),
  );
  const items = roster.map((w) => ({
    value: w.workerId,
    label: w.workerName ?? w.workerId,
  }));

  function close() {
    setWorkerId("");
    setError(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("why")}</DialogDescription>
        </DialogHeader>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-foreground/80">
            {t("worker")}
            <span aria-hidden className="text-destructive">
              {" *"}
            </span>
          </span>
          <Select
            items={items}
            value={workerId}
            onValueChange={(v) => setWorkerId(v ?? "")}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("workerPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {items.map((i) => (
                <SelectItem key={i.value} value={i.value}>
                  {i.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {items.length === 0 ? (
            <span className="text-[11px] text-muted-foreground">
              {t("noRoster")}
            </span>
          ) : null}
        </label>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={override.isPending}>
            {tCommon("cancel")}
          </Button>
          <Button
            onClick={() => {
              setError(null);
              override.mutate(
                { taskId: task.id, workerId },
                {
                  onSuccess: close,
                  onError: (err) => setError(supervisorErrorText(err, t)),
                },
              );
            }}
            disabled={override.isPending || !workerId}
          >
            {override.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * ⚠ Two shapes, not one. A refusal from the action carries `{error: "<code>"}`;
 * a request rejected by model binding — including one sent with no body — answers
 * ASP.NET problem-details with **no `error` key at all**, so a handler reading
 * only `.error` would show the user nothing.
 */
function supervisorErrorText(
  err: unknown,
  t: (key: string) => string,
): string {
  const code = getApiErrorCode(err);
  if (code === "worker_not_on_day") return t("errors.worker_not_on_day");
  if (code === "supervisor_change_not_allowed")
    return t("errors.supervisor_change_not_allowed");
  if (code === "task_not_found") return t("errors.task_not_found");
  return getValidationMessage(err) ?? t("errors.generic");
}

/**
 * Whether the override can still be offered.
 *
 * ⚠ F-07 ·3 (2026-09-21): once a day is `DONE` or `CANCELLED` all three
 * supervisor-move routes answer `400 supervisor_change_not_allowed`. They used
 * to succeed. The role only means something while the day is open; afterwards it
 * is the record of who filed it — so the control is hidden rather than left to
 * fail. The refusal is still handled above, because a day can settle between
 * render and click.
 */
export function canOverrideSupervisor(task: TaskItemDto): boolean {
  const state = canonicalTaskStatus(task.status);
  return state !== "done" && state !== "cancelled";
}
