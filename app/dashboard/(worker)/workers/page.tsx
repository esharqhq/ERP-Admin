"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TableCell, TableRow } from "@/components/ui/table";
import { DataTableCard } from "@/components/ui/data-table-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  UserPlus,
  ChevronLeft,
  ChevronRight,
  LayoutList,
  CalendarDays,
  MapPin,
  Star,
  Users,
  BadgeCheck,
  Briefcase,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Worker = {
  id: number;
  name: string;
  role: "Senior" | "Professional" | "Junior";
  status: "Verified" | "Pending" | "Expired" | "Rejected";
  tasks: number;
  rating: number;
};

const workers: Worker[] = [
  {
    id: 1,
    name: "Jasur Toshmatov",
    role: "Senior",
    status: "Verified",
    tasks: 12,
    rating: 4.8,
  },
  {
    id: 2,
    name: "Dilnoza Yusupova",
    role: "Professional",
    status: "Verified",
    tasks: 8,
    rating: 4.5,
  },
  {
    id: 3,
    name: "Bobur Karimov",
    role: "Junior",
    status: "Pending",
    tasks: 3,
    rating: 3.9,
  },
  {
    id: 4,
    name: "Malika Saidova",
    role: "Professional",
    status: "Verified",
    tasks: 10,
    rating: 4.7,
  },
  {
    id: 5,
    name: "Otabek Nazarov",
    role: "Senior",
    status: "Expired",
    tasks: 0,
    rating: 4.2,
  },
  {
    id: 6,
    name: "Zulfiya Rakhimova",
    role: "Junior",
    status: "Rejected",
    tasks: 0,
    rating: 3.1,
  },
];

const statusVariant: Record<
  Worker["status"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  Verified: "default",
  Pending: "secondary",
  Expired: "outline",
  Rejected: "destructive",
};

const roleColors: Record<Worker["role"], string> = {
  Senior: "text-blue-600 dark:text-blue-400",
  Professional: "text-emerald-600 dark:text-emerald-400",
  Junior: "text-amber-600 dark:text-amber-400",
};

const workerHues: Record<number, { chip: string; dot: string }> = {
  1: {
    chip: "bg-blue-500/12 text-blue-700 dark:text-blue-300 ring-blue-500/25",
    dot: "bg-blue-500",
  },
  2: {
    chip: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 ring-emerald-500/25",
    dot: "bg-emerald-500",
  },
  3: {
    chip: "bg-amber-500/12 text-amber-700 dark:text-amber-300 ring-amber-500/25",
    dot: "bg-amber-500",
  },
  4: {
    chip: "bg-violet-500/12 text-violet-700 dark:text-violet-300 ring-violet-500/25",
    dot: "bg-violet-500",
  },
  5: {
    chip: "bg-rose-500/12 text-rose-700 dark:text-rose-300 ring-rose-500/25",
    dot: "bg-rose-500",
  },
  6: {
    chip: "bg-cyan-500/12 text-cyan-700 dark:text-cyan-300 ring-cyan-500/25",
    dot: "bg-cyan-500",
  },
};

type Assignment = { workerId: number; offset: number; title: string };

const assignmentSeed: Assignment[] = [
  { workerId: 1, offset: -3, title: "Yashnobod – montaj" },
  { workerId: 2, offset: -1, title: "Mirzo Ulugbek – ta'mir" },
  { workerId: 4, offset: 0, title: "Chilonzor – inspeksiya" },
  { workerId: 1, offset: 0, title: "Yunusobod – topshirish" },
  { workerId: 3, offset: 1, title: "Sergeli – yetkazish" },
  { workerId: 6, offset: 2, title: "Yakkasaroy – montaj" },
  { workerId: 2, offset: 4, title: "Bektemir – ta'mir" },
  { workerId: 5, offset: 5, title: "Olmazor – diagnostika" },
  { workerId: 4, offset: 7, title: "Mirobod – topshirish" },
  { workerId: 1, offset: 8, title: "Shayxontohur – montaj" },
  { workerId: 3, offset: 10, title: "Uchtepa – yetkazish" },
  { workerId: 6, offset: 12, title: "Yashnobod – diagnostika" },
  { workerId: 2, offset: 14, title: "Mirzo Ulugbek – ta'mir" },
  { workerId: 4, offset: 16, title: "Sergeli – inspeksiya" },
];

