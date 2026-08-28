"use client";

import { useMemo, useState, useEffect } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TableCell, TableRow } from "@/components/ui/table";
import { DataTableCard } from "@/components/ui/data-table-card";
import { RowLink } from "@/components/ui/row-link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  ChevronRight,
  LayoutList,
  CalendarDays,
  Star,
  Plus,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { MapPin, CalendarClock, Search, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useWorkers } from "@/hooks/use-workers";
import { useAdminTaskGroups, useAssignWorker } from "@/hooks/use-tasks";
import { useProperties } from "@/hooks/use-properties";
import { normalizeStatus } from "@/lib/types/task.types";
import type { WorkerRowDto } from "@/lib/types/worker.types";
import type { OnboardingStatus } from "@/lib/types/onboarding.types";
import { onboardingStatusPresentation } from "@/lib/onboarding/status";
import { describeApiError, isPermissionDenied } from "@/lib/onboarding/errors";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/lib/types/paged.types";
import { useTranslations, useLocale } from "next-intl";

// v2 admin-assign refusals. The gate codes (403 WITH a body, about the WORKER's
// contract cover — an empty 403 body is a permission problem instead) and
// `worker_contract_ends_before_task` are covered by the shared onboarding
// catalog (see `assignError` below); `worker_not_approved` no longer exists.
// These four are the only codes THIS PAGE still owns copy for — checked by
// membership, never by interpolating an arbitrary code into `assignErrors.*`.
const LEGACY_ASSIGN_ERRORS = new Set([
  "worker_below_rating_floor",
  "worker_profession_not_eligible",
  "worker_limit_reached",
  "worker_has_overlapping_assignment",
]);

// A worker whose outcome is one of these no longer occupies the task slot.
const VACATED_OUTCOMES = new Set(["removed", "cancelled", "noshow"]);


import { propertyPalette } from "@/lib/calendar-utils";

interface CalendarTaskChip {
  taskId: string;
  title: string;
  startTime: string;
  endTime: string | null;
  assignedCount: number;
  requiredCount: number;
  propertyId: string;
  propertyName: string;
}


const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function dateKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** A real task on a given day that `worker` could be admin-assigned to fill. */
interface AssignableTask {
  taskId: string;
  label: string;
  propertyName: string;
}

type StatusTab = "all" | "pending" | "approved";

