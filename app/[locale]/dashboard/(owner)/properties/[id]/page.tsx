"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import { ActionBar } from "@/components/properties/action-bar";
import { PropertyActions } from "@/components/properties/property-actions";
import { PropertyHero } from "@/components/properties/property-hero";
import { PropertyInfo } from "@/components/properties/property-info";
import { PropertyMapCard } from "@/components/properties/property-map-card";
import { PropertyOwnerCard } from "@/components/properties/property-owner-card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePropertyById } from "@/hooks/use-properties";

export default function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations("properties");
  const { data: property, isLoading, isError } = usePropertyById(id);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <ActionBar />
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
          <div className="flex flex-col gap-6">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !property) {
    return (
      <div className="flex flex-col gap-6">
        <ActionBar />
        <p className="text-sm text-destructive">{t("notFound")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ActionBar actions={<PropertyActions property={property} />} />
      <PropertyHero property={property} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <PropertyInfo property={property} />
          <PropertyMapCard property={property} />
        </div>
        {/* The docs-review card and the docs-status card that used to sit above
            the owner card are gone with F-02c — a property has no review state
            left to show. The photo gallery that replaced the feature is a
            separate build; `usePropertyMedia` is ready for it. */}
        <div className="flex flex-col gap-6">
          <PropertyOwnerCard property={property} />
        </div>
      </div>
    </div>
  );
}
