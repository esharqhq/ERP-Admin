"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, CalendarDays, Home, UserCog, Info } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import {
  useOwner,
  useOwnerKyc,
  useOwnerProperties,
  useOwnerTaskGroups,
  useWalkInOwnerId,
} from "@/hooks/use-owners";
import { ownerDetailActions } from "@/lib/owners/detail-actions";
import type { KycRead } from "@/lib/owners/detail-actions";
import { HeroCard } from "@/components/owners/hero-card";
import { StatCard } from "@/components/owners/stat-card";
import { PropertyList } from "@/components/owners/property-list";
import { ActivityTimeline } from "@/components/owners/activity-timeline";
import { ContactCard } from "@/components/owners/contact-card";
import { SubAccountsCard } from "@/components/owners/sub-accounts-card";
import { OwnerActions } from "@/components/owners/owner-actions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function formatJoined(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function OwnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations("owners");
  const locale = useLocale();

  const { data: owner, isLoading, isError } = useOwner(id);
  const { data: properties = [] } = useOwnerProperties(id);
  const { data: taskGroups = [] } = useOwnerTaskGroups(id);

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

  if (isLoading || !guardsReady) {
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
        <OwnerActions
          owner={owner}
          actions={actions}
          identity={identity ?? { firstName: null, lastName: null }}
        />
      </div>

      {/* Stated once, rather than letting the admin discover four separate
          refusals by clicking. */}
      {actions.isWalkIn ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/40 px-4 py-3">
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("systemHint")}</p>
        </div>
      ) : null}

      <HeroCard owner={owner} isWalkIn={actions.isWalkIn} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={t("directory.columns.role")}
          value={owner.roleCode ?? "—"}
          hint={t("account.roleHint")}
          icon={<UserCog className="size-4" />}
          tone="blue"
        />
        <StatCard
          label={t("directory.columns.status")}
          value={owner.isVerified ? t("account.verified") : t("account.unverified")}
          hint={owner.isVerified ? t("account.verifiedHint") : t("account.unverifiedHint")}
          icon={<ShieldCheck className="size-4" />}
          tone={owner.isVerified ? "emerald" : "amber"}
        />
        <StatCard
          label={t("account.joined")}
          value={formatJoined(owner.createdAt, locale)}
          hint={t("account.joinedHint")}
          icon={<CalendarDays className="size-4" />}
          tone="violet"
        />
        <StatCard
          label={t("properties.title")}
          value={properties.length}
          hint={t("account.propertiesHint")}
          icon={<Home className="size-4" />}
          tone="amber"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <PropertyList properties={properties} />
          <ActivityTimeline
            taskGroups={taskGroups}
            propertyNames={Object.fromEntries(
              properties.map((p) => [p.id, p.name ?? "—"]),
            )}
          />
        </div>

        <div className="flex flex-col gap-6">
          <ContactCard owner={owner} identity={identity} />
          <SubAccountsCard ownerId={id} />
        </div>
      </div>
    </div>
  );
}