export default function WorkersPage() {
  const t = useTranslations("workers");
  const [viewTab, setViewTab] = useState<"table" | "calendar">("calendar");
  const [statusTab, setStatusTab] = useState<StatusTab>("pending");
  const [search, setSearch] = useState("");

  // Tabs map to the exact onboarding stage; `Review` is the admin review queue.
  const onboardingStatus: OnboardingStatus | undefined =
    statusTab === "approved" ? "Active" : statusTab === "pending" ? "Review" : undefined;

  const { data: page, isLoading } = useWorkers({
    onboardingStatus,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  const workers = page?.items ?? [];

  const filtered = workers.filter((w) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      w.fullName?.toLowerCase().includes(q) ||
      w.email?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
      </div>

      <Tabs value={viewTab} onValueChange={(v) => setViewTab(v as typeof viewTab)} className="gap-4">
        <TabsList variant="line" className="self-start">
          <TabsTrigger value="table" className="gap-2">
            <LayoutList className="size-4" />
            {t("tableView")}
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2">
            <CalendarDays className="size-4" />
            {t("calendarView")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="flex flex-col gap-4">
          <Tabs value={statusTab} onValueChange={(v) => setStatusTab(v as StatusTab)}>
            <TabsList variant="line" className="self-start">
              <TabsTrigger value="all">{t("tabs.all")}</TabsTrigger>
              <TabsTrigger value="pending">{t("tabs.pending")}</TabsTrigger>
              <TabsTrigger value="approved">{t("tabs.approved")}</TabsTrigger>
            </TabsList>
          </Tabs>
          <WorkersTable
            workers={filtered}
            isLoading={isLoading}
            search={search}
            onSearch={setSearch}
            t={t}
          />
        </TabsContent>

        <TabsContent value="calendar">
          <WorkersCalendar />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function WorkersTable({
  workers,
  isLoading,
  search,
  onSearch,
  t,
}: {
  workers: WorkerRowDto[];
  isLoading: boolean;
  search: string;
  onSearch: (v: string) => void;
  t: ReturnType<typeof useTranslations<"workers">>;
}) {
  const tOnboarding = useTranslations("onboarding");
  const workerColumns = [
    { label: t("columns.worker") },
    { label: t("columns.status") },
    { label: t("columns.rating"), className: "text-center" },
  ];
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-border p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <DataTableCard
      title={t("list")}
      count={workers.length}
      searchPlaceholder={t("searchPlaceholder")}
      searchValue={search}
      onSearchChange={onSearch}
      columns={workerColumns}
      data={workers}
      renderRow={(w) => (
        <TableRow key={w.id} className="group/row relative cursor-pointer transition-colors duration-150 hover:bg-accent/40">
          <TableCell className="py-3">
            <RowLink href={`/dashboard/workers/${w.id}`} label={w.fullName || undefined} />
            <div className="flex items-center gap-3">
              <Avatar className="size-9 ring-1 ring-border">
                <AvatarFallback className="bg-muted text-[11px] font-semibold">
                  {(w.fullName ?? "??").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-medium leading-tight">{w.fullName ?? "—"}</span>
                <span className="text-[11px] text-muted-foreground">{w.email ?? "—"}</span>
              </div>
            </div>
          </TableCell>
          <TableCell>
            {(() => {
              const p = onboardingStatusPresentation(w.onboardingStatus);
              return (
                <Badge variant={p.variant} className={p.className}>
                  {tOnboarding(`status.${p.labelKey}`)}
                </Badge>
              );
            })()}
          </TableCell>
          <TableCell>
            <div className="flex items-center justify-center gap-1 text-sm font-medium tabular-nums">
              <Star className="size-3.5 fill-amber-500 text-amber-500" />
              {w.rating.toFixed(1)}
            </div>
          </TableCell>
        </TableRow>
      )}
    />
  );
}

function WorkersCalendar() {
  const t = useTranslations("workers");
  const tOnboarding = useTranslations("onboarding");
  const locale = useLocale();
  const [today, setToday] = useState<Date>(() => {
    const d = new Date(0); // epoch — stable placeholder for SSR
    d.setHours(0, 0, 0, 0);
    return d;
  });
  useEffect(() => {
    // Intentional post-hydration clock sync: SSR renders the stable epoch placeholder
    // above, then we swap to the real "today" on the client to avoid a hydration mismatch.
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToday(d);
  }, []);

  const [weekOffset, setWeekOffset] = useState(0);
  const [propertyFilter, setPropertyFilter] = useState("");
  const [hideEmpty, setHideEmpty] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{
    workerId: string;
    workerName: string;
    workerInitials: string;
    displayDate: string;
    isoDate: string;
  } | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [taskSearch, setTaskSearch] = useState("");

  // Admin-assigning to a task from this calendar is refused by the server's live
  // ACTIVE gate (403) unless the worker's contract is covering today, so only offer
  // `Active` workers here. `Active` is the stored projection and can lag real cover
  // by up to an hour; the assignError handling below remains the real guard for
  // that edge.
  const { data: workersPage, isLoading: isLoadingWorkers } = useWorkers({
    onboardingStatus: "Active",
    pageSize: MAX_PAGE_SIZE,
  });
  const allWorkers = useMemo(() => workersPage?.items ?? [], [workersPage]);
  const { data: taskGroups = [], isLoading: isLoadingTasks } = useAdminTaskGroups(
    undefined,
    propertyFilter || undefined,
  );
  const { data: properties = [] } = useProperties();
  const assignWorker = useAssignWorker();
  const isLoading = isLoadingWorkers || isLoadingTasks;

  const propertyName = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of properties) if (p.name) map.set(p.id, p.name);
    return (id: string) => map.get(id) ?? id.slice(0, 8);
  }, [properties]);

  // Real tasks scheduled on the selected day that the worker can still fill:
  // open (pending/active) tasks where the worker has no active assignment yet.
  const assignableTasks = useMemo<AssignableTask[]>(() => {
    if (!selectedCell) return [];
    const out: AssignableTask[] = [];
    for (const group of taskGroups) {
      for (const task of group.tasks ?? []) {
        if (task.scheduledDate !== selectedCell.isoDate) continue;
        const status = normalizeStatus(task.status);
        if (status !== "pending" && status !== "active") continue;
        const alreadyOn = (task.workers ?? []).some(
          (w) =>
            w.workerId === selectedCell.workerId &&
            !VACATED_OUTCOMES.has(normalizeStatus(w.outcome)),
        );
        if (alreadyOn) continue;
        out.push({
          taskId: task.id,
          label: group.title ?? task.id.slice(0, 8),
          propertyName: propertyName(group.propertyId),
        });
      }
    }
    return out;
  }, [selectedCell, taskGroups, propertyName]);

  const assignError =
    selectedCell && assignWorker.isError
      ? (() => {
          if (isPermissionDenied(assignWorker.error)) {
            return tOnboarding("permissionDenied");
          }
          const info = describeApiError(assignWorker.error);
          if (info && info.labelKey !== "unknown") {
            // A code the shared onboarding catalog covers (the gate codes plus
            // worker_contract_ends_before_task). Never interpolate a raw code into
            // a page-local key below — an uncataloged code (e.g. worker_not_found)
            // would otherwise render next-intl's missing-key path string.
            return tOnboarding(`apiErrors.${info.labelKey}`);
          }
          if (info && LEGACY_ASSIGN_ERRORS.has(info.code)) {
            return t(`assignErrors.${info.code}`);
          }
          return t("calendar.assignFailed");
        })()
      : null;

  const weekDays = useMemo(() => {
    const mon = new Date(today);
    const dow = (mon.getDay() + 6) % 7;
    mon.setDate(mon.getDate() - dow + weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      return d;
    });
  }, [today, weekOffset]);

  const workerTaskMap = useMemo(() => {
    const map = new Map<string, Map<string, CalendarTaskChip[]>>();
    for (const group of taskGroups) {
      const title = group.title ?? "Task";
      const startTime = group.defaultStartTime.slice(0, 5);
      const endTime = group.defaultDeadline ? group.defaultDeadline.slice(0, 5) : null;
      for (const task of group.tasks ?? []) {
        if (!task.scheduledDate) continue;
        const assignedCount = (task.workers ?? []).filter(
          (tw) => !VACATED_OUTCOMES.has(normalizeStatus(tw.outcome)),
        ).length;
        const chip: CalendarTaskChip = {
          taskId: task.id,
          title,
          startTime,
          endTime,
          assignedCount,
          requiredCount: task.requiredWorkerCount,
          propertyId: group.propertyId,
          propertyName: task.propertyName ?? propertyName(group.propertyId),
        };
        for (const tw of task.workers ?? []) {
          if (!tw.workerId) continue;
          if (VACATED_OUTCOMES.has(normalizeStatus(tw.outcome))) continue;
          if (!map.has(tw.workerId)) map.set(tw.workerId, new Map());
          const dayMap = map.get(tw.workerId)!;
          const existing = dayMap.get(task.scheduledDate) ?? [];
          if (!existing.some((c) => c.taskId === task.id)) {
            dayMap.set(task.scheduledDate, [...existing, chip]);
          }
        }
      }
    }
    return map;
  }, [taskGroups, propertyName]);

  const calendarWorkers = useMemo(() => {
    const weekKeys = new Set(weekDays.map((d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }));
    const rows = allWorkers.map((w) => {
      const dayMap = workerTaskMap.get(w.id);
      const weekTaskCount = dayMap
        ? Array.from(dayMap.entries())
            .filter(([k]) => weekKeys.has(k))
            .reduce((s, [, v]) => s + v.length, 0)
        : 0;
      return { worker: w, weekTaskCount };
    });
    return hideEmpty ? rows.filter((r) => r.weekTaskCount > 0) : rows;
  }, [allWorkers, workerTaskMap, weekDays, hideEmpty]);

  const weekLabel = (() => {
    const mon = weekDays[0];
    const sun = weekDays[6];
    if (mon.getMonth() === sun.getMonth()) {
      const monStr = mon.toLocaleDateString(locale, { day: "numeric" });
      const sunStr = sun.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
      return `${monStr}–${sunStr}`;
    }
    const monStr = mon.toLocaleDateString(locale, { day: "numeric", month: "long" });
    const sunStr = sun.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
    return `${monStr} – ${sunStr}`;
  })();

  function openAssignDialog(
    workerId: string,
    workerName: string,
    d: Date,
    isoDate: string,
  ) {
    const displayDate = `${d.toLocaleDateString(locale, { weekday: "long" })}, ${d.toLocaleDateString(locale, { day: "numeric", month: "long" })}`;
    assignWorker.reset();
    setSelectedCell({
      workerId,
      workerName,
      workerInitials: workerName.slice(0, 2).toUpperCase(),
      displayDate,
      isoDate,
    });
    setSelectedTaskId("");
    setTaskSearch("");
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-border p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Week navigation */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setWeekOffset((o) => o - 1)}
                aria-label={t("calendar.previousWeek")}
                className="size-8 transition-colors hover:bg-accent"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="min-w-[220px] text-center text-sm font-semibold tracking-tight">
                {weekLabel}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setWeekOffset((o) => o + 1)}
                aria-label={t("calendar.nextWeek")}
                className="size-8 transition-colors hover:bg-accent"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <Select value={propertyFilter || undefined} onValueChange={(v) => setPropertyFilter(v ?? "")}>
                <SelectTrigger size="sm" className="w-44">
                  <SelectValue placeholder={t("calendar.allProperties")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t("calendar.allProperties")}</SelectItem>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name ?? p.id.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant={hideEmpty ? "default" : "outline"}
                size="sm"
                className="h-9 gap-1.5 px-2.5"
                onClick={() => setHideEmpty((v) => !v)}
                title={hideEmpty ? t("calendar.showEmpty") : t("calendar.hideEmpty")}
              >
                {hideEmpty ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                <span className="text-xs">{hideEmpty ? t("calendar.showEmpty") : t("calendar.hideEmpty")}</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setWeekOffset(0)}
                className="h-9 transition-all duration-150 active:scale-[0.97]"
              >
                {t("calendar.today")}
              </Button>
            </div>
          </div>
        </CardHeader>

        <div className="scrollbar-slim overflow-x-auto border-t border-border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 z-20 min-w-[180px] border-b border-r border-border bg-muted/50 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
                >
                  {t("calendar.workerName")}
                </th>
                <th
                  scope="col"
                  className="sticky left-[180px] z-20 min-w-[130px] border-b border-r border-border bg-muted/50 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
                >
                  {t("calendar.thisWeek")}
                </th>
                {weekDays.map((d) => {
                  const isToday = dateKey(d) === dateKey(today);
                  const wd = (d.getDay() + 6) % 7;
                  const isWeekend = wd >= 5;
                  return (
                    <th
                      key={dateKey(d)}
                      scope="col"
                      className={cn(
                        "min-w-[120px] border-b border-r border-border px-3 py-2 text-center last:border-r-0",
                        isToday ? "bg-primary/10" : isWeekend ? "bg-muted/25" : "bg-muted/50",
                      )}
                    >
                      <div className={cn(
                        "text-[11px] font-medium uppercase tracking-[0.06em]",
                        isWeekend ? "text-muted-foreground/40" : "text-muted-foreground",
                      )}>
                        {WEEKDAYS[wd]}
                      </div>
                      <span className={cn(
                        "mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                        isToday ? "bg-primary text-primary-foreground"
                          : isWeekend ? "text-muted-foreground/40"
                          : "text-foreground",
                      )}>
                        {d.getDate()}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {calendarWorkers.map(({ worker: w, weekTaskCount }) => {
                const dayMap = workerTaskMap.get(w.id);

                return (
                  <tr key={w.id} className="group/row">
                    <td className="sticky left-0 z-10 min-w-[180px] border-b border-r border-border bg-background px-4 py-3 transition-colors duration-150 group-hover/row:bg-accent/30">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="size-8 shrink-0 ring-1 ring-border">
                          <AvatarFallback className="bg-muted text-[10px] font-semibold">
                            {(w.fullName ?? "??").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-[13px] font-medium leading-tight">
                            {w.fullName ?? "—"}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {w.email ?? "—"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="sticky left-[180px] z-10 min-w-[130px] border-b border-r border-border bg-background px-4 py-3 transition-colors duration-150 group-hover/row:bg-accent/30">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[13px] font-medium tabular-nums">
                          {weekTaskCount} {t("calendar.tasks")}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[12px]">
                          <Star className="size-3 fill-amber-500 text-amber-500" />
                          <span className="tabular-nums text-foreground">
                            {w.rating.toFixed(1)}
                          </span>
                        </span>
                      </div>
                    </td>
                    {weekDays.map((d) => {
                      const isToday = dateKey(d) === dateKey(today);
                      const y = d.getFullYear();
                      const mo = String(d.getMonth() + 1).padStart(2, "0");
                      const dy = String(d.getDate()).padStart(2, "0");
                      const isoDate = `${y}-${mo}-${dy}`;
                      const chips = dayMap?.get(isoDate) ?? [];
                      const isEmpty = chips.length === 0;

                      return (
                        <td
                          key={dateKey(d)}
                          onClick={isEmpty ? () => openAssignDialog(w.id, w.fullName ?? "Worker", d, isoDate) : undefined}
                          className={cn(
                            "min-w-[150px] border-b border-r border-border px-1.5 py-1.5 last:border-r-0 align-top transition-colors duration-150 group/cell",
                            isToday
                              ? "bg-primary/5 group-hover/row:bg-primary/10"
                              : "bg-background group-hover/row:bg-accent/20",
                            isEmpty && "cursor-pointer hover:bg-accent/40",
                          )}
                        >
                          {isEmpty ? (
                            <div className="flex h-8 items-center justify-center opacity-0 group-hover/cell:opacity-50 transition-opacity duration-150">
                              <Plus className="size-3.5 text-muted-foreground" />
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1">
                              {chips.map((chip) => {
                                const pal = propertyPalette(chip.propertyId);
                                const isFull = chip.assignedCount >= chip.requiredCount;
                                return (
                                  <div
                                    key={chip.taskId}
                                    className={cn("rounded-md p-1.5 text-[11px] leading-tight", pal.bg, pal.text)}
                                    title={`${chip.title} — ${chip.propertyName}`}
                                  >
                                    {/* Time + fraction */}
                                    <div className="flex items-center justify-between gap-1 mb-0.5">
                                      <span className="font-semibold tabular-nums">
                                        {chip.startTime}{chip.endTime ? ` – ${chip.endTime}` : ""}
                                      </span>
                                      <span className={cn(
                                        "rounded px-1 text-[10px] font-bold tabular-nums",
                                        pal.sub,
                                        isFull ? "opacity-100" : "opacity-70",
                                      )}>
                                        {chip.assignedCount}/{chip.requiredCount}
                                      </span>
                                    </div>
                                    {/* Title */}
                                    <div className="truncate font-medium">{chip.title}</div>
                                    {/* Property chip */}
                                    <div className={cn(
                                      "mt-1 flex items-center gap-1 rounded px-1 py-0.5 w-fit max-w-full",
                                      pal.sub,
                                    )}>
                                      <Building2 className="size-2.5 shrink-0 opacity-70" />
                                      <span className="truncate text-[10px] font-medium opacity-90">
                                        {chip.propertyName}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {calendarWorkers.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-6 text-center text-sm text-muted-foreground"
                  >
                    {t("approvedNotFound")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={selectedCell !== null} onOpenChange={(v) => !v && setSelectedCell(null)}>
        <DialogContent className="sm:max-w-md gap-0 p-0 overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4">
            <div className="flex items-center gap-3">
              <Avatar className="size-10 shrink-0 ring-2 ring-border">
                <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                  {selectedCell?.workerInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-0.5">
                <DialogTitle className="text-base">{selectedCell?.workerName}</DialogTitle>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarClock className="size-3.5" />
                  {selectedCell?.displayDate}
                </div>
              </div>
            </div>
          </div>

          {/* Divider + search */}
          <div className="border-t border-border px-5 pt-3 pb-2 flex flex-col gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {t("calendar.selectTask")}
            </p>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder={t("calendar.taskSearch")}
                className="h-9 pl-8 text-sm"
                value={taskSearch}
                onChange={(e) => setTaskSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Task radio cards */}
          <div className="flex flex-col gap-1 px-5 pb-4 max-h-64 overflow-y-auto">
            {(() => {
              if (assignableTasks.length === 0) {
                return (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    {t("calendar.noTasksThatDay")}
                  </p>
                );
              }
              const results = assignableTasks.filter(
                (task) =>
                  taskSearch === "" ||
                  task.label.toLowerCase().includes(taskSearch.toLowerCase()) ||
                  task.propertyName.toLowerCase().includes(taskSearch.toLowerCase()),
              );
              if (results.length === 0) {
                return (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    {t("calendar.taskNotFound")}
                  </p>
                );
              }
              return results.map((task) => {
                const isSelected = selectedTaskId === task.taskId;
                return (
                  <button
                    key={task.taskId}
                    type="button"
                    onClick={() => setSelectedTaskId(task.taskId)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all duration-150",
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border hover:border-border/80 hover:bg-accent/40",
                    )}
                  >
                    <span className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                      isSelected ? "border-primary bg-primary" : "border-muted-foreground/30",
                    )}>
                      {isSelected && (
                        <span className="size-1.5 rounded-full bg-white" />
                      )}
                    </span>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className={cn("text-sm font-medium leading-tight", isSelected && "text-primary")}>
                        {task.label}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <MapPin className="size-3 shrink-0" />
                        {task.propertyName}
                      </span>
                    </div>
                  </button>
                );
              });
            })()}
          </div>

          {assignError ? (
            <p className="mx-5 mb-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {assignError}
            </p>
          ) : null}

          {/* Footer */}
          <div className="-mx-0 border-t border-border bg-muted/40 px-5 py-3 flex items-center justify-end gap-2">
            <DialogDescription className="mr-auto text-xs text-muted-foreground">
              {selectedTaskId
                ? `${t("calendar.selected")}: ${assignableTasks.find((task) => task.taskId === selectedTaskId)?.label}`
                : t("calendar.selectOneTask")}
            </DialogDescription>
            <Button
              variant="outline"
              size="sm"
              disabled={assignWorker.isPending}
              onClick={() => setSelectedCell(null)}
            >
              {t("calendar.cancel")}
            </Button>
            <Button
              size="sm"
              disabled={!selectedTaskId || assignWorker.isPending}
              onClick={() =>
                selectedCell &&
                selectedTaskId &&
                assignWorker.mutate(
                  { taskId: selectedTaskId, workerId: selectedCell.workerId },
                  { onSuccess: () => setSelectedCell(null) },
                )
              }
            >
              {assignWorker.isPending && (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              )}
              {t("calendar.assign")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
