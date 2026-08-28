"use client";

import { use, useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AttentionStrip } from "@/components/detail/attention-strip";
import { ConversationsCard } from "@/components/detail/conversations-card";
import { WorkerActions } from "@/components/workers/worker-actions";
import { WorkerDocumentsCard } from "@/components/workers/worker-documents-card";
import { WorkerHeroCard } from "@/components/workers/hero-card";
import { ShiftsCard } from "@/components/workers/shifts-card";
import { RatingSnapshotCard } from "@/components/workers/rating-snapshot-card";
import { useWorkerDetail, useWorkerRating } from "@/hooks/use-worker-detail";
import {
  useApproveWorkerDoc,
  useRejectWorkerDoc,
  useWorkerDocs,
} from "@/hooks/use-worker-docs";
import { useWorkerContractCover } from "@/hooks/use-contracts";
import { useCurrentPermissions } from "@/hooks/use-current-permissions";
import { useWeekNavigation } from "@/hooks/use-week-navigation";
import { useWorkerShifts, summariseWeek } from "@/hooks/use-worker-shifts";
import { useToday } from "@/hooks/use-today";
import { summariseAttention } from "@/lib/detail/attention";
import { deriveWorkerAttention } from "@/lib/workers/attention";

export default function WorkerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations("workers");
  const tAttention = useTranslations("workers.attention");
  const today = useToday();

  const { data: worker, isLoading, isError } = useWorkerDetail(id);

  /**
   * Read through `useCurrentPermissions` rather than `useHasPermission`, which
   * collapses "denied" and "not resolved yet" into one `false`. That collapse is
   * the right default for a *button* — hiding it costs nothing — but two cards
   * here state the refusal in words, and on a cold start (first login of a
   * session, nothing cached) they would assert "you cannot read this" for one
   * paint before the real answer arrived.
   */
  const { permissions } = useCurrentPermissions();
  const canViewDocs =
    permissions === null ? null : permissions.has("worker:doc:read_any");
  const canViewRating =
    permissions === null ? null : permissions.has("worker_rating:read_any");

  const { data: docs = [], isLoading: isLoadingDocs } = useWorkerDocs(
    id,
    canViewDocs === true,
  );
  const { mutate: approveDoc, isPending: isApprovingDoc } =
    useApproveWorkerDoc(id);
  const { mutate: rejectDoc, isPending: isRejectingDoc } =
    useRejectWorkerDoc(id);

  const { data: rating, isLoading: isLoadingRating } = useWorkerRating(
    id,
    canViewRating === true,
  );

  const contract = useWorkerContractCover(id);

  /**
   * The week is owned here because three things read it: the grid, the identity
   * band's on-time and hours, and the attention strip's lateness slot. A card
   * holding its own navigation would let them describe different weeks while
   * looking like one screen.
   */
  const nav = useWeekNavigation();
  const week = useWorkerShifts(id, nav.days);
  const weekSummary = useMemo(() => summariseWeek(week.shifts), [week.shifts]);

  const attention = useMemo(() => {
    if (!worker) return null;
    return deriveWorkerAttention({
      worker,
      documents: {
        docs,
        canRead: canViewDocs,
        isPending: canViewDocs === true && isLoadingDocs,
      },
      contract,
      week: {
        shifts: week.shifts,
        canRead: week.canRead,
        isPending: week.isPending,
        isError: week.isError,
      },
      today,
      copy: {
        licence: () => t("band.licence"),
        passport: () => t("band.passport"),
        papersTitle: (v) => tAttention("papersTitle", v),
        papersLapsedTitle: (v) => tAttention("papersLapsedTitle", v),
        papersDetail: () => tAttention("papersDetail"),
        papersLapsedDetail: () => tAttention("papersLapsedDetail"),
        papersAction: () => tAttention("papersAction"),

        docsTitle: (v) => tAttention("docsTitle", v),
        docsDetail: (v) => tAttention("docsDetail", v),
        docsAction: () => tAttention("docsAction"),
        docsUnknown: () => tAttention("docsUnknown"),
        docsUnknownDetail: () => tAttention("docsUnknownDetail"),

        coverExpiredTitle: () => tAttention("coverExpiredTitle"),
        coverExpiredDetail: () => tAttention("coverExpiredDetail"),
        coverEndingTitle: (v) => tAttention("coverEndingTitle", v),
        coverEndingDetail: () => tAttention("coverEndingDetail"),
        coverNoneTitle: () => tAttention("coverNoneTitle"),
        coverNoneDetail: () => tAttention("coverNoneDetail"),
        coverAction: () => tAttention("coverAction"),
        coverUnknown: () => tAttention("coverUnknown"),
        coverUnknownDetail: () => tAttention("coverUnknownDetail"),

        weekMissed: (v) => tAttention("weekMissed", v),
        weekLate: (v) => tAttention("weekLate", v),
        weekDetail: (v) => tAttention("weekDetail", v),
        weekAction: () => tAttention("weekAction"),
        weekUnknown: () => tAttention("weekUnknown"),
        weekUnknownDetail: () => tAttention("weekUnknownDetail"),
      },
    });
    // `contract` and `week` are fresh objects each render; their fields are the
    // real inputs, so the list names those rather than the wrappers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    worker,
    docs,
    canViewDocs,
    isLoadingDocs,
    contract.cover,
    contract.canRead,
    contract.isPending,
    contract.error,
    week.shifts,
    week.canRead,
    week.isPending,
    week.isError,
    today,
    t,
    tAttention,
  ]);

  const backButton = (
    <Button
      variant="ghost"
      size="sm"
      nativeButton={false}
      render={<Link href="/dashboard/workers" />}
      className="-ml-2 gap-1.5 text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" />
      {t("actions.backToList")}
    </Button>
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5">
        {backButton}
        {/* Mirrors the real layout — strip, band, then the 2/1 split — so the
            page settles rather than jumping once the reads land. */}
        <Skeleton className="h-[68px] w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
        <div className="grid gap-5 xl:grid-cols-3">
          <Skeleton className="h-96 rounded-xl xl:col-span-2" />
          <div className="flex flex-col gap-5">
            <Skeleton className="h-56 rounded-xl" />
            <Skeleton className="h-36 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !worker) {
    return (
      <div className="flex flex-col gap-5">
        {backButton}
        <p className="text-sm text-destructive">{t("notFound")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {backButton}
        <WorkerActions worker={worker} />
      </div>

      {attention ? (
        <AttentionStrip
          summary={summariseAttention(attention.sources)}
          isLoading={attention.isPending}
        />
      ) : null}

      <WorkerHeroCard
        worker={worker}
        rating={rating}
        ratingCanRead={canViewRating}
        week={weekSummary}
        weekKnown={week.canRead === true && !week.isPending && !week.isError}
        contract={contract}
        today={today}
      />

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <ShiftsCard
            workerId={id}
            nav={nav}
            shifts={week.shifts}
            summary={weekSummary}
            canRead={week.canRead}
            isPending={week.isPending}
            isError={week.isError}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <WorkerDocumentsCard
            docs={docs}
            canRead={canViewDocs}
            isLoading={isLoadingDocs}
            onApprove={(docId) => approveDoc(docId)}
            onReject={(docId, reason) => rejectDoc({ docId, reason })}
            isApproving={isApprovingDoc}
            isRejecting={isRejectingDoc}
          />
          {/* Absent only on a settled refusal — while the grant set is unknown
              the card renders its own loading state rather than being missing
              and then appearing. */}
          {canViewRating !== false ? (
            <RatingSnapshotCard
              rating={rating}
              isLoading={canViewRating === null || isLoadingRating}
            />
          ) : null}
          <ConversationsCard userId={worker.id} />
        </div>
      </div>
    </div>
  );
}
