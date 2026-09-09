"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ArrowUpDown, RotateCcw, Search } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AssignWorkerSheet } from "@/components/tasks/assign-worker-sheet";
import { DispatchStrip } from "@/components/dispatch/dispatch-strip";
import { DayRail } from "@/components/dispatch/day-rail";
import { DispatchTaskRow } from "@/components/dispatch/dispatch-task-row";
import { UnassignDialog } from "@/components/dispatch/unassign-dialog";
import {
  useAdminTaskGroups,
  useAssignWorker,
  useDispatchQueue,
  useUnassignWorker,
} from "@/hooks/use-tasks";
import {
  isOpen,
  isShortOfCrew,
  needsWorkers,
} from "@/lib/tasks/staffing";
import { matchesDispatchSearch, propertyLabel } from "@/lib/tasks/dispatch-search";
import {
  groupTasksByDay,
  type DispatchDayGroup,
} from "@/lib/tasks/day-groups";
import { useClock, useTodayKey } from "@/hooks/use-today";
import {
  hoursUntil,
  imminentUnstaffed,
  indexGroupFacts,
} from "@/lib/tasks/dispatch-row";
import { cn } from "@/lib/utils";
import {
  classifyAssignError,
  classifyUnassignError,
  type AssignErrorKind,
} from "@/lib/tasks/assign-errors";
import type { TaskItemDto, TaskWorkerDto } from "@/lib/types/task.types";

/**
 * The cap on `/api/tasks/admin` is **conditional** since F-02a·1 (2026-08-10):
 * 500 with no date window, 500 with `scheduledFrom` alone, 500 with
 * `scheduledTo` alone — and 5,000 only on a **fully-closed** window.
 *
 * This board sends **both** bounds (`useDispatchQueue` → `dispatchWindow`), so
 * 5,000 is the live bound. Do not lower this constant without also dropping a
 * bound; a half-open range still filters correctly but silently reverts to 500.
 *
 * ⚠ Truncation stays silent — no `total`, no `hasMore`, no header. Receiving
 * exactly this many rows means "at least this many", never "this many", which is
 * what the notice below exists to say. A fortnight of tasks sits far under it,
 * so in practice the notice should never fire; it is here for the day the
 * horizon is widened and nobody re-reads this comment.
 */
const ADMIN_TASKS_CAP = 5000;

/**
 * `short` is the tab this board adds — open, partly crewed, still a body short
 * (`isShortOfCrew`). It is **disjoint** from `needsWorkers`, so the two counts
 * beside the tabs never describe the same task twice.
 */
type DispatchFilter = "needsWorkers" | "short" | "open" | "all";
const DISPATCH_FILTERS: DispatchFilter[] = [
  "needsWorkers",
  "short",
  "open",
  "all",
];

const FILTER_PREDICATE: Record<
  DispatchFilter,
  ((task: TaskItemDto) => boolean) | null
> = {
  needsWorkers,
  short: isShortOfCrew,
  open: isOpen,
  all: null,
};

type ModalState =
  /**
   * `dateLabel` and `urgent` are carried rather than recomputed: they are the
   * group's reading, and a sheet that re-derived them could disagree with the
   * card the admin just clicked.
   */
  | { type: "assign"; taskId: string; dateLabel: string; urgent: boolean }
  | { type: "unassign"; taskId: string; tw: TaskWorkerDto }
  | null;

function fmtDate(dateStr: string, locale: string): string {
  // scheduledDate is "yyyy-MM-dd"; render in the active locale.
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(locale, { dateStyle: "medium" });
}


/**
 * A day's heading, in the admin's own words: "Today", "Tomorrow", or the weekday.
 *
 * `relation` is a discriminator from `day-groups.ts` precisely so the copy lives
 * here, where `next-intl` and the locale are — the module returns no English.
 */
function useDayLabel() {
  const t = useTranslations("dispatch");
  return (group: DispatchDayGroup, locale: string): string => {
    if (group.relation === "today") return t("days.today");
    if (group.relation === "tomorrow") return t("days.tomorrow");
    const d = new Date(`${group.key}T00:00:00`);
    if (Number.isNaN(d.getTime())) return group.key;
    return d.toLocaleDateString(locale, { weekday: "long" });
  };
}

