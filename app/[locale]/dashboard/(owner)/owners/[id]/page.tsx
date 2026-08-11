"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useOwner,
  useOwnerKyc,
  useOwnerProperties,
  useWalkInOwnerId,
} from "@/hooks/use-owners";
import { ownerDetailActions } from "@/lib/owners/detail-actions";
import type { KycRead } from "@/lib/owners/detail-actions";
import { HeroCard } from "@/components/owners/hero-card";
import { PropertyList } from "@/components/owners/property-list";
import { WeeklyWorkCard } from "@/components/owners/weekly-work-card";
import { ContactCard } from "@/components/owners/contact-card";
import { OwnerDocumentsCard } from "@/components/owners/owner-documents-card";
import { SubAccountsCard } from "@/components/owners/sub-accounts-card";
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
  const { data: owner, isLoading, isError } = useOwner(id);
  // Task groups are fetched by WeeklyWorkCard itself, on the same query key —
  // the page does not need its own observer.
  const { data: properties = [] } = useOwnerProperties(id);

  const kyc = useOwnerKyc(id);
  const walkIn = useWalkInOwnerId();

  /**
   * Only a `404` is a statement about the owner — it means no profile row
   * exists. Everything else, including a `500` or a dropped connection,
   * resolves to `forbidden`: failing closed hides a button that might have
   * worked, failing open offers one that will not.
   */
  const kycRead: KycRead = kyc.isSuccess
    ? "visible"
    : (kyc.error as { response?: { status?: number } })?.response?.status === 404
      ? "absent"
      : "forbidden";

  const actions = ownerDetailActions({
    ownerId: id,
    walkInId: walkIn.data ?? null,
    kycRead,
    onboardingStatus: kyc.data?.onboardingStatus ?? null,
  });

  const identity = kyc.data?.identity ?? null;

  /**
   * Both guards must settle before any action renders. `OwnerActions` would
   * otherwise appear as soon as `useOwner` resolves, showing Edit and Delete on
   * the walk-in account — clickable — until these two land. A guard that is
   * only usually applied is not a guard.
   *
   * Scoped to the action row, not the page: nothing else here depends on these
   * two reads, and blocking the hero card, properties and timeline on them
   * would slow every owner view to buy safety only the buttons need. Both
   * queries carry `retry: false`, so this always resolves.
   */
  const guardsReady = !kyc.isPending && !walkIn.isPending;

  const backButton = (
    <Button
      variant="ghost"
      size="sm"
      nativeButton={false}
      render={<Link href="/dashboard/owners" />}
      className="gap-1.5 -ml-2 text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" />
      {t("account.back")}
    </Button>
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        {backButton}
        <Skeleton className="h-48 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !owner) {
    return (
      <div className="flex flex-col gap-6">
        {backButton}
        <p className="text-sm text-destructive">{t("notFound")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {backButton}
        {guardsReady ? (
          <OwnerActions
            owner={owner}
            actions={actions}
            identity={identity ?? { firstName: null, lastName: null }}
          />
        ) : (
          <Skeleton className="h-8 w-40 rounded-md" />
        )}
      </div>

      {/* Stated once, rather than letting the admin discover four separate
          refusals by clicking. Guarded on `guardsReady` too, so it appears with
          the actions rather than flashing in a moment later. */}
      {guardsReady && actions.isWalkIn ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/40 px-4 py-3">
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("systemHint")}</p>
        </div>
      ) : null}

      {/* Role and onboarding stage live here and nowhere else — the stat row
          that repeated them is gone, along with a `joined` card the contact
          card already carried and a property count the Properties card states
          in its own header. */}
      <HeroCard
        owner={owner}
        isWalkIn={actions.isWalkIn}
        onboardingStatus={kyc.data?.onboardingStatus ?? null}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <WeeklyWorkCard ownerUserId={id} properties={properties} />
        </div>

        <div className="flex flex-col gap-6">
          <ContactCard owner={owner} identity={identity} />
          <PropertyList properties={properties} />
          <OwnerDocumentsCard
            ownerProfileId={kyc.data?.ownerProfileId ?? null}
            documents={kyc.data?.documents ?? null}
          />
          <SubAccountsCard ownerId={id} />
        </div>
      </div>
    </div>
  );
}