const WEEKDAYS = ["Du", "Se", "Cho", "Pa", "Ju", "Sha", "Ya"];
const WEEKDAYS_LONG_UZ = [
  "Dushanba",
  "Seshanba",
  "Chorshanba",
  "Payshanba",
  "Juma",
  "Shanba",
  "Yakshanba",
];
const MONTHS_UZ = [
  "Yanvar",
  "Fevral",
  "Mart",
  "Aprel",
  "May",
  "Iyun",
  "Iyul",
  "Avgust",
  "Sentabr",
  "Oktabr",
  "Noyabr",
  "Dekabr",
];

function formatLongDate(d: Date) {
  const wd = (d.getDay() + 6) % 7;
  return `${WEEKDAYS_LONG_UZ[wd]}, ${d.getDate()}-${MONTHS_UZ[d.getMonth()].toLowerCase()} ${d.getFullYear()}`;
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function buildEventMap(
  today: Date,
): Map<string, (Assignment & { worker: Worker })[]> {
  const map = new Map<string, (Assignment & { worker: Worker })[]>();
  for (const a of assignmentSeed) {
    const worker = workers.find((w) => w.id === a.workerId);
    if (!worker) continue;
    const d = new Date(today);
    d.setDate(today.getDate() + a.offset);
    const key = dateKey(d);
    const list = map.get(key) ?? [];
    list.push({ ...a, worker });
    map.set(key, list);
  }
  return map;
}

function buildMonthGrid(viewYear: number, viewMonth: number) {
  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startWeekday = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(viewYear, viewMonth, 1 - startWeekday);
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push(d);
  }
  return cells;
}

