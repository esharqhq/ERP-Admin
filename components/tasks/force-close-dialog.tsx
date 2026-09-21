"use client";

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useForceCloseTask } from "@/hooks/use-tasks";
import { getApiErrorCode, getValidationMessage } from "@/lib/http/api-error";
import { canonicalTaskStatus } from "@/lib/tasks/status-vocab";
import type { TaskItemDto } from "@/lib/types/task.types";

const MAX_REASON = 2000;

/**
 * Force a stuck day closed — `POST /api/tasks/{taskId}/force-close`,
 * `task:force_close_any` (110049), SUPER_ADMIN only.
 *
 * ⚠⚠ **The no-show warning below is a contract requirement, not copy polish.**
 * `task-lifecycle.md` §0d says in as many words: *"AN ADMIN SHOULD SEE THIS
 * BEFORE THEY CONFIRM."* Force-closing marks every worker who never checked in
 * as a **no-show, which counts against their rating**. Workers who *did* check in
 * are credited as having completed the day even though nobody submitted for them
 * — that is the point of the door. Both halves are named, and the count of who
 * each applies to is shown, because "some workers may be affected" is not a
 * consequence an admin can weigh.
 *
 * ⚠ `reason` is mandatory and is shown to the workers and the owner in their
 * notification — it is the only record of why the day ended this way.
 */
export function ForceCloseDialog({
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
  const t = useTranslations("tasks.forceClose");
  const tCommon = useTranslations("common");

  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const forceClose = useForceCloseTask(groupId);

  const workers = task.workers ?? [];
  const absent = workers.filter((w) => !w.checkinAt).length;
  const present = workers.length - absent;
  const trimmed = reason.trim();

  function close() {
    setReason("");
    setError(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("what")}</DialogDescription>
        </DialogHeader>

        {/* ⚠ The consequence, before the confirm — see the note on this file. */}
        <div className="flex gap-2.5 rounded-md border border-destructive/30 bg-destructive/5 p-3">
          <AlertTriangle
            className="mt-0.5 size-4 shrink-0 text-destructive"
            aria-hidden
          />
          <div className="flex flex-col gap-1 text-[13px] leading-snug">
            <span className="font-medium text-destructive">
              {t("noShowWarning", { count: absent })}
            </span>
            <span className="text-muted-foreground">
              {t("creditedNote", { count: present })}
            </span>
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-foreground/80">
            {t("reasonLabel")}
            <span aria-hidden className="text-destructive">
              {" *"}
            </span>
          </span>
          <Textarea
            value={reason}
            maxLength={MAX_REASON}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-24 text-sm"
          />
          <span className="text-[11px] text-muted-foreground">
            {t("reasonHint")}
          </span>
        </label>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={forceClose.isPending}>
            {tCommon("cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              setError(null);
              forceClose.mutate(
                { taskId: task.id, reason: trimmed },
                {
                  onSuccess: close,
                  onError: (err) => setError(forceCloseErrorText(err, t)),
                },
              );
            }}
            // ⚠ Blank stays disabled: a whitespace-only reason is trimmed away by
            // `[Required]` before the service runs, so it answers problem-details
            // rather than `reason_required` — a difference never worth meeting.
            disabled={forceClose.isPending || trimmed.length === 0}
          >
            {forceClose.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function forceCloseErrorText(err: unknown, t: (key: string) => string): string {
  const code = getApiErrorCode(err);
  if (code === "task_already_closed") return t("errors.task_already_closed");
  if (code === "reason_required") return t("errors.reason_required");
  if (code === "task_not_found") return t("errors.task_not_found");
  // ⚠ No `error` key on a model-binding refusal — fall back to the validation
  // bag before the generic message, or the admin is told nothing at all.
  return getValidationMessage(err) ?? t("errors.generic");
}

/**
 * The three states the door works from: `PENDING`, `CHECKED_IN`, `IN_REVIEW`.
 * A day already `DONE` or `CANCELLED` answers `400 task_already_closed`, so the
 * control is hidden for those two — the refusal is still handled, because a day
 * can settle between render and click.
 */
export function canForceClose(task: TaskItemDto): boolean {
  const state = canonicalTaskStatus(task.status);
  return state === "pending" || state === "checkedIn" || state === "inReview";
}