export default function DispatchPage() {
  const t = useTranslations("dispatch");
  const tCommon = useTranslations("common");
  const tOnboarding = useTranslations("onboarding");
  const locale = useLocale();
  const todayKey = useTodayKey();
  const dayLabel = useDayLabel();
  const [filter, setFilter] = useState<DispatchFilter>("needsWorkers");
  const [search, setSearch] = useState("");
  /** Both directions are a reverse of the one key the board can sort on. */
  const [soonestFirst, setSoonestFirst] = useState(true);
  /** The rail's lit day. `null` until the first group resolves or a click. */
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  /** Whose assign was refused — the sheet keeps that row selected. */
  const [refusedWorkerId, setRefusedWorkerId] = useState<string | null>(null);

  const clock = useClock();

  const {
    data: tasks = [],
    isPending,
    isError,
    isFetching,
    refetch,
    window: queueWindow,
  } = useDispatchQueue();

  /**
   * The group list, for the one thing the task row cannot answer: its own title.
   *
   * ⚠ A **second whole-platform request**, and the only one on this board — the
   * property fetch it replaces was pure waste (`propertyName` was already on the
   * row), this one is not: `TaskItemDto` has no title field at all, and the same
   * response also carries `ratingFloor` / `allowNewWorkers` /
   * `eligibleProfessionIds`, which is what would let the assign sheet grey out an
   * ineligible worker instead of letting the server refuse them. One request,
   * two jobs. `BACKEND-ASKS.md` #33 asks for these on the row, which would delete
   * this call.
   *
   * The board does **not** wait on it: a missing title degrades the row's second
   * line to the duration alone.
   */
  const { data: taskGroups = [] } = useAdminTaskGroups();
  const groupFacts = useMemo(() => indexGroupFacts(taskGroups), [taskGroups]);

  const assignWorker = useAssignWorker();
  const unassignWorker = useUnassignWorker();

  /**
   * One count per tab, over the whole loaded window and **ignoring the search
   * box** — a tab count answers "how much of this is there", which a half-typed
   * query must not change under the admin's hands.
   */
  const counts = useMemo(
    () =>
      Object.fromEntries(
        DISPATCH_FILTERS.map((key) => {
          const predicate = FILTER_PREDICATE[key];
          return [key, predicate ? tasks.filter(predicate).length : tasks.length];
        }),
      ) as Record<DispatchFilter, number>,
    [tasks],
  );

  const filtered = useMemo(() => {
    const predicate = FILTER_PREDICATE[filter];
    return tasks
      .filter(
        (task) =>
          (!predicate || predicate(task)) && matchesDispatchSearch(task, search),
      )
      .sort((a, b) =>
        soonestFirst
          ? a.scheduledDate.localeCompare(b.scheduledDate)
          : b.scheduledDate.localeCompare(a.scheduledDate),
      );
  }, [tasks, filter, search, soonestFirst]);

  /**
   * Grouped from `filtered`, not from `tasks` — the rail is drawn from this same
   * array, so a day the current tab empties disappears from the index and the
   * board together. See `groupTasksByDay`.
   */
  const groups = useMemo(
    () => groupTasksByDay(filtered, todayKey),
    [filtered, todayKey],
  );

  /**
   * The strip's counts are over the **whole window**, like the tabs' — it says
   * what is true of the queue, not of the current narrowing. `startsToday` is the
   * one tile with no tab, so it is counted here rather than in `FILTER_PREDICATE`.
   */
  const stripCounts = useMemo(
    () => ({
      needsWorkers: counts.needsWorkers,
      short: counts.short,
      open: counts.open,
      startsToday: todayKey
        ? tasks.filter((task) => task.scheduledDate === todayKey).length
        : 0,
      total: tasks.length,
    }),
    [counts, tasks, todayKey],
  );

  const imminent = useMemo(() => imminentUnstaffed(tasks, clock), [tasks, clock]);

  /**
   * The rail lights the first group until the admin picks one, so it never reads
   * as an index belonging to no day. Re-derived rather than stored: a filter
   * change can empty the previously selected day, and a rail pointing at a day
   * that is no longer drawn is worse than one pointing at the top.
   */
  const railSelection =
    selectedDay && groups.some((g) => g.key === selectedDay)
      ? selectedDay
      : (groups[0]?.key ?? null);

  /**
   * The task the sheet is filling, resolved from the live queue rather than
   * snapshotted into `modal`. So when an assign succeeds and the queue refetches,
   * the sheet's own meter moves with it — and a task that vanished from the window
   * resolves to `undefined` instead of showing a stale row.
   */
  const assignTarget = useMemo(
    () =>
      modal?.type === "assign"
        ? tasks.find((task) => task.id === modal.taskId)
        : undefined,
    [tasks, modal],
  );

  /** Same live lookup as `assignTarget`, for the confirm's property and date. */
  const unassignTarget = useMemo(
    () =>
      modal?.type === "unassign"
        ? tasks.find((task) => task.id === modal.taskId)
        : undefined,
    [tasks, modal],
  );

  const close = () => {
    setModal(null);
    setRefusedWorkerId(null);
    assignWorker.reset();
    // Without this the next unassign opens its dialog already carrying the last
    // one's refusal — the mutation keeps its error until something clears it.
    unassignWorker.reset();
  };

  /**
   * Both doors word their refusal from the same three namespaces, so the mapping
   * lives once. `generic` differs though: a failed assign is worth retrying, a
   * failed unassign usually is not — see `errors.unassignGeneric`.
   */
  const wordRefusal = (kind: AssignErrorKind, genericKey: string): string => {
    switch (kind.kind) {
      case "permission":
        return tOnboarding("permissionDenied");
      case "catalog":
        return tOnboarding(`apiErrors.${kind.labelKey}`);
      case "legacy":
        return t(`errors.${kind.code}`);
      case "unknown":
        return t(genericKey);
    }
  };

  const assignError =
    modal?.type === "assign" && assignWorker.isError
      ? wordRefusal(classifyAssignError(assignWorker.error), "errors.generic")
      : null;

  const unassignError =
    modal?.type === "unassign" && unassignWorker.isError
      ? wordRefusal(
          classifyUnassignError(unassignWorker.error),
          "errors.unassignGeneric",
        )
      : null;

  return (
    /*
      `flex-1 min-h-0` claims the height the shell already offers — the wrapper is
      `min-h-svh`, `SidebarInset` is `flex-1 flex-col` and `main` is
      `flex flex-1 flex-col`, so the chain reaches here and stops unless the page
      takes it. Without this the board ended under its last row and left a slab of
      empty canvas below, which is the one thing a queue must not do: an admin
      cannot tell "nothing more today" from "the list stopped rendering".

      `min-h-0` is load-bearing next to it. A flex item defaults to
      `min-height:auto`, which refuses to shrink under its content — so the inner
      scroll area would push the card past the viewport and scroll the whole page
      instead of scrolling inside itself.
    */
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/*
        Title on the left, the two things the admin does to the whole board on the
        right. The imminent pill is not decoration: it is the only place the board
        says "something is about to start short" without being scrolled to.
      */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="font-heading text-[22px] font-bold leading-tight tracking-[-0.025em]">
            {t("title")}
          </h1>
          <p className="text-[13px] text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {imminent > 0 ? (
            <span className="flex h-8 items-center gap-1.5 whitespace-nowrap rounded-[9px] bg-status-cancelled-tint px-2.5 text-[13px] font-semibold text-status-cancelled-deep ring-1 ring-inset ring-status-cancelled/25">
              <AlertTriangle className="size-4" />
              {t("imminent", { count: imminent })}
            </span>
          ) : null}
          <span aria-hidden className="mx-0.5 h-5 w-px bg-border" />
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            disabled={isFetching}
            onClick={() => refetch()}
          >
            <RotateCcw className={cn("size-4", isFetching && "animate-spin")} />
            {t("refresh")}
          </Button>
        </div>
      </div>

      <DispatchStrip
        counts={stripCounts}
        isLoading={isPending}
        activeTab={filter}
        onTab={(key) => setFilter(key as DispatchFilter)}
        todayLabel={todayKey ? fmtDate(todayKey, locale) : ""}
      />

      {/*
        One surface. The toolbar, the rail and the rows all live inside it, which
        is what gives the board its columns — a stack of separate cards has no
        gutters, so nothing lines up down the page.
      */}
      {/*
        `flex-1` to grow into the page's height, `min-h-[20rem]` as the floor so a
        short viewport (or a laptop with devtools open) makes the page scroll
        rather than crushing the board to a sliver. The inner scroll area carries
        the `min-h-0`, which is where it belongs.
      */}
      <div className="flex min-h-[20rem] flex-1 flex-col overflow-hidden rounded-[20px] bg-card shadow-card ring-1 ring-foreground/10">
        <div className="flex flex-none flex-wrap items-center gap-2.5 border-b border-border px-4 py-3">
          <div
            role="tablist"
            aria-label={t("tabsLabel")}
            className="flex flex-none gap-0.5 rounded-[10px] bg-muted p-[3px]"
          >
            {DISPATCH_FILTERS.map((key) => {
              const active = filter === key;
              return (
                <button
                  key={key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(key)}
                  className={cn(
                    "flex h-7 items-center gap-1.5 rounded-lg px-3 text-[12.5px] transition-colors",
                    active
                      ? "bg-card font-semibold text-foreground shadow-sm"
                      : "font-medium text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t(`tabs.${key}`)}
                  <span
                    className={cn(
                      "font-mono text-[11px] tabular-nums",
                      active ? "text-muted-foreground" : "text-muted-foreground/60",
                    )}
                  >
                    {counts[key]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex-1" />

          <div className="relative w-full sm:w-[280px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchPlaceholder")}
              className="h-8 rounded-[9px] pl-9 text-[13px]"
            />
          </div>

          {/*
            A real toggle, not the design's label. The board can only sort on
            `scheduledDate` — the server returns newest-first and has no sort
            param at all (`BACKEND-ASKS.md` #34) — so both directions are a
            client-side reverse of the same key, which is honest and cheap.
          */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 flex-none gap-1.5 text-[12.5px]"
            aria-pressed={!soonestFirst}
            onClick={() => setSoonestFirst((v) => !v)}
          >
            <ArrowUpDown className="size-3.5" />
            {soonestFirst ? t("soonestFirst") : t("latestFirst")}
          </Button>
        </div>

        {isPending ? (
          <div className="flex min-h-0 flex-1 flex-col gap-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex min-h-0 flex-1 items-center justify-center p-6">
            <p className="text-center text-sm text-destructive">{tCommon("error")}</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="flex min-h-0 flex-1 items-center justify-center p-6">
            <p className="text-center text-sm text-muted-foreground">{t("empty")}</p>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            <DayRail
              groups={groups}
              selectedKey={railSelection}
              onSelect={(key) => {
                setSelectedDay(key);
                document
                  .getElementById(`dispatch-day-${key}`)
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              dayLabel={(group) => dayLabel(group, locale)}
              dateLabel={(key) => fmtDate(key, locale)}
              footer={
                queueWindow ? (
                  <div className="flex flex-col gap-1 rounded-[10px] bg-muted px-2 py-2.5">
                    <span className="text-[10.5px] font-semibold text-muted-foreground">
                      {t("windowTitle")}
                    </span>
                    <span className="text-[10px] leading-[1.45] text-muted-foreground/80">
                      {t("windowNotice", {
                        from: fmtDate(queueWindow.fromKey, locale),
                        to: fmtDate(queueWindow.toKey, locale),
                      })}
                    </span>
                  </div>
                ) : null
              }
            />

            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                {groups.map((group) => {
                  const urgent =
                    group.relation === "elapsed" || group.relation === "today";
                  return (
                    <section key={group.key} className="flex flex-col">
                      {/*
                        A full-bleed band, not a floating heading: it is the row
                        group's own header and has to look attached to the rows
                        under it.
                      */}
                      <div
                        id={`dispatch-day-${group.key}`}
                        className={cn(
                          "flex h-[34px] flex-none scroll-mt-0 items-center gap-2.5 border-b border-border/70 px-4",
                          urgent ? "bg-status-cancelled-tint/40" : "bg-muted/40",
                        )}
                      >
                        <h2
                          className={cn(
                            "text-xs font-bold tracking-[-0.01em]",
                            urgent ? "text-status-cancelled-deep" : "text-foreground",
                          )}
                        >
                          {dayLabel(group, locale)}
                          <span className="font-normal text-muted-foreground">
                            {" · "}
                            {fmtDate(group.key, locale)}
                          </span>
                        </h2>
                        <span className="text-[11.5px] text-muted-foreground">
                          {t("groupMeta", {
                            unstaffed: group.unstaffed,
                            total: group.tasks.length,
                          })}
                        </span>
                        <div className="flex-1" />
                        <span className="hidden font-mono text-[10.5px] text-muted-foreground/60 sm:inline">
                          {group.key}
                        </span>
                      </div>

                      {group.tasks.map((task) => (
                        <DispatchTaskRow
                          key={task.id}
                          task={task}
                          propertyName={propertyLabel(task)}
                          group={groupFacts.get(task.groupId)}
                          urgent={urgent}
                          hoursLeft={hoursUntil(task.scheduledAt, clock)}
                          onAssign={(taskId) => {
                            assignWorker.reset();
                            setRefusedWorkerId(null);
                            setModal({
                              type: "assign",
                              taskId,
                              dateLabel: fmtDate(group.key, locale),
                              urgent,
                            });
                          }}
                          onUnassign={(taskId, tw) =>
                            setModal({ type: "unassign", taskId, tw })
                          }
                        />
                      ))}
                    </section>
                  );
                })}

                {/*
                  The design's own filler. Once the rows run out, the rest of the
                  column is still the board — a faint ground says so, where a bare
                  card edge under the last row reads as the list having stopped
                  early. Collapses to nothing as soon as the rows overflow.
                */}
                <div aria-hidden className="min-h-0 flex-1 bg-muted/[0.18]" />
              </div>

              {tasks.length >= ADMIN_TASKS_CAP ? (
                <div className="flex h-[38px] flex-none items-center gap-2 border-t border-border px-4">
                  <AlertTriangle className="size-3.5 text-muted-foreground" />
                  <span className="text-[11.5px] text-muted-foreground">
                    {t("capNotice", { count: ADMIN_TASKS_CAP })}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {modal?.type === "assign" && (
        <AssignWorkerSheet
          task={assignTarget}
          propertyName={assignTarget ? propertyLabel(assignTarget) : "—"}
          time={(assignTarget?.scheduledAt ?? "").slice(11, 16)}
          dateLabel={modal.dateLabel}
          urgent={modal.urgent}
          onClose={close}
          isPending={assignWorker.isPending}
          error={assignError}
          refusedWorkerId={refusedWorkerId}
          onAssign={(workerId) => {
            // Held so the refused row stays selected and the message has an
            // owner; cleared on success by `close`.
            setRefusedWorkerId(workerId);
            assignWorker.mutate(
              { taskId: modal.taskId, workerId },
              { onSuccess: close },
            );
          }}
        />
      )}

      {modal?.type === "unassign" && (
        <UnassignDialog
          workerName={modal.tw.workerName ?? modal.tw.workerId.slice(0, 8)}
          propertyName={unassignTarget ? propertyLabel(unassignTarget) : "—"}
          dateLabel={
            unassignTarget ? fmtDate(unassignTarget.scheduledDate, locale) : "—"
          }
          isPending={unassignWorker.isPending}
          error={unassignError}
          onClose={close}
          onConfirm={() =>
            unassignWorker.mutate(
              { taskId: modal.taskId, workerId: modal.tw.workerId },
              { onSuccess: close },
            )
          }
        />
      )}
    </div>
  );
}
