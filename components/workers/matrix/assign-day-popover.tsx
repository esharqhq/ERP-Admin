"use client";

import { Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useAssignWorker } from "@/hooks/use-tasks";
import { classifyAssignError } from "@/lib/tasks/assign-errors";
import { propertyTint } from "@/lib/ui/property-color";
import { dayLabel, type DayKey } from "@/lib/ui/week";
import type { OpenTaskCandidate } from "@/lib/workers/matrix";

/**
 * The reverse of `AssignSheet`: given one worker and one free day, pick a job
 * rather than given one job, pick a worker.
 *
 * **Content only.** The anchored shell (`Popover`/`PopoverTrigger`/
 * `PopoverContent`) lives in `MatrixCell`, which owns the trigger and
 * therefore is the one that knows what to anchor to — this component only
 * draws what appears inside it. (Formerly `AssignDaySheet`, a `Dialog`
 * centred on the screen; moved to a cell-anchored popover so an admin never
 * loses which cell they're assigning into.)
 *
 * ⚠ **No eligibility check here either.** `OpenTaskCandidate` already dropped
 * that idea at the data layer — see its own doc comment — so every task the
 * day still wants a worker for is listed, and the real assign call is what
 * actually decides. A refusal renders exactly like it does in `AssignSheet`,
 * through the same `classifyAssignError`.
 */
export function AssignDayPopover({
  workerId,
  workerName,
  date,
  candidates,
  onAssigned,
}: {
  workerId: string;
  workerName: string | null;
  date: DayKey;
  candidates: OpenTaskCandidate[];
  /** Fires once the mutation actually lands — the trigger's own cue to close. */
  onAssigned: () => void;
}) {
  const t = useTranslations("workers.matrix");
  const tPopover = useTranslations("workers.matrix.assignDaySheet");
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
    <div>
      <div className="flex flex-col gap-1 border-b border-[#F1F4F6] px-3 pt-3 pb-2">
        <p className="text-[17px] font-bold tracking-[-0.01em]">
          {tPopover("title", {
            name: (workerName ?? "").split(" ")[0] || "—",
            day: dayLabel(date, locale),
          })}
        </p>
        <p className="font-mono text-[9.5px] text-muted-foreground">
          {tPopover("subtitle", { count: candidates.length })}
        </p>
      </div>

      <div className="max-h-[320px] overflow-y-auto">
        {candidates.map((c) => {
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
                assign.mutate({ taskId: c.taskId, workerId }, { onSuccess: onAssigned })
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
              {tPopover("assigning")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
