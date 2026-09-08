"use client";

import { useLocale, useTranslations } from "next-intl";
import { Lock, Star, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { StaffingPipMeter } from "@/components/tasks/staffing-pip-meter";
import type { LeaveScope } from "@/lib/leave/scope";

const EFFECT_ICON = {
  vacated: Trash2,
  noshow: Star,
  kept: Lock,
} as const;

const EFFECT_TAG = {
  vacated: "bg-destructive/10 text-destructive",
  noshow: "bg-destructive text-destructive-foreground",
  kept: "bg-muted text-muted-foreground",
} as const;

interface Props {
  scope: LeaveScope;
  isLoading: boolean;
  isError: boolean;
  /** Group targets over-count; a single-date target cannot. */
  hedged: boolean;
}

/**
 * The list of dates approval will vacate — the cell the old table spent on the
 * word "TaskGroup".
 *
 * Staffing is drawn as it will read **after** the decision, because that is the
 * number the admin has to refill against, not the one that is true while they
 * are still deciding.
 */
export function LeaveScopeList({ scope, isLoading, isError, hedged }: Props) {
  const t = useTranslations("leave");
  const locale = useLocale();

  const heading = (
    <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      {t("scope.heading")}
    </h3>
  );

  if (isLoading) {
    return (
      <section className="flex flex-col gap-2">
        {heading}
        <div className="flex flex-col gap-1.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full rounded-lg" />
          ))}
        </div>
      </section>
    );
  }

  if (isError || !scope.resolved) {
    return (
      <section className="flex flex-col gap-2">
        {heading}
        <p className="rounded-lg bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
          {t("scope.unresolved")}
        </p>
      </section>
    );
  }

  const kept = scope.rows.length - scope.vacated - scope.noShow;

  return (
    <section className="flex flex-col gap-2">
      {heading}

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-md bg-destructive/10 px-1.5 py-0.5 text-[11px] font-semibold text-destructive">
          {hedged
            ? t("scope.vacatedUpTo", { count: scope.vacated })
            : t("scope.vacated", { count: scope.vacated })}
        </span>
        {scope.noShow > 0 && (
          <span className="rounded-md bg-destructive px-1.5 py-0.5 text-[11px] font-semibold text-destructive-foreground">
            {t("scope.noShow", { count: scope.noShow })}
          </span>
        )}
        {kept > 0 && (
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
            {t("scope.kept", { count: kept })}
          </span>
        )}
      </div>

      <ul className="flex flex-col gap-1">
        {scope.rows.map((row) => {
          const Icon = EFFECT_ICON[row.effect];
          const short = row.effect === "noshow" ? "noShowShort" : row.effect;
          const date = new Date(row.scheduledAt);
          return (
            <li
              key={row.taskId}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
                row.effect === "noshow"
                  ? "border-destructive/40 bg-destructive/5"
                  : row.effect === "vacated"
                    ? "border-destructive/15 bg-background"
                    : "border-border bg-background"
              }`}
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span
                  className={`text-xs font-semibold ${
                    row.effect === "kept" ? "text-muted-foreground" : "text-foreground"
                  }`}
                >
                  {date.toLocaleDateString(locale, {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                  <span className="ml-2 font-mono font-normal text-muted-foreground">
                    {/* Shifts are rostered on a 24-hour clock; "02:00 PM" is
                        two glyphs longer and slower to scan against a column of
                        start times. `de` is already 24h — this pins `en` to it. */}
                    {date.toLocaleTimeString(locale, {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })}
                  </span>
                </span>
                <span className="truncate text-[11px] text-muted-foreground">
                  {row.propertyName ?? "—"}
                </span>
              </span>

              <StaffingPipMeter
                filled={row.filledAfter}
                required={row.required}
                urgent={row.effect !== "kept" && row.filledAfter < row.required}
              />

              <span
                className={`flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${EFFECT_TAG[row.effect]}`}
              >
                <Icon className="size-2.5" />
                {t(`scope.tag.${short}`)}
              </span>
            </li>
          );
        })}
      </ul>

      {hedged && (
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {t("scope.hedgeNote")}
        </p>
      )}
    </section>
  );
}
