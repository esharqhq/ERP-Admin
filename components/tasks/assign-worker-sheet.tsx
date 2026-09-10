"use client";

import { useMemo, useState } from "react";
import { Briefcase, Check, EyeOff, Loader2, Search, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { StaffingPipMeter } from "@/components/tasks/staffing-pip-meter";
import { useWorkers } from "@/hooks/use-workers";
import {
  CANDIDATE_SORTS,
  candidateQuery,
  filterCandidates,
  occupiedBy,
  orderCandidates,
  ratingLabel,
  type CandidateSort,
} from "@/lib/tasks/assign-candidates";
import { activeWorkers } from "@/lib/tasks/staffing";
import { propertyHue } from "@/lib/tasks/dispatch-row";
import { initials } from "@/lib/ui/initials";
import type { TaskItemDto } from "@/lib/types/task.types";
import { cn } from "@/lib/utils";

/** One page is the server's own maximum (`MAX_PAGE_SIZE`); asking for more is silently clamped. */
const CANDIDATE_PAGE_SIZE = 100;

interface Props {
  /** The task being filled. `undefined` while the queue is refetching under us. */
  task: TaskItemDto | undefined;
  propertyName: string;
  /** Local `HH:mm`, or empty when the task carries no time. */
  time: string;
  dateLabel: string;
  urgent: boolean;
  onClose: () => void;
  onAssign: (workerId: string) => void;
  isPending: boolean;
  /** Localized refusal, already worded by the caller's classifier. */
  error?: string | null;
  /**
   * The worker whose assign was refused, so their row stays visibly selected and
   * the message above has an owner. The design's own detail, and the reason this
   * is a prop rather than local state: the mutation lives in the page.
   */
  refusedWorkerId?: string | null;
}

/**
 * Choosing a body for one under-staffed task.
 *
 * Replaces a modal that listed a name and an email — nothing anybody could choose
 * on. Every column here was already on `WorkerRowDto`: `rating`, `skills`,
 * `completedTasks`, `booked`. Nothing new is fetched that was not fetchable
 * before; the old dialog simply did not draw it.
 *
 * **Only `Active` workers are offered.** The server's live gate refuses anyone
 * else (`EnsureActiveForWorkerAsync` → `403`), so listing Pending / Lapsed /
 * Blocked / Deleted workers would tease a choice that cannot be made. The note at
 * the foot says so rather than leaving the absence unexplained. ⚠ `Active` is an
 * hourly projection and can lag real cover by up to an hour — the server stays the
 * real guard, which is why refusals are worded at all.
 *
 * ⚠ **Nothing here is a gate.** The five business rules that can refuse an
 * assignment (rating floor, profession, worker limit, overlap, contract end) are
 * only knowable after the click — the sheet has no source for the task group's
 * `ratingFloor` / `allowNewWorkers` / `eligibleProfessionIds`
 * (`BACKEND-ASKS.md` #33) and no overlap pre-check (#32). So this is context for
 * the admin's judgement, and the refusal ladder is the enforcement.
 */
export function AssignWorkerSheet({
  task,
  propertyName,
  time,
  dateLabel,
  urgent,
  onClose,
  onAssign,
  isPending,
  error,
  refusedWorkerId,
}: Props) {
  const t = useTranslations("dispatch.sheet");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<CandidateSort>("free");

  const { data: page, isPending: isLoadingWorkers } = useWorkers({
    onboardingStatus: "Active",
    pageSize: CANDIDATE_PAGE_SIZE,
    ...candidateQuery(sort),
  });

  const occupied = useMemo(() => occupiedBy(task), [task]);

  const candidates = useMemo(
    () => orderCandidates(filterCandidates(page?.items ?? [], occupied, search), sort),
    [page?.items, occupied, search, sort],
  );

  const filled = task ? activeWorkers(task).length : 0;
  const required = task?.requiredWorkerCount ?? 0;

  return (
    <Sheet open onOpenChange={(v) => !v && !isPending && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t("title")}</SheetTitle>
          <SheetDescription>{t("activeOnly")}</SheetDescription>
        </SheetHeader>

        {/*
          The task stays visible above the list, in a box of its own. Choosing a
          body for a shift you can no longer see is how the wrong body gets
          chosen — and a bordered band (the first pass) let the meter drift to the
          far edge, so the shift and its shortfall stopped reading as one fact.
        */}
        <div className="mx-4 flex flex-col gap-2 rounded-xl bg-muted/40 px-3 py-2.5 ring-1 ring-inset ring-border">
          <div className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden
              className="size-[7px] flex-none rounded-full"
              style={{ background: task ? propertyHue(task.propertyId) : undefined }}
            />
            <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">
              {propertyName}
            </span>
            <span className="flex-none font-mono text-[11.5px] text-muted-foreground">
              {[dateLabel, time].filter(Boolean).join(" · ")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <StaffingPipMeter filled={filled} required={required} urgent={urgent} />
            <span
              className={cn(
                "font-mono text-xs font-semibold tabular-nums",
                filled >= required
                  ? "text-status-active"
                  : "text-status-pending-deep",
              )}
            >
              {filled} / {required}
            </span>
            <span className="text-[11.5px] text-muted-foreground">
              {filled >= required
                ? t("fullyStaffed")
                : t("bodiesShort", { count: Math.max(0, required - filled) })}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 border-b border-border px-4 pb-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("search")}
              aria-label={t("search")}
              className="h-[34px] rounded-[9px] pl-9 text-[13px]"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {CANDIDATE_SORTS.map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={sort === key}
                onClick={() => setSort(key)}
                className={cn(
                  "flex h-6 items-center rounded-[7px] px-2.5 text-[11.5px] transition-colors",
                  // Filled, not tinted: the chosen order is a statement about the
                  // list below, and a faint highlight let three pills read as
                  // three labels.
                  sort === key
                    ? "bg-primary font-semibold text-primary-foreground"
                    : "font-medium text-muted-foreground ring-1 ring-inset ring-border hover:text-foreground",
                )}
              >
                {t(`sort.${key}`)}
              </button>
            ))}
            <div className="flex-1" />
            <span className="font-mono text-[10.5px] text-muted-foreground/70">
              {t("loaded", { count: page?.items?.length ?? 0 })}
            </span>
          </div>
        </div>

        {error ? (
          <p
            role="alert"
            className="mx-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}

        {/* Cards with gaps, not a bordered list: each candidate is a thing being
            weighed against the others, and a hairline-separated list reads as one
            long thing to scroll past. */}
        <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-3 py-2.5">
          {isLoadingWorkers ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-[50px] w-full flex-none rounded-xl" />
            ))
          ) : candidates.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              {t("noCandidates")}
            </p>
          ) : (
            candidates.map((w) => {
              const rating = ratingLabel(w);
              const refused = refusedWorkerId === w.id;
              return (
                <div
                  key={w.id}
                  className={cn(
                    "flex flex-none items-center gap-2.5 rounded-xl px-2.5 py-2.5 ring-1 ring-inset",
                    refused
                      ? "bg-destructive/[0.04] ring-[1.5px] ring-destructive/45"
                      : "bg-card ring-border/70",
                  )}
                >
                  <Avatar className="size-8 shrink-0">
                    <AvatarFallback
                      className={cn(
                        "text-[11.5px] font-bold",
                        refused
                          ? "bg-status-cancelled-tint text-status-cancelled-deep"
                          : "bg-accent text-primary",
                      )}
                    >
                      {initials(w.fullName)}
                    </AvatarFallback>
                  </Avatar>

                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate text-[13.5px] font-semibold">
                        {w.fullName || "—"}
                      </span>
                      {rating.isNew ? (
                        <Badge
                          variant="outline"
                          className="flex-none px-1 py-0 text-[10px]"
                        >
                          {t("new")}
                        </Badge>
                      ) : (
                        <span className="flex flex-none items-center gap-0.5 text-muted-foreground">
                          <Star className="size-3" />
                          <span className="font-mono text-[11.5px] font-semibold">
                            {rating.text}
                          </span>
                        </span>
                      )}
                    </span>
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate text-[11px] text-muted-foreground">
                        {w.skills?.join(", ") || "—"}
                      </span>
                      <span
                        aria-hidden
                        className="size-[3px] flex-none rounded-full bg-border"
                      />
                      <span className="whitespace-nowrap text-[11px] text-muted-foreground/80">
                        {t("completed", { count: w.completedTasks })}
                      </span>
                    </span>
                  </span>

                  {/*
                    ⚠ `booked` means "on an ACTIVE task", NOT "busy on this date".
                    A hint about how loaded somebody is, never a conflict — the
                    server only refuses on a real time-range overlap.
                  */}
                  <span
                    className={cn(
                      "flex h-[22px] flex-none items-center gap-1.5 whitespace-nowrap rounded-[7px] px-2 text-[10.5px] font-semibold",
                      w.booked
                        ? "bg-muted text-muted-foreground"
                        : "bg-status-active-tint text-status-active",
                    )}
                  >
                    {w.booked ? (
                      <Briefcase className="size-2.5" />
                    ) : (
                      <Check className="size-2.5" />
                    )}
                    {w.booked ? t("tag.booked") : t("tag.free")}
                  </span>

                  <Button
                    size="sm"
                    variant={refused ? "outline" : "default"}
                    disabled={isPending}
                    className={cn(
                      "h-7 flex-none px-2.5 text-xs",
                      refused && "border-destructive/40 text-destructive",
                    )}
                    onClick={() => onAssign(w.id)}
                  >
                    {refused ? t("refused") : t("assign")}
                  </Button>
                </div>
              );
            })
          )}

          {/*
            Inside the scroll area and after the list, where the absence it
            explains actually is. In the footer it read as a general disclaimer
            rather than as the answer to "where is everybody else".
          */}
          {!isLoadingWorkers ? (
            <div className="mt-1 flex flex-none gap-2.5 rounded-[11px] bg-muted/40 px-3 py-2.5">
              <EyeOff className="mt-px size-3.5 flex-none text-muted-foreground/60" />
              <span className="text-[11.5px] leading-normal text-muted-foreground">
                {t("notOffered")}
              </span>
            </div>
          ) : null}
        </div>

        <div className="flex flex-none items-center gap-2.5 border-t border-border px-4 py-3">
          <span className="flex-1 text-[11.5px] leading-normal text-muted-foreground">
            {t("writesImmediately")}
          </span>
          {isPending ? (
            <span className="flex flex-none items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {t("assigning")}
            </span>
          ) : null}
          <Button variant="outline" onClick={onClose} disabled={isPending} className="flex-none">
            {t("close")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
