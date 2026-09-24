"use client";

import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { DataColumn } from "@/components/ui/data-table/types";
import { hoursWaiting, isEscalated, type ComplaintQueueRow } from "@/lib/complaints/waiting";

function fmt(iso: string, locale: string, withDate = true): string {
  return new Intl.DateTimeFormat(locale, withDate ? { dateStyle: "short", timeStyle: "short" } : { timeStyle: "short" }).format(new Date(iso));
}

/**
 * Four columns (DS max is seven). One badge per row. Numbers and times in mono.
 * `raisedAt` is `undefined` while its per-day read is in flight → skeleton;
 * `null` when that read failed → `–`, and the row stays in the queue.
 */
export function useComplaintColumns(now: Date): DataColumn<ComplaintQueueRow>[] {
  const t = useTranslations("complaints");
  const locale = useLocale();

  return useMemo<DataColumn<ComplaintQueueRow>[]>(
    () => [
      {
        id: "day",
        label: t("columns.day"),
        locked: true,
        className: "w-[160px]",
        cell: (r) => <span className="font-mono text-sm tabular-nums">{fmt(r.task.scheduledAt, locale)}</span>,
      },
      {
        id: "property",
        label: t("columns.property"),
        className: "min-w-[220px]",
        cell: (r) => (
          <div className="flex min-w-0 flex-col gap-px">
            <span className="truncate font-medium">{r.task.propertyName ?? "–"}</span>
            <span className="truncate text-xs text-muted-foreground">
              {r.task.completedAt ? t("handedIn", { time: fmt(r.task.completedAt, locale) }) : "–"}
            </span>
          </div>
        ),
      },
      {
        id: "waiting",
        label: t("columns.waiting"),
        align: "right",
        className: "w-[120px]",
        cell: (r) => {
          if (r.raisedAt === undefined) return <Skeleton className="ml-auto h-4 w-12" />;
          const hours = hoursWaiting(r.raisedAt, now);
          if (hours === null) return <span className="text-muted-foreground">–</span>;
          return (
            <span className="inline-flex items-center justify-end gap-1 font-mono tabular-nums">
              {isEscalated(r.raisedAt, now) ? <AlertTriangle className="size-3.5 text-destructive" /> : null}
              {t("hours", { hours })}
            </span>
          );
        },
      },
      {
        id: "state",
        label: t("columns.state"),
        className: "w-[130px]",
        cell: (r) =>
          isEscalated(r.raisedAt, now) ? (
            <Badge tone="danger">{t("state.escalated")}</Badge>
          ) : (
            <Badge tone="warning">{t("state.open")}</Badge>
          ),
      },
    ],
    [t, locale, now],
  );
}
