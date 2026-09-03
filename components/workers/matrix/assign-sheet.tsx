"use client";

import { useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAssignWorker } from "@/hooks/use-tasks";
import { classifyAssignError } from "@/lib/tasks/assign-errors";
import type { TaskGroupDto } from "@/lib/types/task.types";
import { normalizeStatus } from "@/lib/types/task.types";
import type { WorkerRowDto } from "@/lib/types/worker.types";
import { initials } from "@/lib/ui/initials";
import type { MatrixChip } from "@/lib/workers/matrix";
import { cn } from "@/lib/utils";

/**
 * Filling a short-staffed task — **the one write path the Matrix keeps from the
 * Calendar it replaces**.
 *
 * ⚠ **The refusal set is named here, not in the cell.** Five different things can
 * refuse an assignment (rating floor, profession not eligible, worker limit
 * reached, an overlapping assignment, and a contract that ends before the task),
 * and none of them can be evaluated until a worker is chosen — so a cell could
 * only ever say "this might fail". `classifyAssignError` is shared with Dispatch
 * and Walk-In precisely so the same refusal is worded the same way everywhere;
 * this sheet renders its verdict, it does not re-decide it.
 */
export function AssignSheet({
  chip,
  groups,
  workers,
  onClose,
}: {
  /** The short-staffed chip that opened this, or `null` when closed. */
  chip: MatrixChip | null;
  groups: TaskGroupDto[];
  /** The page's workers — the same filtered set the grid is drawing. */
  workers: WorkerRowDto[];
  onClose: () => void;
}) {
  const t = useTranslations("workers.matrix.assignSheet");
  const tOnboarding = useTranslations("onboarding");
  const tWorkers = useTranslations("workers");
  const [search, setSearch] = useState("");

  const assign = useAssignWorker(chip?.groupId);

  /**
   * Who is already on this task.
   *
   * Offering somebody already assigned would produce `worker_limit_reached` or a
   * silent no-op, so they are filtered out rather than refused after the click.
   */
  const alreadyOn = useMemo(() => {
    const task = groups
      .flatMap((g) => g.tasks ?? [])
      .find((task) => task.id === chip?.taskId);
    return new Set(
      (task?.workers ?? [])
        .filter((w) => !["removed", "cancelled", "noshow"].includes(normalizeStatus(w.outcome)))
        .map((w) => w.workerId),
    );
  }, [groups, chip?.taskId]);

  const candidates = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return workers
      .filter((w) => !alreadyOn.has(w.id))
      .filter((w) =>
        needle
          ? (w.fullName ?? "").toLowerCase().includes(needle) ||
            (w.email ?? "").toLowerCase().includes(needle)
          : true,
      );
  }, [workers, alreadyOn, search]);

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
      open={chip !== null}
      onOpenChange={(open) => {
        if (!open && !assign.isPending) {
          assign.reset();
          setSearch("");
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {chip
              ? t("subtitle", {
                  property: chip.propertyName || "—",
                  window: chip.to ? `${chip.from}–${chip.to}` : chip.from,
                  assigned: chip.staffing?.assigned ?? 0,
                  required: chip.staffing?.required ?? 1,
                })
              : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("search")}
            aria-label={t("search")}
            className="h-9 rounded-lg pl-9"
          />
        </div>

        <div className="max-h-[320px] overflow-y-auto rounded-lg border border-border">
          {candidates.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              {/* The page's own filters narrow this list, so an empty one is
                  usually the filters rather than an empty directory. */}
              {t("noCandidates")}
            </p>
          ) : (
            candidates.map((w) => (
              <button
                key={w.id}
                type="button"
                disabled={assign.isPending}
                onClick={() =>
                  chip &&
                  assign.mutate(
                    { taskId: chip.taskId, workerId: w.id },
                    { onSuccess: onClose },
                  )
                }
                className={cn(
                  "flex w-full items-center gap-3 border-b border-border px-3 py-2.5 text-left last:border-b-0",
                  "outline-none transition-colors hover:bg-accent focus-visible:bg-accent",
                  "disabled:pointer-events-none disabled:opacity-50",
                )}
              >
                <Avatar className="size-8 shrink-0">
                  <AvatarFallback className="bg-accent text-xs font-semibold text-primary">
                    {initials(w.fullName)}
                  </AvatarFallback>
                </Avatar>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">
                    {w.fullName || "—"}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {[w.city, w.skills?.join(", ")].filter(Boolean).join(" · ") || "—"}
                  </span>
                </span>
                {/*
                  ⚠ Drawn, never enforced. Nothing in the API compares a schedule
                  or a rating against a task at assign time except the server's own
                  five refusals — so this is context for the admin's judgement, not
                  a gate this sheet applies.
                */}
                {w.rating > 0 && (
                  <span className="flex-none font-mono text-xs tabular-nums text-muted-foreground">
                    {w.rating.toFixed(1)}
                  </span>
                )}
              </button>
            ))
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={assign.isPending}>
            {t("cancel")}
          </Button>
          {assign.isPending && (
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {t("assigning")}
            </span>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
