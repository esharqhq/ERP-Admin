"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import { ActionBar } from "@/components/properties/action-bar";
import { PropertyActions } from "@/components/properties/property-actions";
import { PropertyHero } from "@/components/properties/property-hero";
import { PropertyInfo } from "@/components/properties/property-info";
import { PropertyMapCard } from "@/components/properties/property-map-card";
import { PropertyOwnerCard } from "@/components/properties/property-owner-card";
import { PropertyGalleryCard } from "@/components/properties/property-gallery-card";
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
        {/* The gallery leads the main column: photos are what an admin opening
            a property actually wants to see, and the measurements below are
            reference. It replaced the docs-review and docs-status cards F-02c
            deleted — a property has no review state left to show. */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <PropertyGalleryCard propertyId={property.id} />
          <PropertyMapCard property={property} />
        </div>
        <div className="flex flex-col gap-6">
          <PropertyOwnerCard property={property} />
          <PropertyInfo property={property} />
        </div>
      </div>
    </div>
  );
}
