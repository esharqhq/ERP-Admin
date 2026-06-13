"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useWeekNavigation } from "@/hooks/use-week-navigation";
import { normalizeStatus, type TaskGroupDto, type TaskItemDto } from "@/lib/types/task.types";
import { TaskStatusBadge } from "@/components/tasks/task-status-badge";

interface TasksCalendarProps {
  groups: TaskGroupDto[];
  isLoading: boolean;
}

// Local-time yyyy-MM-dd key — matches TaskItemDto.scheduledDate format
function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Extract HH:mm from ISO date-time string
function formatTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const timePart = dateStr.includes("T") ? dateStr.split("T")[1] : dateStr;
  return timePart.slice(0, 5);
}

function getCellTasks(group: TaskGroupDto, day: Date): TaskItemDto[] {
  const key = toLocalDateKey(day);
  return (group.tasks ?? []).filter((t) => t.scheduledDate === key);
}

function statusTintClasses(status: string): string {
  const s = normalizeStatus(status);
  if (s === "active")    return "bg-green-50 dark:bg-green-950/40 border-l-2 border-l-green-400";
  if (s === "pending")   return "bg-yellow-50 dark:bg-yellow-950/40 border-l-2 border-l-yellow-400";
  if (s === "review")    return "bg-blue-50 dark:bg-blue-950/40 border-l-2 border-l-blue-400";
  if (s === "done")      return "bg-muted/40 border-l-2 border-l-muted-foreground/30";
  if (s === "cancelled") return "bg-destructive/5 border-l-2 border-l-destructive/40";
  return "bg-muted/40 border-l-2 border-l-muted-foreground/30";
}

const DAY_ABBR = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function TasksCalendar({ groups, isLoading }: TasksCalendarProps) {
  const t = useTranslations("tasks");
  const nav = useWeekNavigation();
  const todayKey = toLocalDateKey(new Date());

  const visibleGroups = groups.filter((g) =>
    nav.days.some((day) => getCellTasks(g, day).length > 0)
  );

  return (
    <Card>
      {/* Week navigation */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Button variant="outline" size="icon-sm" onClick={nav.prev} aria-label="Previous week">
          <ChevronLeft className="size-4" />
        </Button>
        <span className="font-semibold text-sm min-w-[56px] text-center">{nav.label}</span>
        <Button variant="outline" size="icon-sm" onClick={nav.next} aria-label="Next week">
          <ChevronRight className="size-4" />
        </Button>
        <span className="text-sm text-muted-foreground">{nav.dateRangeLabel}</span>
      </div>

      {/* Grid */}
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm border-collapse">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground w-[200px] min-w-[160px] border-b border-border">
                  {t("list.columns.title")}
                </th>
                {nav.days.map((day, i) => {
                  const isToday = toLocalDateKey(day) === todayKey;
                  return (
                    <th
                      key={i}
                      className={`px-2 py-2.5 text-xs font-medium text-center min-w-[110px] border-b border-border ${
                        isToday ? "bg-primary/5" : ""
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className={`uppercase tracking-wide ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                          {DAY_ABBR[i]}
                        </span>
                        <span
                          className={`tabular-nums text-sm font-semibold leading-none flex size-7 items-center justify-center rounded-full ${
                            isToday
                              ? "bg-primary text-primary-foreground"
                              : "text-foreground"
                          }`}
                        >
                          {pad2(day.getDate())}
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-4 py-3">
                      <Skeleton className="h-14 w-full rounded-md" />
                    </td>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-2 py-3">
                        <Skeleton className="h-14 w-full rounded-md" />
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
                visibleGroups.map((group) => (
                  <tr key={group.id} className="border-t border-border hover:bg-accent/40 transition-colors">
                    {/* Row label */}
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-col gap-1.5">
                        <span
                          className="font-medium text-sm overflow-hidden truncate max-w-[180px] block"
                          title={group.title ?? undefined}
                        >
                          {group.title ?? "—"}
                        </span>
                        <TaskStatusBadge status={group.status} />
                      </div>
                    </td>

                    {/* Day cells */}
                    {nav.days.map((day, i) => {
                      const isToday = toLocalDateKey(day) === todayKey;
                      const cellTasks = getCellTasks(group, day);
                      if (cellTasks.length === 0) {
                        return (
                          <td
                            key={i}
                            className={`px-2 py-3 text-center text-muted-foreground/30 align-middle text-base ${isToday ? "bg-primary/5" : ""}`}
                          >
                            –
                          </td>
                        );
                      }
                      const task = cellTasks[0];
                      const extra = cellTasks.length - 1;
                      const startTime = formatTime(task.scheduledAt);
                      const endTime = task.deadline ? formatTime(task.deadline) : null;
                      const workerCount = (task.workers ?? []).length;
                      const firstWorkerName = task.workers?.[0]?.workerName ?? null;
                      const workerLabel = firstWorkerName
                        ? firstWorkerName.slice(0, 10)
                        : "—";

                      return (
                        <td
                          key={i}
                          className={`px-2.5 py-2.5 align-top ${statusTintClasses(task.status)}`}
                        >
                          <div className="flex flex-col gap-1 text-xs">
                            <span className="font-semibold tabular-nums text-foreground">
                              {startTime}
                              {endTime ? ` – ${endTime}` : ""}
                            </span>
                            <span className="text-muted-foreground">
                              {workerCount} {t("calendar.workers")}
                            </span>
                            <span className="text-muted-foreground/80 truncate max-w-[90px]">
                              {workerLabel}
                            </span>
                            {extra > 0 && (
                              <Badge
                                variant="outline"
                                className="w-fit text-[10px] px-1 py-0 h-4 mt-0.5"
                              >
                                +{extra}
                              </Badge>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
