"use client";

import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { DataColumn } from "@/components/ui/data-table/types";
import { hoursWaiting, isEscalated, type ComplaintQueueRow } from "@/lib/complaints/waiting";
import { cn } from "@/lib/utils";

function fmt(iso: string, locale: string, withDate = true): string {
  return new Intl.DateTimeFormat(locale, withDate ? { dateStyle: "short", timeStyle: "short" } : { timeStyle: "short" }).format(new Date(iso));
}

/**
 * The day it was handed in — mono, like `complaint-evidence-card.tsx`'s
 * "Raised" line, so every timestamp on this queue reads the same register.
 * Shared by the table's property column and the phone card.
 */
function HandedInLine({ completedAt, locale }: { completedAt: string | null; locale: string }) {
  const t = useTranslations("complaints");
  return (
    <span className="truncate font-mono text-xs tabular-nums text-muted-foreground">
      {completedAt ? t("handedIn", { time: fmt(completedAt, locale) }) : "–"}
    </span>
  );
}

/**
 * Hours waited, or a skeleton while the per-day read is in flight, or `–` when
 * it failed. Shared by the table's waiting column (right-aligned) and the
 * phone card (left-aligned) — same skeleton/dash rule either way.
 */
function WaitingValue({
  raisedAt,
  now,
  align,
}: {
  raisedAt: string | null | undefined;
  now: Date;
  align?: "right";
}) {
  const t = useTranslations("complaints");
  if (raisedAt === undefined) {
    return <Skeleton className={cn("h-4 w-12", align === "right" && "ml-auto")} />;
  }
  const hours = hoursWaiting(raisedAt, now);
  if (hours === null) return <span className="text-muted-foreground">–</span>;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-mono tabular-nums",
        align === "right" && "justify-end",
      )}
    >
      {isEscalated(raisedAt, now) ? <AlertTriangle className="size-3.5 text-destructive" /> : null}
      {t("hours", { hours })}
    </span>
  );
}

/** One badge per row — escalated past 48h, or still simply open. */
function ComplaintStateBadge({ raisedAt, now }: { raisedAt: string | null | undefined; now: Date }) {
  const t = useTranslations("complaints");
  return isEscalated(raisedAt, now) ? (
    <Badge tone="danger">{t("state.escalated")}</Badge>
  ) : (
    <Badge tone="warning">{t("state.open")}</Badge>
  );
}

/**
 * One complaint, below 768px — §3.1's stacked row-card, never a horizontally
 * scrolling table. The identity line (property, then the day's date·time in
 * mono, then when it was handed in) sits opposite the one status badge; the
 * one key metric — hours waited — gets its own line underneath, exactly the
 * skeleton/dash/escalated rule the desktop column uses.
 *
 * No link of its own: the shell already overlays `RowLink` (from `rowHref`)
 * over whatever `mobileCard` returns, the same way it does for the table row.
 */
export function ComplaintRowCard({ row, now }: { row: ComplaintQueueRow; now: Date }) {
  const locale = useLocale();

  return (
    <div className="flex min-w-0 flex-col gap-2.5 px-4 py-3.5">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-sm font-semibold leading-tight">
            {row.task.propertyName ?? "–"}
          </span>
          <span className="truncate font-mono text-[11px] text-muted-foreground tabular-nums">
            {fmt(row.task.scheduledAt, locale)}
          </span>
          <HandedInLine completedAt={row.task.completedAt} locale={locale} />
        </div>
        <ComplaintStateBadge raisedAt={row.raisedAt} now={now} />
      </div>
      <WaitingValue raisedAt={row.raisedAt} now={now} />
    </div>
  );
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
            <HandedInLine completedAt={r.task.completedAt} locale={locale} />
          </div>
        ),
      },
      {
        id: "waiting",
        label: t("columns.waiting"),
        align: "right",
        className: "w-[120px]",
        cell: (r) => <WaitingValue raisedAt={r.raisedAt} now={now} align="right" />,
      },
      {
        id: "state",
        label: t("columns.state"),
        className: "w-[130px]",
        cell: (r) => <ComplaintStateBadge raisedAt={r.raisedAt} now={now} />,
      },
    ],
    [t, locale, now],
  );
}
