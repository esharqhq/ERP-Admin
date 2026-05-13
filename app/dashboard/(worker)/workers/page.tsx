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
import {
  ChevronLeft,
  ChevronRight,
  LayoutList,
  CalendarDays,
  Star,
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
  { id: 1, name: "Jasur Toshmatov",  role: "Senior",       status: "Verified",  tasks: 12, rating: 4.8 },
  { id: 2, name: "Dilnoza Yusupova", role: "Professional", status: "Verified",  tasks: 8,  rating: 4.5 },
  { id: 3, name: "Bobur Karimov",    role: "Junior",       status: "Pending",   tasks: 3,  rating: 3.9 },
  { id: 4, name: "Malika Saidova",   role: "Professional", status: "Verified",  tasks: 10, rating: 4.7 },
  { id: 5, name: "Otabek Nazarov",   role: "Senior",       status: "Expired",   tasks: 0,  rating: 4.2 },
  { id: 6, name: "Zulfiya Rakhimova",role: "Junior",       status: "Rejected",  tasks: 0,  rating: 3.1 },
];

const statusVariant: Record<
  Worker["status"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  Verified: "default",
  Pending:  "secondary",
  Expired:  "outline",
  Rejected: "destructive",
};

const roleColors: Record<Worker["role"], string> = {
  Senior:       "text-blue-600 dark:text-blue-400",
  Professional: "text-emerald-600 dark:text-emerald-400",
  Junior:       "text-amber-600 dark:text-amber-400",
};

const workerHues: Record<number, { chip: string; dot: string }> = {
  1: { chip: "bg-blue-500/12 text-blue-700 dark:text-blue-300 ring-blue-500/25",     dot: "bg-blue-500" },
  2: { chip: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 ring-emerald-500/25", dot: "bg-emerald-500" },
  3: { chip: "bg-amber-500/12 text-amber-700 dark:text-amber-300 ring-amber-500/25", dot: "bg-amber-500" },
  4: { chip: "bg-violet-500/12 text-violet-700 dark:text-violet-300 ring-violet-500/25", dot: "bg-violet-500" },
  5: { chip: "bg-rose-500/12 text-rose-700 dark:text-rose-300 ring-rose-500/25",     dot: "bg-rose-500" },
  6: { chip: "bg-cyan-500/12 text-cyan-700 dark:text-cyan-300 ring-cyan-500/25",     dot: "bg-cyan-500" },
};

type Assignment = { workerId: number; offset: number; title: string };

const assignmentSeed: Assignment[] = [
  { workerId: 1, offset: -3, title: "Yashnobod – montaj" },
  { workerId: 2, offset: -1, title: "Mirzo Ulugbek – ta'mir" },
  { workerId: 4, offset: 0,  title: "Chilonzor – inspeksiya" },
  { workerId: 1, offset: 0,  title: "Yunusobod – topshirish" },
  { workerId: 3, offset: 1,  title: "Sergeli – yetkazish" },
  { workerId: 6, offset: 2,  title: "Yakkasaroy – montaj" },
  { workerId: 2, offset: 4,  title: "Bektemir – ta'mir" },
  { workerId: 5, offset: 5,  title: "Olmazor – diagnostika" },
  { workerId: 4, offset: 7,  title: "Mirobod – topshirish" },
  { workerId: 1, offset: 8,  title: "Shayxontohur – montaj" },
  { workerId: 3, offset: 10, title: "Uchtepa – yetkazish" },
  { workerId: 6, offset: 12, title: "Yashnobod – diagnostika" },
  { workerId: 2, offset: 14, title: "Mirzo Ulugbek – ta'mir" },
  { workerId: 4, offset: 16, title: "Sergeli – inspeksiya" },
];

const WEEKDAYS = ["Du", "Se", "Cho", "Pa", "Ju", "Sha", "Ya"];
const MONTHS_UZ = [
  "Yanvar", "Fevral", "Mart",    "Aprel", "May",    "Iyun",
  "Iyul",   "Avgust", "Sentabr", "Oktabr","Noyabr", "Dekabr",
];

function dateKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export default function WorkersPage() {
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
  { label: "Lavozim" },
  { label: "Holat" },
  { label: "Faol",    className: "text-center" },
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
    const map = new Map<number, Map<string, string>>();
    for (const a of assignmentSeed) {
      const d = new Date(today);
      d.setDate(today.getDate() + a.offset);
      const key = dateKey(d);
      if (!map.has(a.workerId)) map.set(a.workerId, new Map());
      map.get(a.workerId)!.set(key, a.title);
    }
    return map;
  }, [today]);

  const weekLabel = (() => {
    const mon = weekDays[0];
    const sun = weekDays[6];
    if (mon.getMonth() === sun.getMonth()) {
      return `${mon.getDate()}–${sun.getDate()} ${MONTHS_UZ[sun.getMonth()]} ${sun.getFullYear()}`;
    }
    return `${mon.getDate()} ${MONTHS_UZ[mon.getMonth()]} – ${sun.getDate()} ${MONTHS_UZ[sun.getMonth()]} ${sun.getFullYear()}`;
  })();

  return (
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
                Statistikasi
              </th>
              {weekDays.map((d) => {
                const isToday = dateKey(d) === dateKey(today);
                const wd = (d.getDay() + 6) % 7;
                return (
                  <th
                    key={dateKey(d)}
                    scope="col"
                    className={cn(
                      "min-w-[120px] border-b border-r border-border px-3 py-2 text-center last:border-r-0",
                      isToday ? "bg-primary/10" : "bg-muted/50",
                    )}
                  >
                    <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                      {WEEKDAYS[wd]}
                    </div>
                    <span
                      className={cn(
                        "mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums transition-colors",
                        isToday
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground",
                      )}
                    >
                      {d.getDate()}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {workers.map((w) => (
              <tr key={w.id} className="group/row">
                <td className="sticky left-0 z-10 min-w-[180px] border-b border-r border-border bg-background px-4 py-3 transition-colors duration-150 group-hover/row:bg-accent/30">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="size-8 shrink-0 ring-1 ring-border">
                      <AvatarFallback className="bg-muted text-[10px] font-semibold">
                        {w.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-[13px] font-medium leading-tight">
                        {w.name}
                      </span>
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        ID #{w.id.toString().padStart(4, "0")}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="sticky left-[180px] z-10 min-w-[130px] border-b border-r border-border bg-background px-4 py-3 transition-colors duration-150 group-hover/row:bg-accent/30">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[13px] font-medium tabular-nums">
                      {w.tasks} ish
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
                  const title = workerDayMap.get(w.id)?.get(dateKey(d));
                  return (
                    <td
                      key={dateKey(d)}
                      className={cn(
                        "min-w-[120px] border-b border-r border-border px-2 py-2 last:border-r-0 transition-colors duration-150",
                        isToday
                          ? "bg-primary/5 group-hover/row:bg-primary/10"
                          : "bg-background group-hover/row:bg-accent/20",
                      )}
                    >
                      {title && (
                        <div
                          className={cn(
                            "truncate rounded-md px-2 py-1 text-[11px] font-medium ring-1 ring-inset leading-tight",
                            workerHues[w.id]?.chip,
                          )}
                          title={title}
                        >
                          {title}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
