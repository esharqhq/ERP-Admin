"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, CalendarDays, Home, UserCog } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import {
  useOwner,
  useOwnerProperties,
  useOwnerTaskGroups,
} from "@/hooks/use-owners";
import { HeroCard } from "@/components/owners/hero-card";
import { StatCard } from "@/components/owners/stat-card";
import { PropertyList } from "@/components/owners/property-list";
import { ActivityTimeline } from "@/components/owners/activity-timeline";
import { ContactCard } from "@/components/owners/contact-card";
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
        <OwnerActions owner={owner} />
      </div>

      <HeroCard owner={owner} />

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
          <ActivityTimeline taskGroups={taskGroups} />
        </div>

        <div className="flex flex-col gap-6">
          <ContactCard owner={owner} />
        </div>
      </div>
    </div>
  );
}
