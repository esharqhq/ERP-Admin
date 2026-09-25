"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { RateWorkerDialog } from "@/components/tasks/rate-worker-dialog";
import { useRateTeam } from "@/hooks/use-tasks";
import { getValidationMessage } from "@/lib/http/api-error";
import { ratingErrorKey, teamRatingTargets } from "@/lib/tasks/team-rating";
import type { TaskItemDto } from "@/lib/types/task.types";

/**
 * One score for the whole team of a day — `PUT /api/tasks/{taskId}/rating`,
 * `task_worker:rate_any`, `task-lifecycle.md` §0c·8 (F-07 ·4). The per-worker
 * star in the table is unchanged; this is the same act at a coarser grain.
 *
 * The dialog names who gets the score (every `Completed` worker), that it
 * replaces each one's current star, and that no-shows and removed workers are
 * left out — the route decides all three, so the admin sees them before saving.
 * No star is pre-selected: the workers' current stars differ.
 *
 * ⚠ **Not atomic.** An error can leave some of the team scored, so every
 * refusal says that saving again is safe — the route overwrites.
 */
export function RateTeamDialog({
  open,
  onClose,
  task,
  groupId,
}: {
  open: boolean;
  onClose: () => void;
  /** A day `canRateTeam` accepted — the caller hides the button otherwise. */
  task: TaskItemDto;
  groupId?: string;
}) {
  const t = useTranslations("tasks.rateTeam");
  const [error, setError] = useState<string | null>(null);
  const rateTeam = useRateTeam(groupId);

  const targets = teamRatingTargets(task);
  const names = targets
    .map((tw) => tw.workerName ?? tw.workerId.slice(0, 8))
    .join(", ");

  function close() {
    setError(null);
    onClose();
  }

  return (
    <RateWorkerDialog
      open={open}
      onClose={close}
      isPending={rateTeam.isPending}
      title={t("title", { date: task.scheduledDate })}
      description={t("description", { count: targets.length })}
      error={error}
      onStarsChange={() => setError(null)}
      onConfirm={(stars) => {
        setError(null);
        rateTeam.mutate(
          {
            taskId: task.id,
            workerIds: targets.map((tw) => tw.workerId),
            body: { stars },
          },
          {
            onSuccess: (rated) => {
              // The response, not the preview, says how many were scored.
              toast.success(t("done", { count: rated.length }));
              close();
            },
            onError: (err) => {
              const key = ratingErrorKey(err);
              setError(
                key
                  ? t(`errors.${key}`)
                  : (getValidationMessage(err) ?? t("errors.generic")),
              );
            },
          },
        );
      }}
    >
      <div className="flex flex-col gap-1.5 text-[13px]">
        <p className="font-medium text-foreground">{names}</p>
        <p className="text-muted-foreground">{t("note")}</p>
      </div>
    </RateWorkerDialog>
  );
}
