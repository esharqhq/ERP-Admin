"use client";

import { Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAssignWorker } from "@/hooks/use-tasks";
import { classifyAssignError } from "@/lib/tasks/assign-errors";
import { propertyTint } from "@/lib/ui/property-color";
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
      {/*
        288px, matched to the design's popover — this is the one deliberate
        deviation from the design's floating popover (a Dialog, not something
        anchored to a scrolling grid cell — see the module doc comment above),
        so the popover's own width is the one dimension worth carrying over
        exactly. `p-0`/`gap-0` because every section below manages its own
        padding; the shell contributes only the frame.
      */}
      <DialogContent className="w-[288px] gap-0 rounded-[14px] p-0 shadow-[0_0_0_1px_rgba(15,42,32,0.10),0_18px_40px_rgba(7,35,24,0.20)] ring-0">
        <DialogHeader className="gap-1 border-b border-[#F1F4F6] px-3 pt-3 pb-2">
          <DialogTitle className="text-[17px] font-bold tracking-[-0.01em]">
            {target
              ? tSheet("title", {
                  name: (target.worker.fullName ?? "").split(" ")[0] || "—",
                  day: dayLabel(target.dayKey, locale),
                })
              : ""}
          </DialogTitle>
          <DialogDescription className="font-mono text-[9.5px] text-muted-foreground">
            {target ? tSheet("subtitle", { count: target.candidates.length }) : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[320px] overflow-y-auto">
          {target?.candidates.map((c) => {
            const tint = propertyTint(c.propertyName || c.taskId);
            // The design's own fraction badge reads "how eligible is this job"
            // (its `ok`/`why` pair — nothing here can compute that honestly,
            // per OpenTaskCandidate's own doc comment). Adapted to what this
            // data actually carries: how close the task already is to fully
            // staffed, since a task one worker short of done is a different
            // kind of "fits" than one still needing several.
            const almostFull = c.assigned === c.required - 1;
            return (
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
                className="flex w-full items-center gap-2 border-b border-[#F8FAFB] px-3 py-2 text-left outline-none transition-colors last:border-b-0 hover:bg-accent focus-visible:bg-accent disabled:pointer-events-none disabled:opacity-50"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-mono text-[10.5px] font-semibold text-[#0F2A20]">
                    {c.to ? `${c.from}–${c.to}` : c.from}
                  </span>
                  <span className="flex min-w-0 items-center gap-1 overflow-hidden">
                    <span
                      className="flex h-[15px] flex-none items-center gap-1 rounded-[5px] px-[5px] text-[9px] font-bold"
                      style={{ background: tint.bg, color: tint.fg }}
                    >
                      <span
                        aria-hidden
                        className="size-[5px] flex-none rounded-full"
                        style={{ background: tint.dot }}
                      />
                      <span className="max-w-[90px] truncate">{c.propertyName || "—"}</span>
                    </span>
                    {c.taskTitle && (
                      <span className="min-w-0 flex-1 truncate text-[9.5px] text-[#94A3B8]">
                        {c.taskTitle}
                      </span>
                    )}
                  </span>
                </span>
                <span
                  className="flex h-[17px] flex-none items-center rounded-[5px] px-[5px] font-mono text-[9.5px] font-bold"
                  style={{
                    background: almostFull ? "#FEF6E7" : "#F1F4F6",
                    color: almostFull ? "#9A5E00" : "#5B6B63",
                  }}
                >
                  {c.assigned}/{c.required}
                </span>
                <span className="flex h-6 flex-none items-center rounded-[8px] bg-[#0F3D2E] px-[9px] text-[10.5px] font-semibold text-white">
                  {t("assign")}
                </span>
              </button>
            );
          })}
        </div>

        {(error || assign.isPending) && (
          <div className="px-3 py-2">
            {error && <p className="text-xs text-destructive">{error}</p>}
            {assign.isPending && (
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                {tSheet("assigning")}
              </span>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
