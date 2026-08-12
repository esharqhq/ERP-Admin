// app/[locale]/dashboard/(owner)/walk-in/page.tsx
"use client";

import { Info, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { WeeklyWorkCard } from "@/components/owners/weekly-work-card";
import { WalkInOrderForm } from "@/components/walk-in/walk-in-order-form";
import { useOwner, useOwnerProperties, useWalkInOwnerId } from "@/hooks/use-owners";
import { describeApiError, isPermissionDenied } from "@/lib/onboarding/errors";

/**
 * Filing an order that arrived by phone, Instagram, WhatsApp or Telegram.
 *
 * The task engine cannot create work without an owner and a property, and these
 * customers have neither — so the backend seeds one permanent account with one
 * property and every manual order is filed under it. There is nothing to create
 * here but the order itself: the account is capped at one by the database, and
 * delete, edit, contract and ticket against it are all refused.
 */
export default function WalkInPage() {
  const t = useTranslations("walkIn");
  const tOnboarding = useTranslations("onboarding");

  const walkIn = useWalkInOwnerId();
  const walkInId = walkIn.data ?? "";
  // All three carry `enabled: !!id`, so they stay idle until the id resolves.
  const owner = useOwner(walkInId);
  const { data: properties = [], isPending: propertiesPending } =
    useOwnerProperties(walkInId);

  const property = properties[0] ?? null;
  const settling = walkIn.isPending || (!!walkInId && propertiesPending);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-bold leading-tight tracking-tight">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {settling ? (
        <>
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </>
      ) : walkIn.isError ? (
        /**
         * `useWalkInOwnerId`'s queryFn only resolves `null` for a genuinely
         * empty page. A refused (403) or failed (500, network) request instead
         * leaves the query in its `error` state, and that must not be read as
         * "unseeded" — the account may well exist, and the seeder message below
         * would be false. `retry: false` and `staleTime: Infinity` on the hook
         * also mean this state is sticky, so it has to say what actually
         * happened rather than guess at "not set up".
         */
        <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/40 px-4 py-3">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">
            {isPermissionDenied(walkIn.error)
              ? tOnboarding("permissionDenied")
              : tOnboarding(
                  `apiErrors.${describeApiError(walkIn.error)?.labelKey ?? "unknown"}`,
                )}
          </p>
        </div>
      ) : !walkIn.data || !property ? (
        /**
         * A query that resolved successfully with no walk-in row
         * (`useWalkInOwnerId` resolving to `null`) or with a walk-in row but no
         * property means the environment is unseeded — a fact about the system,
         * not about an owner. A refused or failed lookup is handled in the
         * branch above, before this one, so arriving here means the request
         * succeeded and simply found nothing. No form is rendered: an enabled
         * form over a missing property only produces `400 property_not_found`
         * after the order has been typed.
         */
        <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/40 px-4 py-3">
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("unseeded")}</p>
        </div>
      ) : (
        <>
          {/* One line, no card: the account is context for the form below it,
              not the subject of the page. `HeroCard` is deliberately not used —
              it reads a contract period, and this account can never hold one. */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-border px-4 py-3">
            <span className="text-sm font-medium">{owner.data?.fullName ?? "—"}</span>
            <Badge variant="secondary">{t("systemAccount")}</Badge>
            <span className="text-sm text-muted-foreground">
              {t("property")}: {property.name || property.address}
            </span>
          </div>

          <WalkInOrderForm propertyId={property.id} />

          {/* Kept beyond the letter of the request: a worker cannot hold two
              assignments on one date (`400 worker_has_overlapping_assignment`),
              and seeing what is already booked is how that is avoided. */}
          <WeeklyWorkCard ownerUserId={walkInId} properties={properties} />
        </>
      )}
    </div>
  );
}
