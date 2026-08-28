"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Building2, Eye, EyeOff } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { weekdayLabels } from "@/lib/tasks/month-grid";
import { useWeekNavigation } from "@/hooks/use-week-navigation";
import { useAdminTaskGroups } from "@/hooks/use-tasks";
import { useProperties } from "@/hooks/use-properties";
import { normalizeStatus, type TaskGroupDto, type TaskItemDto } from "@/lib/types/task.types";
import { propertyPalette } from "@/lib/calendar-utils";
import { cn } from "@/lib/utils";

const VACATED = new Set(["removed", "cancelled", "noshow"]);

function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtTime(s: string | null | undefined): string {
  if (!s) return "";
  const t = s.includes("T") ? s.split("T")[1] : s;
  return t.slice(0, 5);
}

function activeWorkerCount(task: TaskItemDto): number {
  return (task.workers ?? []).filter((w) => !VACATED.has(normalizeStatus(w.outcome))).length;
}

function getCellTask(group: TaskGroupDto, isoDate: string): TaskItemDto | null {
  return (group.tasks ?? []).find((t) => t.scheduledDate === isoDate) ?? null;
}

/**
 * The week grid. Used standalone on the Tasks screen (every group) and scoped
 * to a single owner on Owner Detail.
 */
export function TasksCalendar({
  ownerUserId,
  properties: propertiesProp,
}: {
  /** Scope to one owner's groups. Omit for every group. */
  ownerUserId?: string;
  /**
   * Properties for the filter. Owner Detail already holds this owner's
   * properties, so passing them avoids a second, wider request that would also
   * offer properties this owner does not own.
   */
  properties?: { id: string; name: string | null }[];
} = {}) {
  const t = useTranslations("tasks");
  const locale = useLocale();
  // Derived, not hardcoded: this list used to be the German abbreviations, which
  // an English admin then had to read. Shared with `MonthDatePicker`.
  const weekdays = useMemo(() => weekdayLabels(locale), [locale]);
  const tW = useTranslations("workers");
  const nav = useWeekNavigation();
  const todayKey = toLocalDateKey(new Date());

  const [propertyFilter, setPropertyFilter] = useState("");
  const [hideEmpty, setHideEmpty] = useState(false);

  const { data: groups = [], isLoading } = useAdminTaskGroups(
    ownerUserId,
    propertyFilter || undefined,
  );
  const { data: fetchedProperties = [] } = useProperties(!propertiesProp);
  const properties = propertiesProp ?? fetchedProperties;

  const weekDateKeys = useMemo(
    () => nav.days.map(toLocalDateKey),
    [nav.days],
  );

  const visibleGroups = useMemo(() => {
    if (!hideEmpty) return groups;
    return groups.filter((g) =>
      weekDateKeys.some((key) => getCellTask(g, key) !== null),
    );
  }, [groups, hideEmpty, weekDateKeys]);

  return (
    <Card className="overflow-hidden">
      {/* Header: week nav + filters */}
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={nav.prev}
              className="size-8 hover:bg-accent"
              aria-label="Previous week"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-[56px] text-center text-sm font-bold tracking-tight">
              {nav.label}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={nav.next}
              className="size-8 hover:bg-accent"
              aria-label="Next week"
            >
              <ChevronRight className="size-4" />
            </Button>
            <span className="ml-1 text-sm text-muted-foreground">{nav.dateRangeLabel}</span>
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={propertyFilter || undefined}
              onValueChange={(v) => setPropertyFilter(v ?? "")}
            >
              <SelectTrigger size="sm" className="w-44">
                <SelectValue placeholder={tW("calendar.allProperties")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{tW("calendar.allProperties")}</SelectItem>
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
              title={hideEmpty ? tW("calendar.showEmpty") : tW("calendar.hideEmpty")}
            >
              {hideEmpty ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              <span className="text-xs">
                {hideEmpty ? tW("calendar.showEmpty") : tW("calendar.hideEmpty")}
              </span>
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Grid */}
      <div className="scrollbar-slim overflow-x-auto border-t border-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-20 min-w-[200px] border-b border-r border-border bg-muted/50 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
              >
                {t("list.columns.title")}
              </th>
              {nav.days.map((day, i) => {
                const key = weekDateKeys[i];
                const isToday = key === todayKey;
                const wd = (day.getDay() + 6) % 7;
                const isWeekend = wd >= 5;
                return (
                  <th
                    key={key}
                    scope="col"
                    className={cn(
                      "min-w-[150px] border-b border-r border-border px-3 py-2 text-center last:border-r-0",
                      isToday ? "bg-primary/10" : isWeekend ? "bg-muted/25" : "bg-muted/50",
                    )}
                  >
                    <div
                      className={cn(
                        "text-[11px] font-medium uppercase tracking-[0.06em]",
                        isWeekend ? "text-muted-foreground/40" : "text-muted-foreground",
                      )}
                    >
                      {weekdays[wd]}
                    </div>
                    <span
                      className={cn(
                        "mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                        isToday
                          ? "bg-primary text-primary-foreground"
                          : isWeekend
                          ? "text-muted-foreground/40"
                          : "text-foreground",
                      )}
                    >
                      {day.getDate()}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-4 py-3">
                    <Skeleton className="h-16 w-full rounded-md" />
                  </td>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-2 py-2">
                      <Skeleton className="h-16 w-full rounded-md" />
                    </td>
                  ))}
                </tr>
              ))
            ) : visibleGroups.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="py-16 text-center text-sm text-muted-foreground"
                >
                  {t("calendar.noTasksThisWeek")}
                </td>
              </tr>
            ) : (
              visibleGroups.map((group) => {
                const pal = propertyPalette(group.propertyId);
                const startTime = fmtTime(group.defaultStartTime);
                const endTime = fmtTime(group.defaultDeadline);

                return (
                  <tr key={group.id} className="group/row border-t border-border">
                    {/* Left sticky label */}
                    <td className="sticky left-0 z-10 min-w-[200px] border-r border-border bg-background px-4 py-2.5 align-top transition-colors duration-150 group-hover/row:bg-accent/30">
                      <div className="flex flex-col gap-0.5">
                        <span
                          className="truncate text-[13px] font-semibold leading-tight text-foreground"
                          title={group.title ?? undefined}
                        >
                          {group.title ?? "—"}
                        </span>
                        {(startTime || endTime) && (
                          <span className="text-[11px] tabular-nums text-muted-foreground">
                            {startTime}{endTime ? ` – ${endTime}` : ""}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Day cells */}
                    {weekDateKeys.map((isoDate, i) => {
                      const isToday = isoDate === todayKey;
                      const wd = (nav.days[i].getDay() + 6) % 7;
                      const isWeekend = wd >= 5;
                      const task = getCellTask(group, isoDate);

                      if (!task) {
                        return (
                          <td
                            key={isoDate}
                            className={cn(
                              "min-w-[150px] border-r border-border px-1.5 py-1.5 last:border-r-0 align-middle text-center text-muted-foreground/25 transition-colors duration-150",
                              isToday
                                ? "bg-primary/5 group-hover/row:bg-primary/10"
                                : isWeekend
                                ? "bg-muted/10 group-hover/row:bg-accent/15"
                                : "bg-background group-hover/row:bg-accent/20",
                            )}
                          >
                            –
                          </td>
                        );
                      }

                      const assigned = activeWorkerCount(task);
                      const required = task.requiredWorkerCount;
                      const isFull = assigned >= required;
                      const propName =
                        task.propertyName ??
                        properties.find((p) => p.id === group.propertyId)?.name ??
                        group.propertyId.slice(0, 8);

                      return (
                        <td
                          key={isoDate}
                          className={cn(
                            "min-w-[150px] border-r border-border px-1.5 py-1.5 last:border-r-0 align-top transition-colors duration-150",
                            isToday
                              ? "bg-primary/5 group-hover/row:bg-primary/10"
                              : isWeekend
                              ? "bg-muted/10 group-hover/row:bg-accent/15"
                              : "bg-background group-hover/row:bg-accent/20",
                          )}
                        >
                          <div
                            className={cn("rounded-md p-1.5 text-[11px] leading-tight", pal.bg, pal.text)}
                            title={`${group.title} — ${propName}`}
                          >
                            {/* Time + fraction */}
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <span className="font-semibold tabular-nums">
                                {fmtTime(task.scheduledAt)}
                                {task.deadline ? ` – ${fmtTime(task.deadline)}` : endTime ? ` – ${endTime}` : ""}
                              </span>
                              <span
                                className={cn(
                                  "rounded px-1 text-[10px] font-bold tabular-nums",
                                  pal.sub,
                                  !isFull && "opacity-60",
                                )}
                              >
                                {assigned}/{required}
                              </span>
                            </div>
                            {/* Title */}
                            <div className="truncate font-medium">{group.title ?? "—"}</div>
                            {/* Property chip */}
                            <div
                              className={cn(
                                "mt-1 flex w-fit max-w-full items-center gap-1 rounded px-1 py-0.5",
                                pal.sub,
                              )}
                            >
                              <Building2 className="size-2.5 shrink-0 opacity-70" />
                              <span className="truncate text-[10px] font-medium opacity-90">
                                {propName}
                              </span>
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
