"use client";

import { use, useMemo } from "react";
import { ArrowLeft, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  useOwner,
  useOwnerKyc,
  useOwnerProperties,
  useOwnerTaskGroups,
  useWalkInOwnerId,
} from "@/hooks/use-owners";
import { useOwnerContractCover } from "@/hooks/use-contracts";
import { useToday, useTodayKey } from "@/hooks/use-today";
import { ownerDetailActions } from "@/lib/owners/detail-actions";
import type { KycRead } from "@/lib/owners/detail-actions";
import { deriveOwnerAttention } from "@/lib/owners/attention";
import { isCoveredNow } from "@/lib/types/onboarding.types";
import { summariseAttention } from "@/lib/detail/attention";
import { AttentionStrip } from "@/components/detail/attention-strip";
import { ConversationsCard } from "@/components/detail/conversations-card";
import { OwnerHeroCard } from "@/components/owners/hero-card";
import { PropertyList } from "@/components/owners/property-list";
import { WeeklyWorkCard } from "@/components/owners/weekly-work-card";
import { OwnerDocumentsCard } from "@/components/owners/owner-documents-card";
import { OwnerActions } from "@/components/owners/owner-actions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function OwnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations("owners");
  const tAttention = useTranslations("owners.attention");
  const today = useToday();
  const todayKey = useTodayKey();

  const { data: owner, isLoading, isError } = useOwner(id);
  const { data: properties = [] } = useOwnerProperties(id);

  /**
   * Read here as well as inside `WeeklyWorkCard` — same query key, so it costs
   * no second request — because the attention strip counts unstaffed shifts out
   * of it. The card owns the rendering; the page owns the verdict.
   */
  const { data: groups = [], isPending: groupsPending } =
    useOwnerTaskGroups(id);

  const kyc = useOwnerKyc(id);
  const walkIn = useWalkInOwnerId();
  const contract = useOwnerContractCover(id);

  /**
   * Filing an order runs the owner's own ACTIVE gate, so the verb is offered
   * only while cover is actually in force. Read from the period this page
   * already holds rather than from `onboardingStatus`: that projection is an
   * hourly mirror and says `Active` in two windows where the server refuses.
   */
  const coverInForce = isCoveredNow(contract.cover?.phase);

  /**
   * Only a `404` is a statement about the owner — it means no profile row
   * exists. Everything else, including a `500` or a dropped connection,
   * resolves to `forbidden`: failing closed hides a button that might have
   * worked, failing open offers one that will not.
   */
  const kycRead: KycRead = kyc.isSuccess
    ? "visible"
    : (kyc.error as { response?: { status?: number } })?.response?.status ===
        404
      ? "absent"
      : "forbidden";

  const actions = ownerDetailActions({
    ownerId: id,
    walkInId: walkIn.data ?? null,
    kycRead,
    onboardingStatus: kyc.data?.onboardingStatus ?? null,
  });

  const identity = kyc.data?.identity ?? null;
  const ownerProfileId = kyc.data?.ownerProfileId ?? null;

  /**
   * Both guards must settle before any action renders. `OwnerActions` would
   * otherwise appear as soon as `useOwner` resolves, showing Edit and Delete on
   * the walk-in account — clickable — until these two land. A guard that is
   * only usually applied is not a guard.
   *
   * Scoped to the action row, not the page: the identity band reads `kyc` too,
   * for the onboarding badge and the legal name, but it renders those late
   * rather than late-and-blocking — nothing there is destructive if it is
   * briefly unknown. Blocking the band, the properties and the week on these two
   * would slow every owner view to buy safety only the buttons need. Both
   * queries carry `retry: false`, so this always resolves.
   */
  const guardsReady = !kyc.isPending && !walkIn.isPending;

  const attention = useMemo(
    () =>
      deriveOwnerAttention({
        groups,
        groupsPending,
        kyc: {
          read: kycRead,
          ownerProfileId,
          documents: kyc.data?.documents ?? null,
          isPending: kyc.isPending,
        },
        contract,
        today,
        todayKey,
        copy: {
          unstaffedTitle: (v) => tAttention("unstaffedTitle", v),
          unstaffedDetail: (v) => tAttention("unstaffedDetail", v),
          unstaffedToday: () => tAttention("unstaffedToday"),
          unstaffedSoon: (v) => tAttention("unstaffedSoon", v),
          unstaffedAction: () => tAttention("unstaffedAction"),

          docsTitle: (v) => tAttention("docsTitle", v),
          docsDetail: (v) => tAttention("docsDetail", v),
          docsAction: () => tAttention("docsAction"),
          docsUnknown: () => tAttention("docsUnknown"),
          docsUnknownDetail: () => tAttention("docsUnknownDetail"),

          coverExpiredTitle: () => tAttention("coverExpiredTitle"),
          coverExpiredDetail: () => tAttention("coverExpiredDetail"),
          coverEndingTitle: (v) => tAttention("coverEndingTitle", v),
          coverEndingDetail: () => tAttention("coverEndingDetail"),
          coverAction: () => tAttention("coverAction"),
          coverUnknown: () => tAttention("coverUnknown"),
          coverUnknownDetail: () => tAttention("coverUnknownDetail"),
        },
      }),
    // `contract` is a fresh object each render; its fields are the real inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      groups,
      groupsPending,
      kycRead,
      ownerProfileId,
      kyc.data?.documents,
      kyc.isPending,
      contract.cover,
      contract.canRead,
      contract.isPending,
      contract.error,
      today,
      todayKey,
      tAttention,
    ],
  );

  const backButton = (
    <Button
      variant="ghost"
      size="sm"
      nativeButton={false}
      render={<Link href="/dashboard/owners" />}
      className="-ml-2 gap-1.5 text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" />
      {t("account.back")}
    </Button>
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5">
        {backButton}
        {/* Mirrors the real layout — strip, band, then the 2/1 split. Each block
            is a little shorter than what replaces it, so the page settles rather
            than jumping. */}
        <Skeleton className="h-[68px] w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
        <div className="grid gap-5 lg:grid-cols-3">
          <Skeleton className="h-80 rounded-xl lg:col-span-2" />
          <div className="flex flex-col gap-5">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-44 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !owner) {
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
        {guardsReady ? (
          <OwnerActions
            owner={owner}
            actions={actions}
            identity={identity ?? { firstName: null, lastName: null }}
            properties={properties}
            coverInForce={coverInForce}
          />
        ) : (
          <Skeleton className="h-8 w-40 rounded-md" />
        )}
      </div>

      {/* Stated once, rather than letting the admin discover four separate
          refusals by clicking. Guarded on `guardsReady` too, so it appears with
          the actions rather than flashing in a moment later.
          It takes the strip's place: on this account there is nothing waiting,
          there is nothing that *can* wait, and that is the more useful sentence. */}
      {guardsReady && actions.isWalkIn ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/40 px-4 py-3">
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("systemHint")}</p>
        </div>
      ) : (
        <AttentionStrip
          summary={summariseAttention(attention.sources)}
          isLoading={attention.isPending || !guardsReady}
        />
      )}

      {/* Role, onboarding stage, the contact facts and the contract period all
          live here and nowhere else — the stat row that repeated the first two
          is gone, along with a `joined` card, the sidebar contact card the band
          absorbed, the sub-accounts card its team chips absorbed, and a property
          count the Properties card now really does state in its own header. */}
      <OwnerHeroCard
        owner={owner}
        isWalkIn={actions.isWalkIn}
        onboardingStatus={kyc.data?.onboardingStatus ?? null}
        identity={identity}
        company={kyc.data?.company ?? null}
        today={today}
        nameLock={actions.nameLock}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-5 lg:col-span-2">
          <WeeklyWorkCard
            ownerUserId={id}
            ownerProfileId={ownerProfileId}
            properties={properties}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <PropertyList properties={properties} />
          <OwnerDocumentsCard
            ownerProfileId={ownerProfileId}
            documents={kyc.data?.documents ?? null}
          />
          {/* Not on the walk-in account. Its empty state offers Message as the
              way to start the first thread, and Message is exactly one of the
              four verbs that account refuses — an empty card there would be
              telling the admin to press a button that is not on the screen. */}
          {actions.isWalkIn ? null : <ConversationsCard userId={owner.id} />}
        </div>
      </div>
    </div>
  );
}
