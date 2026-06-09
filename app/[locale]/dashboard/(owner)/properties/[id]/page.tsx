"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import { ActionBar } from "@/components/properties/action-bar";
import { PropertyActions } from "@/components/properties/property-actions";
import { PropertyHero } from "@/components/properties/property-hero";
import { PropertyInfo } from "@/components/properties/property-info";
import { PropertyOwnerCard } from "@/components/properties/property-owner-card";
import { PropertyStatusCard } from "@/components/properties/property-status-card";
import { PropertyDocsCard } from "@/components/properties/property-docs-card";
import { Can } from "@/components/auth/can";
import { Skeleton } from "@/components/ui/skeleton";
import { useHasPermission } from "@/hooks/use-current-permissions";
import {
  usePropertyById,
  useAdminPropertyDocs,
  useApprovePropertyDocs,
  useRejectPropertyDocs,
  useResetPropertyDocs,
} from "@/hooks/use-properties";

export default function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations("properties");
  const { data: property, isLoading, isError } = usePropertyById(id);
  const canReadDocs = useHasPermission("property:doc:read_any");
  const { data: docsBundle } = useAdminPropertyDocs(id, canReadDocs);
  const { mutate: approve, isPending: isApproving } = useApprovePropertyDocs();
  const { mutate: reject, isPending: isRejecting } = useRejectPropertyDocs();
  const { mutate: reset, isPending: isResetting } = useResetPropertyDocs();

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
        <div className="lg:col-span-2">
          <PropertyInfo property={property} />
        </div>
        <div className="flex flex-col gap-6">
          <PropertyStatusCard property={property} />
          {docsBundle && (
            <Can permission="property:doc:read_any">
              <PropertyDocsCard
                propertyId={id}
                bundle={docsBundle}
                onApprove={() => approve(id)}
                onReject={(reason) => reject({ propertyId: id, reason })}
                onReset={(reason) => reset({ propertyId: id, reason })}
                isApproving={isApproving}
                isRejecting={isRejecting}
                isResetting={isResetting}
              />
            </Can>
          )}
          <PropertyOwnerCard property={property} />
        </div>
      </div>
    </div>
  );
}
