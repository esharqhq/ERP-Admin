"use client";

import { useId, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { ChoiceGroup } from "@/components/ui/choice-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useOverrideOutcome } from "@/hooks/use-tasks";
import { getValidationMessage } from "@/lib/http/api-error";
import { outcomeErrorKey } from "@/lib/tasks/outcome-override";
import {
  normalizeStatus,
  type OverrideOutcomeTarget,
  type TaskWorkerDto,
} from "@/lib/types/task.types";

/** Outcome word (lowercased) → `tasks.outcomeDialog.values.*`. */
const VALUE_KEY: Record<string, string> = {
  pending: "pending",
  completed: "completed",
  noshow: "noShow",
  removed: "removed",
  cancelled: "cancelled",
};

/**
 * Change one worker's result on one day — `PATCH …/workers/{workerId}/outcome`,
 * `task_worker:mark_outcome_any`.
 *
 * ⚠ `choices` comes from `outcomeChoices` (lib/tasks/outcome-override.ts), never
 * from the full outcome vocabulary: since `task-lifecycle.md` §0j (2026-09-25)
 * the route refuses `Cancelled` on every day and anything but `Removed` on a day
 * that has not started. Offering the whole list is what this dialog used to do.
 *
 * Nothing is pre-selected when there is a real choice. The old default was the
 * worker's current result, or `Pending` — a value the server has always refused.
 * With one option (a not-started day) the destructive confirm is the decision,
 * so the option starts selected rather than asking for the same click twice.
 *
 * ⚠ **A per-day `Removed` counts against the worker's rating** (§0j·1), and on a
 * not-started day that is the only thing this dialog can do, so it says so before
 * the confirm. Nothing is claimed about the Unassign button beside it: the guide
 * does not say whether its route affects the rating.
 */
export function OutcomeDialog({
  open,
  onClose,
  taskId,
  worker,
  choices,
  groupId,
}: {
  open: boolean;
  onClose: () => void;
  taskId: string;
  worker: TaskWorkerDto;
  /** Non-empty — the caller hides the button when there is nothing to offer. */
  choices: OverrideOutcomeTarget[];
  groupId?: string;
}) {
  const t = useTranslations("tasks.outcomeDialog");
  const tCommon = useTranslations("common");
  const labelId = useId();
  const only = choices.length === 1 ? choices[0] : null;
  const [choice, setChoice] = useState<OverrideOutcomeTarget | null>(only);
  const [error, setError] = useState<string | null>(null);
  const override = useOverrideOutcome(groupId);

  const name = worker.workerName ?? worker.workerId.slice(0, 8);
  const notStarted = choices.length === 1 && choices[0] === "Removed";
  const valueLabel = (outcome: string) => {
    const key = VALUE_KEY[normalizeStatus(outcome)];
    return key ? t(`values.${key}`) : outcome || "—";
  };

  function close() {
    setChoice(only);
    setError(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{notStarted ? t("titleRemove") : t("title")}</DialogTitle>
          <DialogDescription>
            {t("current", { name, outcome: valueLabel(worker.outcome) })}
          </DialogDescription>
        </DialogHeader>

        {notStarted ? (
          <div className="flex gap-2.5 rounded-md bg-status-pending-tint p-3 ring-1 ring-inset ring-status-pending-deep/25">
            <AlertTriangle
              className="mt-0.5 size-4 shrink-0 text-status-pending-deep"
              aria-hidden
            />
            <p className="text-[13px] leading-snug text-foreground/80">
              {t("removeWarning", { name })}
            </p>
          </div>
        ) : (
          <p className="text-[13px] text-muted-foreground">{t("ratingNote")}</p>
        )}

        <div className="flex flex-col gap-1.5">
          <span id={labelId} className="text-[12px] font-medium text-foreground/80">
            {t("newResult")}
          </span>
          <ChoiceGroup
            aria-labelledby={labelId}
            value={choice}
            onValueChange={(v) => {
              setChoice(v);
              setError(null);
            }}
            options={choices.map((c) => ({ value: c, label: valueLabel(c) }))}
            disabled={override.isPending}
          />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={override.isPending}>
            {tCommon("cancel")}
          </Button>
          <Button
            variant={notStarted ? "destructive" : "default"}
            disabled={override.isPending || choice === null}
            onClick={() => {
              if (!choice) return;
              setError(null);
              override.mutate(
                { taskId, workerId: worker.workerId, body: { outcome: choice } },
                {
                  onSuccess: close,
                  onError: (err) => {
                    const key = outcomeErrorKey(err);
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
            {override.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {notStarted ? t("submitRemove") : tCommon("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
