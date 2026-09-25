"use client";

import { useMemo } from "react";
import { AlertTriangle, ArrowRight, CalendarCheck, ChevronRight, Clock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Can } from "@/components/auth/can";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SummaryTile } from "@/components/ui/summary-strip";
import { useCurrentPermissions } from "@/hooks/use-current-permissions";
import { useStaffingList } from "@/hooks/use-staffing";
import { Link } from "@/i18n/navigation";
import { rowStaffing } from "@/lib/tasks/dispatch-row";
import { staffingAlert } from "@/lib/tasks/staffing-alert";
import { cn } from "@/lib/utils";

/** Enough to act on from the home page; the rest is one click away on Dispatch. */
const ROW_LIMIT = 5;

/**
 * The admin "Critical list" on the home page (F-07 ·8) — short-handed days
 * starting within 24 h, the ones under six hours marked.
 *
 * Built from the DS kit rather than drawn fresh:
 * - the two counts are `SummaryTile`s (critical / warning, neutral at zero) —
 *   the tiles Dispatch's strip uses, so the two screens read alike;
 * - each day is a DS *menu row*: a 36px tinted icon tile carrying the urgency,
 *   the property over its start time in mono, the staffing fraction on the right;
 * - the empty state is the DS one — icon tile, a plain statement, one action.
 *
 * Here and not on Dispatch: Dispatch already loads a fortnight and counts the
 * same gap itself. This card is for the admin who has not opened it yet.
 *
 * ⚠ **A day that has already started is not in this list** — the server drops it
 * (`ScheduledAt > now`). Dispatch keeps it, deliberately, because a started day
 * with nobody on it is the most urgent row there is. The description says so, or
 * an empty card would read as "nothing is short" while one is.
 *
 * ⚠ No "in N hours" countdown. The 82/83 bodies are bounds, not points, and this
 * card states the start time and which bound it is under — the same facts the
 * bell gives.
 *
 * Gated on `task:list_any` on its own, not on the page's analytics permission.
 * The Dispatch links are gated on `task:assign_worker_any`, Dispatch's own grant —
 * an admin is never sent to a section they cannot use. The link says "see all",
 * not "N more": Dispatch opens on "Needs workers", which does not hold a partly
 * staffed day.
 */
export function StaffingAlertCard() {
  const t = useTranslations("dashboard.staffing");
  const locale = useLocale();
  const { permissions } = useCurrentPermissions();
  const allowed = permissions?.has("task:list_any") === true;

  const warning = useStaffingList("Warning", allowed);
  const critical = useStaffingList("Critical", allowed);

  const alert = useMemo(
    () =>
      warning.data && critical.data
        ? staffingAlert(warning.data, critical.data, ROW_LIMIT)
        : null,
    [warning.data, critical.data],
  );

  // Unresolved or denied: no card at all, rather than a skeleton that vanishes.
  if (!allowed) return null;

  const isError = warning.isError || critical.isError;
  const hasRows = (alert?.rows.length ?? 0) > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("desc")}</CardDescription>
        {hasRows ? (
          <CardAction>
            <Can permission="task:assign_worker_any">
              <Button
                variant="ghost"
                size="sm"
                nativeButton={false}
                className="gap-1 text-primary"
                render={<Link href="/dashboard/dispatch" />}
              >
                {t("openDispatch")}
                <ArrowRight className="size-3.5" aria-hidden />
              </Button>
            </Can>
          </CardAction>
        ) : null}
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        {isError ? (
          <p className="flex flex-1 items-center justify-center py-8 text-center text-sm text-destructive">
            {t("error")}
          </p>
        ) : !alert ? (
          <Loading />
        ) : (
          <>
            <div className="flex flex-wrap gap-2.5">
              <SummaryTile
                icon={<AlertTriangle className="size-4" />}
                title={t("critical.title")}
                detail={t("critical.detail")}
                action=""
                tone="critical"
                count={alert.within6h}
                showCount
              />
              <SummaryTile
                icon={<Clock className="size-4" />}
                title={t("warning.title")}
                detail={t("warning.detail")}
                action=""
                tone="warning"
                count={alert.within6to24h}
                showCount
              />
            </div>

            {hasRows ? (
              <ul className="flex flex-col overflow-hidden rounded-[14px] ring-1 ring-foreground/[0.08]">
                {alert.rows.map(({ task, critical: isCritical }) => {
                  const staffing = rowStaffing(task);
                  const Icon = isCritical ? AlertTriangle : Clock;
                  return (
                    <li key={task.id} className="border-b border-border/60 last:border-b-0">
                      <Link
                        href={`/dashboard/tasks/${task.groupId}`}
                        className="flex min-h-14 items-center gap-3 px-3 py-2.5 transition-colors duration-[140ms] hover:bg-muted/50"
                      >
                        <span
                          className={cn(
                            "flex size-9 shrink-0 items-center justify-center rounded-[10px]",
                            isCritical
                              ? "bg-status-cancelled-tint text-status-cancelled-deep"
                              : "bg-status-pending-tint text-status-pending-deep",
                          )}
                        >
                          <Icon className="size-4" aria-hidden />
                          <span className="sr-only">
                            {isCritical ? t("critical.title") : t("warning.title")}
                          </span>
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="truncate text-sm font-medium">
                            {task.propertyName ?? "–"}
                          </span>
                          <span className="font-mono text-xs text-muted-foreground">
                            {new Date(task.scheduledAt).toLocaleString(locale, {
                              weekday: "short",
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </span>
                        <span className="flex flex-col items-end gap-0.5">
                          <span className="font-mono text-sm font-semibold tabular-nums">
                            {staffing.filled}/{staffing.required}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {t("workers")}
                          </span>
                        </span>
                        <ChevronRight
                          className="size-4 shrink-0 text-muted-foreground"
                          aria-hidden
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Empty />
            )}

            {alert.hidden > 0 ? (
              <p className="text-xs text-muted-foreground">
                {t("hidden", { count: alert.hidden })}
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** The DS empty state: icon tile, a plain statement, one action, no illustration. */
function Empty() {
  const t = useTranslations("dashboard.staffing");
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3.5 py-6 text-center">
      <span className="flex size-11 items-center justify-center rounded-[14px] bg-accent text-accent-foreground">
        <CalendarCheck className="size-5" aria-hidden />
      </span>
      <span className="flex flex-col gap-1">
        <span className="text-[15px] font-semibold">{t("empty.title")}</span>
        <span className="text-[13px] text-muted-foreground">{t("empty.detail")}</span>
      </span>
      <Can permission="task:assign_worker_any">
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href="/dashboard/dispatch" />}
        >
          {t("empty.action")}
        </Button>
      </Can>
    </div>
  );
}

/** Tiles and rows at their real height — never a spinner. */
function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2.5">
        <Skeleton className="h-11 min-w-[13rem] flex-1 rounded-xl" />
        <Skeleton className="h-11 min-w-[13rem] flex-1 rounded-xl" />
      </div>
      <div className="flex flex-col gap-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-md" />
        ))}
      </div>
    </div>
  );
}
