"use client";

import { Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAssignWorker } from "@/hooks/use-tasks";
import { classifyAssignError } from "@/lib/tasks/assign-errors";
import type { WorkerRowDto } from "@/lib/types/worker.types";
import { dayLabel, type DayKey } from "@/lib/ui/week";
import type { OpenTaskCandidate } from "@/lib/workers/matrix";

/** What a free-day "+ Assign" tile opened: whose day, which day, which jobs. */
export interface AssignDayTarget {
  worker: WorkerRowDto;
  dayKey: DayKey;
  candidates: OpenTaskCandidate[];
}

/**
 * The reverse of `AssignSheet`: given one worker and one free day, pick a job
 * rather than given one job, pick a worker.
 *
 * ⚠ **No eligibility check here either.** `OpenTaskCandidate` already dropped
 * that idea at the data layer — see its own doc comment — so every task the
 * day still wants a worker for is listed, and the real assign call is what
 * actually decides. A refusal renders exactly like it does in `AssignSheet`,
 * through the same `classifyAssignError`.
 */
export function AssignDaySheet({
  target,
  onClose,
}: {
  /** The free-day tile that opened this, or `null` when closed. */
  target: AssignDayTarget | null;
  onClose: () => void;
}) {
  const t = useTranslations("workers.matrix");
  const tSheet = useTranslations("workers.matrix.assignDaySheet");
  const tOnboarding = useTranslations("onboarding");
  const tWorkers = useTranslations("workers");
  const locale = useLocale();

  // No fixed groupId: candidates can span several task groups, and the broad
  // invalidation `useAssignWorker` already runs on success covers the grid.
  const assign = useAssignWorker();

  const error = assign.isError
    ? (() => {
        const verdict = classifyAssignError(assign.error);
        if (verdict.kind === "permission") return tOnboarding("permissionDenied");
        if (verdict.kind === "catalog") {
          return tOnboarding(`apiErrors.${verdict.labelKey}` as "apiErrors.unknown");
        }
        if (verdict.kind === "legacy") {
          return tWorkers(
            `assignErrors.${verdict.code}` as "assignErrors.worker_limit_reached",
          );
        }
        return tWorkers("assignErrors.unknown");
      })()
    : null;

  return (
    <Dialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open && !assign.isPending) {
          assign.reset();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {target
              ? tSheet("title", {
                  name: (target.worker.fullName ?? "").split(" ")[0] || "—",
                  day: dayLabel(target.dayKey, locale),
                })
              : ""}
          </DialogTitle>
          <DialogDescription>
            {target ? tSheet("subtitle", { count: target.candidates.length }) : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[320px] overflow-y-auto rounded-lg border border-border">
          {target?.candidates.map((c) => (
            <button
              key={c.taskId}
              type="button"
              disabled={assign.isPending}
              onClick={() =>
                assign.mutate(
                  { taskId: c.taskId, workerId: target.worker.id },
                  { onSuccess: onClose },
                )
              }
              className="flex w-full items-center gap-3 border-b border-border px-3 py-2.5 text-left outline-none transition-colors last:border-b-0 hover:bg-accent focus-visible:bg-accent disabled:pointer-events-none disabled:opacity-50"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-mono text-xs font-semibold">
                  {c.to ? `${c.from}–${c.to}` : c.from}
                </span>
                <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="min-w-0 truncate">{c.propertyName || "—"}</span>
                  {c.taskTitle && (
                    <>
                      <span aria-hidden>·</span>
                      <span className="min-w-0 truncate">{c.taskTitle}</span>
                    </>
                  )}
                </span>
              </span>
              <span className="flex-none rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-bold text-muted-foreground">
                {c.assigned}/{c.required}
              </span>
              <span className="flex-none text-xs font-semibold text-primary">
                {t("assign")}
              </span>
            </button>
          ))}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={assign.isPending}>
            {tSheet("cancel")}
          </Button>
          {assign.isPending && (
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {tSheet("assigning")}
            </span>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