export default function WorkersPage() {
  const stats = useMemo(() => {
    const total = workers.length;
    const verified = workers.filter((w) => w.status === "Verified").length;
    const activeTasks = workers.reduce((s, w) => s + w.tasks, 0);
    const avgRating = (
      workers.reduce((s, w) => s + w.rating, 0) / total
    ).toFixed(1);
    return { total, verified, activeTasks, avgRating };
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* H1 — single primary focal point. tracking-tight tightens letter-spacing on large headings (UI/UX §4) */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">
            Workers
          </h1>
          <p className="text-sm text-muted-foreground">
            Ishchilarni boshqaring va monitoring qiling.
          </p>
        </div>
        {/* Primary action — only one per view (UI/UX §8). Shadow + scale on press = clear signifier */}
      </div>

      <Tabs defaultValue="table" className="gap-4">
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

        <TabsContent value="table">
          <WorkersTable />
        </TabsContent>

        <TabsContent value="calendar">
          <WorkersCalendar />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const STAT_TONES: Record<string, { ring: string; bg: string; text: string }> = {
  blue: {
    ring: "ring-blue-500/20",
    bg: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
  },
  emerald: {
    ring: "ring-emerald-500/20",
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  violet: {
    ring: "ring-violet-500/20",
    bg: "bg-violet-500/10",
    text: "text-violet-600 dark:text-violet-400",
  },
  amber: {
    ring: "ring-amber-500/20",
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
  },
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
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg ring-1",
            t.ring,
            t.bg,
            t.text,
          )}
        >
          {icon}
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          {/* small caps label — wider tracking per UI/UX §4 */}
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
  { label: "Lavozim" },
  { label: "Holat" },
  { label: "Faol", className: "text-center" },
  { label: "Reyting", className: "text-center" },
  { label: "Amallar", className: "text-right" },
];

function WorkersTable() {
  return (
    <DataTableCard
      title="Ishchilar ro'yxati"
      count={workers.length}
      searchPlaceholder="Ishchi qidirish..."
      columns={workerColumns}
      data={workers}
      renderRow={(w) => (
        <TableRow key={w.id} className="group/row transition-colors duration-150 hover:bg-accent/40">
          <TableCell className="py-3">
            <div className="flex items-center gap-3">
              <Avatar className="size-9 ring-1 ring-border">
                <AvatarFallback className="bg-muted text-[11px] font-semibold">
                  {w.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-medium leading-tight">{w.name}</span>
                <span className="text-[11px] text-muted-foreground">
                  ID #{w.id.toString().padStart(4, "0")}
                </span>
              </div>
            </div>
          </TableCell>
          <TableCell>
            <span className={cn("text-sm font-medium", roleColors[w.role])}>{w.role}</span>
          </TableCell>
          <TableCell>
            <Badge variant={statusVariant[w.status]}>{w.status}</Badge>
          </TableCell>
          <TableCell className="text-center">
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-muted px-2 text-xs font-semibold tabular-nums">
              {w.tasks}
            </span>
          </TableCell>
          <TableCell>
            <div className="flex items-center justify-center gap-1 text-sm font-medium tabular-nums">
              <Star className="size-3.5 fill-amber-500 text-amber-500" />
              {w.rating.toFixed(1)}
            </div>
          </TableCell>
          <TableCell className="text-right">
            <Button variant="ghost" size="sm">Ko'rish</Button>
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

  const [view, setView] = useState(() => ({
    year: today.getFullYear(),
    month: today.getMonth(),
  }));
  const [selected, setSelected] = useState<Date | null>(null);

  const events = useMemo(() => buildEventMap(today), [today]);
  const cells = useMemo(() => buildMonthGrid(view.year, view.month), [view]);

  const selectedEvents = selected ? (events.get(dateKey(selected)) ?? []) : [];

  const goPrev = () =>
    setView((v) =>
      v.month === 0
        ? { year: v.year - 1, month: 11 }
        : { ...v, month: v.month - 1 },
    );
  const goNext = () =>
    setView((v) =>
      v.month === 11
        ? { year: v.year + 1, month: 0 }
        : { ...v, month: v.month + 1 },
    );
  const goToday = () =>
    setView({ year: today.getFullYear(), month: today.getMonth() });

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* H2-level title — semibold, tighter tracking (UI/UX §2, §4) */}
            <h2 className="font-heading text-xl font-semibold tracking-tight leading-none">
              {MONTHS_UZ[view.month]}{" "}
              <span className="text-muted-foreground font-medium">
                {view.year}
              </span>
            </h2>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={goPrev}
                aria-label="Oldingi oy"
                className="size-8 transition-colors hover:bg-accent"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={goNext}
                aria-label="Keyingi oy"
                className="size-8 transition-colors hover:bg-accent"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={goToday}
              className="h-8 transition-all duration-150 active:scale-[0.97]"
            >
              Bugun
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground">
            {workers.slice(0, 6).map((w) => (
              <div key={w.id} className="flex items-center gap-1.5">
                <span
                  className={cn("size-2 rounded-full", workerHues[w.id]?.dot)}
                />
                <span className="font-medium">{w.name.split(" ")[0]}</span>
              </div>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="grid grid-cols-7 border-t border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {WEEKDAYS.map((wd) => (
            <div key={wd} className="px-2 py-2.5 text-center">
              {wd}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 grid-rows-6">
          {cells.map((d, i) => {
            const inMonth = d.getMonth() === view.month;
            const isToday = d.getTime() === today.getTime();
            const isWeekend = i % 7 >= 5;
            const dayEvents = events.get(dateKey(d)) ?? [];
            const visible = dayEvents.slice(0, 3);
            const overflow = dayEvents.length - visible.length;

            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelected(d)}
                className={cn(
                  "group/day flex min-h-[120px] flex-col gap-1.5 border-r border-b border-border p-2 text-left outline-none",
                  // micro-interaction: 150ms ease (UI/UX §10)
                  "transition-colors duration-150 ease-out",
                  "[&:nth-child(7n)]:border-r-0",
                  i >= 35 && "border-b-0",
                  inMonth ? "bg-background" : "bg-muted/30",
                  isWeekend && inMonth && "bg-muted/15",
                  // hover/focus signifier (UI/UX §1, §9)
                  "hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset",
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums transition-colors",
                      inMonth ? "text-foreground" : "text-muted-foreground/50",
                      isToday && "bg-primary text-primary-foreground shadow-sm",
                    )}
                  >
                    {d.getDate()}
                  </span>
                  {dayEvents.length > 0 && !isToday && (
                    <span className="text-[10px] font-semibold text-muted-foreground/60 tabular-nums">
                      {dayEvents.length}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  {visible.map((ev, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "flex items-center gap-1.5 truncate rounded-md px-1.5 py-1 text-[11px] font-medium ring-1 ring-inset leading-tight",
                        // soft elevation on hover, ease-out 150ms
                        "transition-all duration-150 ease-out group-hover/day:translate-x-0.5",
                        workerHues[ev.worker.id]?.chip,
                      )}
                      title={`${ev.worker.name} — ${ev.title}`}
                    >
                      <span
                        className={cn(
                          "size-1.5 shrink-0 rounded-full",
                          workerHues[ev.worker.id]?.dot,
                        )}
                      />
                      <span className="truncate">
                        {ev.worker.name.split(" ")[0]}
                      </span>
                      <span className="truncate font-normal opacity-70">
                        · {ev.title}
                      </span>
                    </div>
                  ))}
                  {overflow > 0 && (
                    <span className="px-1.5 text-[10px] font-medium text-muted-foreground/80">
                      +{overflow} ko'proq
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>

      <Sheet
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <SheetContent className="w-full gap-0 sm:max-w-md">
          <SheetHeader className="border-b border-border">
            <SheetTitle className="font-heading text-lg font-semibold tracking-tight">
              {selected ? formatLongDate(selected) : ""}
            </SheetTitle>
            <SheetDescription>
              {selectedEvents.length > 0
                ? `${selectedEvents.length} ta biriktirilgan ish`
                : "Bu kunga biriktirilgan ish yo'q"}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4">
            {selectedEvents.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                  <CalendarDays className="size-5 text-muted-foreground" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">Bu kun bo'sh</span>
                  <span className="text-xs text-muted-foreground">
                    Hech qanday ish biriktirilmagan
                  </span>
                </div>
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {selectedEvents.map((ev, idx) => (
                  <li
                    key={idx}
                    className="rounded-lg border border-border bg-card p-3 transition-all duration-150 ease-out hover:border-foreground/15 hover:bg-accent/30 hover:shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          "mt-1.5 size-2.5 shrink-0 rounded-full",
                          workerHues[ev.worker.id]?.dot,
                        )}
                      />
                      <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar className="size-9 shrink-0 ring-1 ring-border">
                              <AvatarFallback className="bg-muted text-[11px] font-semibold">
                                {ev.worker.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex flex-col gap-0.5">
                              <div className="truncate text-sm font-semibold leading-tight">
                                {ev.worker.name}
                              </div>
                              <div
                                className={cn(
                                  "text-[11px] font-medium",
                                  roleColors[ev.worker.role],
                                )}
                              >
                                {ev.worker.role}
                              </div>
                            </div>
                          </div>
                          <Badge variant={statusVariant[ev.worker.status]}>
                            {ev.worker.status}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 rounded-md bg-muted/50 px-2.5 py-1.5">
                          <MapPin className="size-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate text-[13px] font-medium">
                            {ev.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1 font-medium">
                            <Star className="size-3 fill-amber-500 text-amber-500" />
                            <span className="tabular-nums text-foreground">
                              {ev.worker.rating.toFixed(1)}
                            </span>
                          </span>
                          <span className="text-border">|</span>
                          <span>
                            <span className="tabular-nums font-medium text-foreground">
                              {ev.worker.tasks}
                            </span>{" "}
                            faol topshiriq
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </Card>
  );
}
