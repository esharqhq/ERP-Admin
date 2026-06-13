"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

  const visibleGroups = groups.filter((g) =>
    nav.days.some((day) => getCellTasks(g, day).length > 0)
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Week navigation */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={nav.prev} aria-label="Previous week">
          <ChevronLeft className="size-4" />
        </Button>
        <span className="font-semibold text-sm min-w-[56px] text-center">{nav.label}</span>
        <Button variant="outline" size="icon" onClick={nav.next} aria-label="Next week">
          <ChevronRight className="size-4" />
        </Button>
        <span className="text-sm text-muted-foreground">{nav.dateRangeLabel}</span>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[800px] text-sm border-collapse">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left px-3 py-2 font-medium text-muted-foreground w-[200px] min-w-[160px] border-b border-border">
                {t("list.columns.title")}
              </th>
              {nav.days.map((day, i) => (
                <th
                  key={i}
                  className="px-2 py-2 font-medium text-muted-foreground text-center min-w-[110px] border-b border-border"
                >
                  {DAY_ABBR[i]} {pad2(day.getDate())}.{pad2(day.getMonth() + 1)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-3 py-3">
                    <Skeleton className="h-10 w-full rounded-md" />
                  </td>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-2 py-3">
                      <Skeleton className="h-10 w-full rounded-md" />
                    </td>
                  ))}
                </tr>
              ))
            ) : visibleGroups.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  {t("calendar.noTasksThisWeek")}
                </td>
              </tr>
            ) : (
              visibleGroups.map((group) => (
                <tr key={group.id} className="border-t border-border hover:bg-accent/20 transition-colors">
                  {/* Row label */}
                  <td className="px-3 py-3 align-top">
                    <div className="flex flex-col gap-1.5">
                      <span
                        className="font-medium truncate max-w-[180px] block"
                        title={group.title ?? undefined}
                      >
                        {group.title ?? "—"}
                      </span>
                      <TaskStatusBadge status={group.status} />
                    </div>
                  </td>

                  {/* Day cells */}
                  {nav.days.map((day, i) => {
                    const cellTasks = getCellTasks(group, day);
                    if (cellTasks.length === 0) {
                      return (
                        <td
                          key={i}
                          className="px-2 py-3 text-center text-muted-foreground/40 align-middle"
                        >
                          —
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
                        className={`px-2 py-2 align-top ${statusTintClasses(task.status)}`}
                      >
                        <div className="flex flex-col gap-0.5 text-xs">
                          <span className="font-medium tabular-nums">
                            {startTime}
                            {endTime ? ` – ${endTime}` : ""}
                          </span>
                          <span className="text-muted-foreground">
                            {workerCount} {t("calendar.workers")}
                          </span>
                          <span className="text-muted-foreground truncate max-w-[90px]">
                            {workerLabel}
                          </span>
                          {extra > 0 && (
                            <Badge
                              variant="outline"
                              className="w-fit text-[10px] px-1 py-0 h-4"
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
    </div>
  );
}
