"use client";

import { useLocale, useTranslations } from "next-intl";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { SkillRequestStatusBadge } from "@/components/skill-requests/status-badge";
import { useWorkerSkillRequestHistory } from "@/hooks/use-skill-requests";
import { useHasPermission } from "@/hooks/use-current-permissions";
import { formatDay } from "@/lib/ui/relative-time";

/**
 * This worker's skill-request history — **read-only**.
 *
 * ⚠ **It does not list the skills the worker holds.** Those are already rendered
 * beside the name in `hero-card.tsx`. This card is the request *history*, which is
 * the thing that has no home anywhere else: a rejected request and a request that
 * was never made look identical on the profile and different here.
 *
 * No actions. Revoke lives on the decision screen, because the request row is the
 * handle the backend acts on — there is no "remove skill X from worker Y" route,
 * deliberately.
 *
 * ⚠ **Four reads behind this, and one will not do** — see
 * `useWorkerSkillRequestHistory`. The endpoint's `status` is a single enum whose
 * absence means the two open states, so a whole history is the bare call plus one
 * per decided status.
 */
export function WorkerSkillRequestsCard({ workerId }: { workerId: string }) {
  const t = useTranslations("skillRequests.workerCard");
  const locale = useLocale();

  /**
   * `useHasPermission` is right here, unlike on the queue: this card is one of
   * several on a page that already renders, so collapsing "denied" into "not yet
   * known" costs a brief absence rather than a flash of the wrong state — and the
   * queue's cold-start problem does not apply to a card that may simply not appear.
   */
  const canRead = useHasPermission("worker_profession_request:read");
  const { rows, isLoading, isError } = useWorkerSkillRequestHistory(
    workerId,
    canRead,
  );

  if (!canRead) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-9 rounded-lg" />
            <Skeleton className="h-9 rounded-lg" />
          </div>
        ) : isError ? (
          <p className="text-sm text-muted-foreground">{t("error")}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {rows.map((row) => (
              <li key={row.id} className="first:pt-0 last:pb-0">
                <Link
                  href={`/dashboard/skill-requests/${row.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg py-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-[13px] font-medium leading-snug">
                      {locale === "de"
                        ? row.professionNameDe
                        : row.professionNameEn}
                    </span>
                    <span className="text-[11px] leading-none text-muted-foreground">
                      {formatDay(row.createdAt, locale)}
                    </span>
                  </span>
                  <SkillRequestStatusBadge status={row.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
