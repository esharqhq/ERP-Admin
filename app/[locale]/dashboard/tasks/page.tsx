"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Search, Eye } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAdminTaskGroups } from "@/hooks/use-tasks";
import {
  normalizeStatus,
  TASK_GROUP_STATUS_FILTERS,
  type TaskGroupStatusFilter,
  type TaskGroupDto,
} from "@/lib/types/task.types";

function GroupStatusBadge({ status }: { status: string }) {
  const s = normalizeStatus(status);
  const variant =
    s === "active"
      ? "default"
      : s === "done"
        ? "secondary"
        : s === "cancelled"
          ? "destructive"
          : "outline";
  return <Badge variant={variant}>{status || "—"}</Badge>;
}

function dateRange(group: TaskGroupDto): string {
  const dates = (group.dates ?? [])
    .map((d) => d.scheduledDate)
    .filter(Boolean)
    .sort();
  if (dates.length === 0) return "—";
  if (dates.length === 1) return dates[0];
  return `${dates[0]} → ${dates[dates.length - 1]}`;
}

function distinctWorkers(group: TaskGroupDto): number {
  const ids = new Set<string>();
  for (const task of group.tasks ?? []) {
    for (const tw of task.workers ?? []) ids.add(tw.workerId);
  }
  return ids.size;
}

export default function TasksPage() {
  const t = useTranslations("tasks");
  const tCommon = useTranslations("common");
  const [tab, setTab] = useState<TaskGroupStatusFilter>("all");
  const [search, setSearch] = useState("");

  const { data: groups = [], isLoading, isError } = useAdminTaskGroups();

  const filtered = groups.filter((g) => {
    if (tab !== "all" && normalizeStatus(g.status) !== normalizeStatus(tab)) {
      return false;
    }
    if (!search) return true;
    return (g.title ?? "").toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-border bg-muted/50 p-0.5">
          {TASK_GROUP_STATUS_FILTERS.map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(`list.tabs.${key}`)}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <p className="text-xs text-muted-foreground">
            {isLoading
              ? tCommon("loading")
              : tCommon("resultsFound", { count: filtered.length })}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("list.columns.title")}</TableHead>
                <TableHead>{t("list.columns.status")}</TableHead>
                <TableHead>{t("list.columns.dates")}</TableHead>
                <TableHead className="text-center">
                  {t("list.columns.tasks")}
                </TableHead>
                <TableHead className="text-center">
                  {t("list.columns.workers")}
                </TableHead>
                <TableHead className="text-right">
                  {t("list.columns.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-8 w-full rounded-md" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-sm text-destructive"
                  >
                    {tCommon("error")}
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    {t("list.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((group) => (
                  <TableRow key={group.id} className="hover:bg-accent/40">
                    <TableCell className="py-3 font-medium">
                      {group.title ?? "—"}
                    </TableCell>
                    <TableCell>
                      <GroupStatusBadge status={group.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {dateRange(group)}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {(group.tasks ?? []).length}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {distinctWorkers(group)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        nativeButton={false}
                        className="gap-1.5 text-muted-foreground"
                        render={<Link href={`/dashboard/tasks/${group.id}`} />}
                      >
                        <Eye className="size-3.5" />
                        {tCommon("view")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
