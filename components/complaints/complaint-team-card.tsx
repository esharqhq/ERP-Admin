"use client";

import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PhotoGrid } from "@/components/complaints/photo-grid";
import { VACATED_OUTCOMES } from "@/lib/tasks/staffing";
import { normalizeStatus } from "@/lib/types/task.types";
import type { TaskItemDto, TaskMediaListItem } from "@/lib/types/task.types";
import { cn } from "@/lib/utils";

function fmtTime(iso: string | null, locale: string): string {
  if (!iso) return "–";
  return new Intl.DateTimeFormat(locale, { timeStyle: "short" }).format(new Date(iso));
}

/**
 * `TaskWorkerOutcomeName` (lowercased) → the `complaints.team.outcome.*` key.
 * `noshow` is the one spelling mismatch — the enum has no separating word, the
 * i18n key does, for readability.
 */
const OUTCOME_LABEL_KEY: Record<string, string> = {
  pending: "pending",
  completed: "completed",
  noshow: "noShow",
  removed: "removed",
  cancelled: "cancelled",
};

/**
 * The outcome word, translated where the outcome is one of the five the wire
 * promises — and the raw wire value, untranslated, for anything else. Outcomes
 * are typed as a closed enum (`TaskWorkerOutcomeName`) but this reads them as a
 * bare `string`, so a sixth value the server adds later prints rather than
 * throws or silently disappearing.
 */
function outcomeLabel(outcome: string, t: (key: string) => string): string {
  const key = OUTCOME_LABEL_KEY[normalizeStatus(outcome)];
  return key ? t(`outcome.${key}`) : outcome || "—";
}

/**
 * The team's side: who filed the day, what they wrote when they handed it in,
 * who was there, and their evidence photos (`GET /api/tasks/{id}/media` — URL
 * in `storageKey`). The admin reads this against the owner's card.
 */
export function ComplaintTeamCard({
  task,
  media,
  mediaForbidden,
  mediaLoading,
  mediaError,
}: {
  task: TaskItemDto;
  media: TaskMediaListItem[] | undefined;
  mediaForbidden: boolean;
  mediaLoading: boolean;
  mediaError: boolean;
}) {
  const t = useTranslations("complaints.team");
  const locale = useLocale();
  const workers = task.workers ?? [];
  const supervisor = workers.find((w) => w.workerId === task.supervisorWorkerId);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">{t("supervisor")}: </span>
          {supervisor?.workerName ?? (
            task.supervisorWorkerId ? (
              <span className="font-mono">{task.supervisorWorkerId}</span>
            ) : (
              t("noSupervisor")
            )
          )}
        </div>

        {workers.length === 0 ? (
          <p className="text-muted-foreground">{t("noWorkers")}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {workers.map((w) => {
              // A vacated row (Removed/Cancelled/NoShow — `VACATED_OUTCOMES`)
              // is not "on the team" — the decision screen must not read it as
              // part of the crew that was there. A no-show is muted along with
              // the other two: they were never actually on site either. Muted,
              // not struck through: the row is still evidence.
              const vacated = VACATED_OUTCOMES.has(normalizeStatus(w.outcome));
              return (
                <li key={w.id} className="flex items-center justify-between gap-3 py-1.5">
                  <span
                    className={cn(
                      "flex min-w-0 items-center gap-1.5 truncate",
                      vacated && "text-muted-foreground",
                    )}
                  >
                    <span className="truncate">
                      {w.workerName ?? <span className="font-mono">{w.workerId}</span>}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {outcomeLabel(w.outcome, t)}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                    {t("checkin")} {fmtTime(w.checkinAt, locale)} · {t("checkout")} {fmtTime(w.checkoutAt, locale)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex flex-col gap-1">
          <span className="overline-label text-muted-foreground">{t("summary")}</span>
          <p className="whitespace-pre-wrap">{task.workSummary || t("noSummary")}</p>
        </div>

        <div className="flex flex-col gap-2">
          <span className="overline-label text-muted-foreground">{t("evidence")}</span>
          {mediaForbidden ? (
            <p className="text-muted-foreground">{t("evidenceForbidden")}</p>
          ) : mediaLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : mediaError ? (
            <p className="text-muted-foreground">{t("evidenceError")}</p>
          ) : (
            <PhotoGrid
              emptyText={t("noEvidence")}
              photos={(media ?? []).map((m) => ({
                id: m.id,
                url: m.storageKey,
                name: m.originalFileName,
                mimeType: m.mimeType,
              }))}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
