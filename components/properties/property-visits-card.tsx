"use client";

import { CalendarClock, Lock, TriangleAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CardState } from "@/components/detail/card-state";
import { activeWorkers } from "@/lib/tasks/staffing";
import type { UpcomingVisit } from "@/lib/properties/visits";

const SHOWN = 4;

/**
 * The visits still coming to this address, from the task engine.
 *
 * Reads the **same** `getAdminTaskGroups(_, propertyId)` response the attention
 * band does, so the band's "unassigned" chip and this card's badge can never
 * disagree about the same shift.
 *
 * ⚠ **`Unassigned` means short of `requiredWorkerCount`, not empty.** A shift
 * needing two bodies with one booked is still short, and calling it assigned is
 * how a job goes unstaffed with a green badge on it.
 */
export function PropertyVisitsCard({
  visits,
  isPending,
  isForbidden,
  isError,
}: {
  visits: UpcomingVisit[];
  isPending: boolean;
  isForbidden: boolean;
  isError: boolean;
}) {
  const t = useTranslations("properties.detail.visits");
  const locale = useLocale();

  return (
    <Card>
      <CardHeader className="gap-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-heading text-base font-semibold tracking-tight">
            {t("title")}
          </span>
          <span className="text-[11px] text-muted-foreground">{t("source")}</span>
        </div>
      </CardHeader>
      <CardContent>
        {isForbidden ? (
          /* A refusal is not an error: it names the missing grant instead of
             telling an admin to reload a page they may simply not read. */
          <CardState
            icon={<Lock className="size-4" />}
            title={t("forbidden")}
            hint={t("forbiddenWhy")}
          />
        ) : isError ? (
          <CardState icon={<TriangleAlert className="size-4" />} title={t("error")} />
        ) : isPending ? (
          <div className="flex flex-col gap-2.5 py-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : visits.length === 0 ? (
          <CardState
            icon={<CalendarClock className="size-4" />}
            title={t("empty")}
            hint={t("emptyWhy")}
          />
        ) : (
          <ul className="flex flex-col gap-2.5">
            {visits.slice(0, SHOWN).map((v) => (
              <li key={v.task.id} className="flex items-center gap-3">
                {/* Weekday over day-of-month, as drawn: an admin scanning a side
                    column reads "Thu 27", not a full date. */}
                <span className="flex size-10 flex-none flex-col items-center justify-center rounded-lg bg-muted/60">
                  <span className="text-[9.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                    {weekday(v.task.scheduledAt, locale)}
                  </span>
                  <span className="font-mono text-[13px] font-semibold leading-none">
                    {dayOfMonth(v.task.scheduledAt, locale)}
                  </span>
                </span>

                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[13px] font-medium leading-tight">
                    {v.title ?? t("untitled")}
                  </span>
                  <span className="truncate font-mono text-[11px] text-muted-foreground">
                    {time(v.task.scheduledAt, locale)} ·{" "}
                    {t("staffed", {
                      filled: activeWorkers(v.task).length,
                      required: v.task.requiredWorkerCount,
                    })}
                  </span>
                </div>

                <Badge
                  variant={v.unassigned ? "destructive" : "secondary"}
                  className="flex-none font-normal"
                >
                  {v.unassigned ? t("unassigned") : t("assigned")}
                </Badge>
              </li>
            ))}
            {visits.length > SHOWN && (
              <li className="text-[11px] text-muted-foreground">
                {t("more", { count: visits.length - SHOWN })}
              </li>
            )}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function weekday(iso: string, locale: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString(locale, { weekday: "short" });
}

function dayOfMonth(iso: string, locale: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(locale, { day: "numeric" });
}

function time(iso: string, locale: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}
