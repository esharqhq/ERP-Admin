"use client";

import { ClipboardList, Lock, TriangleAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CardState } from "@/components/detail/card-state";
import { TaskStatusBadge } from "@/components/tasks/task-status-badge";
import { RowLink } from "@/components/ui/row-link";
import { activeWorkers } from "@/lib/tasks/staffing";
import type { TaskGroupDto } from "@/lib/types/task.types";

/**
 * Every booking ever made at this address — the design's *"Work booked here"*.
 *
 * Flattens groups to their child tasks, because a group is a recurrence and a
 * task is the visit an admin acts on. Newest first: the question this tab answers
 * is *"what has been happening here"*, and the answer starts with the present.
 *
 * ⚠ `title` lives on the **group**, never on the task, so it is carried down
 * rather than read off the row.
 */
export function PropertyWorkTab({
  groups,
  isPending,
  isForbidden,
  isError,
}: {
  groups: TaskGroupDto[];
  isPending: boolean;
  isForbidden: boolean;
  isError: boolean;
}) {
  const t = useTranslations("properties.detail.work");
  const locale = useLocale();

  if (isForbidden) {
    return (
      <CardState
        icon={<Lock className="size-4" />}
        title={t("forbidden")}
        hint={t("forbiddenWhy")}
      />
    );
  }
  if (isError) {
    return <CardState icon={<TriangleAlert className="size-4" />} title={t("error")} />;
  }
  if (isPending) {
    return (
      <div className="flex flex-col gap-2 py-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  const rows = groups
    .flatMap((g) => (g.tasks ?? []).map((task) => ({ task, title: g.title })))
    .sort((a, b) => Date.parse(b.task.scheduledAt) - Date.parse(a.task.scheduledAt));

  if (rows.length === 0) {
    return (
      <CardState
        icon={<ClipboardList className="size-4" />}
        title={t("empty")}
        hint={t("emptyWhy")}
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={HEAD}>{t("when")}</TableHead>
            <TableHead className={HEAD}>{t("what")}</TableHead>
            <TableHead className={HEAD}>{t("staffing")}</TableHead>
            <TableHead className={HEAD}>{t("status")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ task, title }) => {
            const filled = activeWorkers(task).length;
            const short = filled < task.requiredWorkerCount;
            return (
              <TableRow key={task.id} className="relative h-14 cursor-pointer">
                <TableCell className="px-4 font-mono text-[13px] text-muted-foreground">
                  <RowLink href={`/dashboard/tasks/${task.id}`} label={title ?? task.id} />
                  {formatWhen(task.scheduledAt, locale)}
                </TableCell>
                <TableCell className="px-4 text-sm">
                  {title ?? <span className="text-muted-foreground">{t("untitled")}</span>}
                </TableCell>
                <TableCell className="px-4">
                  <span
                    className={
                      short
                        ? "font-mono text-[13px] text-status-cancelled-deep"
                        : "font-mono text-[13px] text-muted-foreground"
                    }
                  >
                    {filled}/{task.requiredWorkerCount}
                  </span>
                </TableCell>
                <TableCell className="px-4">
                  {/* The badge the tasks screens already use — one status
                      vocabulary, so "Done" cannot come to mean two things on two
                      screens. */}
                  <TaskStatusBadge status={task.status} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

const HEAD =
  "px-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground";

function formatWhen(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" })} · ${d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}`;
}
