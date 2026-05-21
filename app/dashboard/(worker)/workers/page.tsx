"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TableCell, TableRow } from "@/components/ui/table";
import { DataTableCard } from "@/components/ui/data-table-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  ChevronRight,
  LayoutList,
  CalendarDays,
  Star,
  Plus,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MapPin, CalendarClock, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useWorkers } from "@/hooks/use-workers";
import { useAdminTaskGroups } from "@/hooks/use-tasks";
import type { WorkerSummaryDto } from "@/lib/types/worker.types";


const workerHues: Record<number, { chip: string; dot: string }> = {
  1: { chip: "bg-blue-500/12 text-blue-700 dark:text-blue-300 ring-blue-500/25",     dot: "bg-blue-500" },
  2: { chip: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 ring-emerald-500/25", dot: "bg-emerald-500" },
  3: { chip: "bg-amber-500/12 text-amber-700 dark:text-amber-300 ring-amber-500/25", dot: "bg-amber-500" },
  4: { chip: "bg-violet-500/12 text-violet-700 dark:text-violet-300 ring-violet-500/25", dot: "bg-violet-500" },
  5: { chip: "bg-rose-500/12 text-rose-700 dark:text-rose-300 ring-rose-500/25",     dot: "bg-rose-500" },
  6: { chip: "bg-cyan-500/12 text-cyan-700 dark:text-cyan-300 ring-cyan-500/25",     dot: "bg-cyan-500" },
};


const WEEKDAYS = ["Du", "Se", "Cho", "Pa", "Ju", "Sha", "Ya"];
const MONTHS_UZ = [
  "Yanvar", "Fevral", "Mart",    "Aprel", "May",    "Iyun",
  "Iyul",   "Avgust", "Sentabr", "Oktabr","Noyabr", "Dekabr",
];

function dateKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// 0=Mon 1=Tue 2=Wed 3=Thu 4=Fri 5=Sat 6=Sun
function isWorkerDayOff(workerIdx: number, dayOfWeek: number): boolean {
  if (dayOfWeek >= 5) return true; // hafta oxiri har doim dam kuni
  // Mock: ba'zi ishchilar qo'shimcha dam kuniga ega
  const extraDayOff = [2, 0, -1, -1, 4, -1]; // idx%6 → extra off weekday
  return extraDayOff[workerIdx % 6] === dayOfWeek;
}

const MOCK_ASSIGNABLE_TASKS = [
  { id: "t1", label: "HVAC Ta'mirlash",         property: "Villa Sunrise #12"    },
  { id: "t2", label: "Santexnik ishlar",         property: "Amir Business Center" },
  { id: "t3", label: "Elektr tekshiruvi",        property: "GrandBuild Tower B"   },
  { id: "t4", label: "Tozalash ishlari",         property: "Hotel Grand, 3-qavat" },
  { id: "t5", label: "Oyna almashtirish",        property: "Office Block B"       },
  { id: "t6", label: "Devor bo'yash",            property: "Residence North"      },
  { id: "t7", label: "Konditsioner o'rnatish",   property: "Feruza Apartments"    },
];

type StatusTab = "all" | "pending" | "approved";

export default function WorkersPage() {
  const [viewTab, setViewTab] = useState<"table" | "calendar">("table");
  const [statusTab, setStatusTab] = useState<StatusTab>("pending");
  const [search, setSearch] = useState("");

  const isApproved =
    statusTab === "pending" ? false : statusTab === "approved" ? true : undefined;

  const { data: workers = [], isLoading } = useWorkers(isApproved);

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
            Workers
          </h1>
          <p className="text-sm text-muted-foreground">
            Ishchilarni boshqaring va monitoring qiling.
          </p>
        </div>
      </div>

      <Tabs value={viewTab} onValueChange={(v) => setViewTab(v as typeof viewTab)} className="gap-4">
        <TabsList variant="line" className="self-start">
          <TabsTrigger value="table" className="gap-2">
            <LayoutList className="size-4" />
            Jadval
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2">
            <CalendarDays className="size-4" />
            Calendar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="flex flex-col gap-4">
          <Tabs value={statusTab} onValueChange={(v) => setStatusTab(v as StatusTab)}>
            <TabsList variant="line" className="self-start">
              <TabsTrigger value="all">Barchasi</TabsTrigger>
              <TabsTrigger value="pending">Kutilmoqda</TabsTrigger>
              <TabsTrigger value="approved">Tasdiqlangan</TabsTrigger>
            </TabsList>
          </Tabs>
          <WorkersTable
            workers={filtered}
            isLoading={isLoading}
            search={search}
            onSearch={setSearch}
          />
        </TabsContent>

        <TabsContent value="calendar">
          <WorkersCalendar />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const STAT_TONES: Record<string, { ring: string; bg: string; text: string }> = {
  blue:    { ring: "ring-blue-500/20",    bg: "bg-blue-500/10",    text: "text-blue-600 dark:text-blue-400" },
  emerald: { ring: "ring-emerald-500/20", bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400" },
  violet:  { ring: "ring-violet-500/20",  bg: "bg-violet-500/10",  text: "text-violet-600 dark:text-violet-400" },
  amber:   { ring: "ring-amber-500/20",   bg: "bg-amber-500/10",   text: "text-amber-600 dark:text-amber-400" },
};

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  tone: keyof typeof STAT_TONES;
}) {
  const t = STAT_TONES[tone];
  return (
    <Card size="sm" className="transition-shadow duration-200 hover:shadow-sm">
      <CardContent className="flex items-center gap-3">
        <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg ring-1", t.ring, t.bg, t.text)}>
          {icon}
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            {label}
          </span>
          <span className="font-heading text-2xl font-semibold tracking-tight leading-none">
            {value}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

const workerColumns = [
  { label: "Ishchi" },
  { label: "Holat" },
  { label: "Reyting", className: "text-center" },
  { label: "Amallar", className: "text-right" },
];

function WorkersTable({
  workers,
  isLoading,
  search,
  onSearch,
}: {
  workers: WorkerSummaryDto[];
  isLoading: boolean;
  search: string;
  onSearch: (v: string) => void;
}) {
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
      title="Ishchilar ro'yxati"
      count={workers.length}
      searchPlaceholder="Ishchi qidirish..."
      searchValue={search}
      onSearchChange={onSearch}
      columns={workerColumns}
      data={workers}
      renderRow={(w) => (
        <TableRow key={w.id} className="group/row transition-colors duration-150 hover:bg-accent/40">
          <TableCell className="py-3">
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
            <Badge variant={w.isApproved ? "default" : "secondary"}>
              {w.isApproved ? "Tasdiqlangan" : "Kutilmoqda"}
            </Badge>
          </TableCell>
          <TableCell>
            <div className="flex items-center justify-center gap-1 text-sm font-medium tabular-nums">
              <Star className="size-3.5 fill-amber-500 text-amber-500" />
              {w.rating.toFixed(1)}
            </div>
          </TableCell>
          <TableCell className="text-right">
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={<Link href={`/dashboard/workers/${w.id}`} />}
            >
              Ko'rish
            </Button>
          </TableCell>
        </TableRow>
      )}
    />
  );
}

function WorkersCalendar() {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedCell, setSelectedCell] = useState<{
    workerName: string;
    workerInitials: string;
    displayDate: string;
    isoDate: string;
  } | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [taskSearch, setTaskSearch] = useState("");

  const { data: allWorkers = [], isLoading: isLoadingWorkers } = useWorkers(true);
  const { data: taskGroups = [], isLoading: isLoadingTasks } = useAdminTaskGroups();
  const isLoading = isLoadingWorkers || isLoadingTasks;

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

  const workerDayMap = useMemo(() => {
    const map = new Map<string, Map<string, string[]>>();
    for (const group of taskGroups) {
      const title = group.title ?? "Ish";
      for (const task of group.tasks ?? []) {
        if (!task.scheduledDate) continue;
        for (const tw of task.workers ?? []) {
          if (!tw.workerId) continue;
          if (!map.has(tw.workerId)) map.set(tw.workerId, new Map());
          const dayMap = map.get(tw.workerId)!;
          const existing = dayMap.get(task.scheduledDate) ?? [];
          dayMap.set(task.scheduledDate, [...existing, title]);
        }
      }
    }
    return map;
  }, [taskGroups]);

  const calendarWorkers = useMemo(() => {
    const weekKeys = new Set(weekDays.map((d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }));
    return allWorkers.map((w) => {
      const dayMap = workerDayMap.get(w.id);
      const weekTaskCount = dayMap
        ? Array.from(dayMap.entries())
            .filter(([k]) => weekKeys.has(k))
            .reduce((s, [, v]) => s + v.length, 0)
        : 0;
      return { worker: w, weekTaskCount };
    });
  }, [allWorkers, workerDayMap, weekDays]);

  const weekLabel = (() => {
    const mon = weekDays[0];
    const sun = weekDays[6];
    if (mon.getMonth() === sun.getMonth()) {
      return `${mon.getDate()}–${sun.getDate()} ${MONTHS_UZ[sun.getMonth()]} ${sun.getFullYear()}`;
    }
    return `${mon.getDate()} ${MONTHS_UZ[mon.getMonth()]} – ${sun.getDate()} ${MONTHS_UZ[sun.getMonth()]} ${sun.getFullYear()}`;
  })();

  function openAssignDialog(workerName: string, d: Date, isoDate: string) {
    const wd = (d.getDay() + 6) % 7;
    const wdNames = ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba", "Yakshanba"];
    setSelectedCell({
      workerName,
      workerInitials: workerName.slice(0, 2).toUpperCase(),
      displayDate: `${wdNames[wd]}, ${d.getDate()}-${MONTHS_UZ[d.getMonth()].toLowerCase()}`,
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
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setWeekOffset((o) => o - 1)}
                aria-label="Oldingi hafta"
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
                aria-label="Keyingi hafta"
                className="size-8 transition-colors hover:bg-accent"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWeekOffset(0)}
              className="h-8 transition-all duration-150 active:scale-[0.97]"
            >
              Bugun
            </Button>
          </div>
        </CardHeader>

        <div className="overflow-x-auto border-t border-border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 z-20 min-w-[180px] border-b border-r border-border bg-muted/50 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
                >
                  Ishchi ismi
                </th>
                <th
                  scope="col"
                  className="sticky left-[180px] z-20 min-w-[130px] border-b border-r border-border bg-muted/50 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
                >
                  Bu hafta
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
              {calendarWorkers.map(({ worker: w, weekTaskCount }, idx) => {
                const hue = workerHues[(idx % 6) + 1];
                const dayMap = workerDayMap.get(w.id);

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
                          {weekTaskCount} ish
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
                      const wd = (d.getDay() + 6) % 7;
                      const isDayOff = isWorkerDayOff(idx, wd);
                      const isToday = dateKey(d) === dateKey(today);
                      const y = d.getFullYear();
                      const mo = String(d.getMonth() + 1).padStart(2, "0");
                      const dy = String(d.getDate()).padStart(2, "0");
                      const isoDate = `${y}-${mo}-${dy}`;
                      const titles = dayMap?.get(isoDate) ?? [];
                      const isEmpty = titles.length === 0;

                      if (isDayOff) {
                        return (
                          <td
                            key={dateKey(d)}
                            className="min-w-[120px] border-b border-r border-border last:border-r-0 bg-muted/20 px-2 py-2 select-none"
                          >
                            <div className="flex h-7 items-center justify-center">
                              <span className="text-[10px] font-medium text-muted-foreground/35">
                                Dam
                              </span>
                            </div>
                          </td>
                        );
                      }

                      return (
                        <td
                          key={dateKey(d)}
                          onClick={isEmpty ? () => openAssignDialog(w.fullName ?? "Ishchi", d, isoDate) : undefined}
                          className={cn(
                            "min-w-[120px] border-b border-r border-border px-2 py-2 last:border-r-0 transition-colors duration-150 group/cell",
                            isToday
                              ? "bg-primary/5 group-hover/row:bg-primary/10"
                              : "bg-background group-hover/row:bg-accent/20",
                            isEmpty && "cursor-pointer hover:bg-accent/40",
                          )}
                        >
                          {isEmpty ? (
                            <div className="flex h-7 items-center justify-center opacity-0 group-hover/cell:opacity-50 transition-opacity duration-150">
                              <Plus className="size-3.5 text-muted-foreground" />
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1">
                              {titles.map((title, ti) => (
                                <div
                                  key={ti}
                                  className={cn(
                                    "truncate rounded-md px-2 py-1 text-[11px] font-medium ring-1 ring-inset leading-tight",
                                    hue?.chip,
                                  )}
                                  title={title}
                                >
                                  {title}
                                </div>
                              ))}
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
                    Tasdiqlangan ishchi topilmadi.
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
              Task tanlang
            </p>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Task qidirish..."
                className="h-8 pl-8 text-sm"
                value={taskSearch}
                onChange={(e) => setTaskSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Task radio cards */}
          <div className="flex flex-col gap-1 px-5 pb-4 max-h-64 overflow-y-auto">
            {(() => {
              const results = MOCK_ASSIGNABLE_TASKS.filter((t) =>
                taskSearch === "" ||
                t.label.toLowerCase().includes(taskSearch.toLowerCase()) ||
                t.property.toLowerCase().includes(taskSearch.toLowerCase())
              );
              if (results.length === 0) {
                return (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    &ldquo;{taskSearch}&rdquo; bo&apos;yicha task topilmadi
                  </p>
                );
              }
              return results.map((t) => {
                const isSelected = selectedTaskId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTaskId(t.id)}
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
                        {t.label}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <MapPin className="size-3 shrink-0" />
                        {t.property}
                      </span>
                    </div>
                  </button>
                );
              });
            })()}
          </div>

          {/* Footer */}
          <div className="-mx-0 border-t border-border bg-muted/40 px-5 py-3 flex items-center justify-end gap-2">
            <DialogDescription className="mr-auto text-xs text-muted-foreground">
              {selectedTaskId
                ? `Tanlandi: ${MOCK_ASSIGNABLE_TASKS.find((t) => t.id === selectedTaskId)?.label}`
                : "Bitta task tanlang"}
            </DialogDescription>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedCell(null)}
            >
              Bekor
            </Button>
            <Button
              size="sm"
              disabled={!selectedTaskId}
              onClick={() => setSelectedCell(null)}
            >
              Biriktirish
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
