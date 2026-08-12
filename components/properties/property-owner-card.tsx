"use client";

import { useMemo } from "react";
import Link from "next/link";
import { User, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";
import { useOwnerDirectory } from "@/hooks/use-owners";
import { useHasPermission } from "@/hooks/use-current-permissions";
import { ownerNameById } from "@/lib/properties/table-rows";
import type { PropertyDto } from "@/lib/types/property.types";

/**
 * `PropertyDto` carries only `bossOwnerUserId`, and the backend is not adding a
 * name to it — the same client-side join the properties table uses resolves it
 * here. Gated on `owner:list` so an admin holding `property:list` without it
 * sees the id rather than provoking a 403 on page load.
 */
export function PropertyOwnerCard({ property }: { property: PropertyDto }) {
  const t = useTranslations("properties");

  const canListOwners = useHasPermission("owner:list");
  const { data: owners, isLoading } = useOwnerDirectory(undefined, canListOwners);
  const name = useMemo(
    () => ownerNameById(owners).get(property.bossOwnerUserId) ?? null,
    [owners, property.bossOwnerUserId],
  );
  const pending = canListOwners && isLoading;

  return (
    <Card>
      <CardHeader className="pb-3">
        <h2 className="font-heading text-base font-semibold tracking-tight">
          {t("owner.title")}
        </h2>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <User className="size-4" />
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            {pending ? (
              <Skeleton className="h-4 w-32 rounded" />
            ) : (
              <span className="truncate text-sm font-medium leading-tight">
                {name ?? t("ownerUnknown")}
              </span>
            )}
            <span className="font-mono text-[11px] text-muted-foreground">
              {property.bossOwnerUserId.slice(0, 8)}…
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5"
          nativeButton={false}
          render={<Link href={`/dashboard/owners/${property.bossOwnerUserId}`} />}
        >
          {t("owner.viewProfile")}
          <ArrowUpRight className="size-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}
