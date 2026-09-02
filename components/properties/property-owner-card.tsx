"use client";

import { useMemo } from "react";
import { ArrowUpRight, Lock, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOwnerDirectory } from "@/hooks/use-owners";
import { useHasPermission } from "@/hooks/use-current-permissions";
import { contractPhasePresentation } from "@/lib/onboarding/status";
import { initials } from "@/lib/ui/initials";
import type { SubjectCover } from "@/lib/onboarding/subject-row";
import type { PropertyDto } from "@/lib/types/property.types";

/**
 * Who owns this address, to `Uyer-Admin-Properties.dc.html` §02.
 *
 * `PropertyDto` carries only `bossOwnerUserId`, and the backend is not adding a
 * name to it — the same client-side join the properties table uses resolves it
 * here. Gated on `owner:list` so an admin holding `property:list` without it sees
 * the id rather than provoking a 403 on page load.
 *
 * ⚠ The **lock note is the point of the card**, not decoration: there is no route
 * that moves a property between owners, so the field is absent from the edit form
 * rather than disabled in it. Without the sentence an admin hunts for a control
 * that was never built.
 */
export function PropertyOwnerCard({
  property,
  cover,
  coverCanRead,
  coverPending,
}: {
  property: PropertyDto;
  /** From the page's own `useOwnerContractCover` — not read a second time here. */
  cover: SubjectCover | null;
  /** `null` while the grant set is still resolving. */
  coverCanRead: boolean | null;
  coverPending: boolean;
}) {
  const t = useTranslations("properties");
  const tOwner = useTranslations("properties.owner");
  const tPhase = useTranslations("onboarding.phase");

  const canListOwners = useHasPermission("owner:list");
  const { data: owners, isLoading } = useOwnerDirectory(undefined, canListOwners);
  const owner = useMemo(
    () => (owners ?? []).find((o) => o.id === property.bossOwnerUserId) ?? null,
    [owners, property.bossOwnerUserId],
  );
  const pending = canListOwners && isLoading;

  const phase = cover ? contractPhasePresentation(cover.phase) : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-heading text-base font-semibold tracking-tight">
            {tOwner("title")}
          </h2>
          {/* The role, from the directory row. It says *which* owner this is —
              a property's owner of record is always the BOSS, and seeing the
              word is how an admin knows the join landed on the right person. */}
          {owner?.roleCode && (
            <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
              {owner.roleCode}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Avatar className="size-10 flex-none rounded-lg">
            <AvatarFallback className="rounded-lg bg-accent text-xs font-semibold text-primary">
              {initials(owner?.fullName)}
            </AvatarFallback>
          </Avatar>

          <div className="flex min-w-0 flex-col gap-1">
            {pending ? (
              <Skeleton className="h-4 w-32 rounded" />
            ) : (
              <span
                className="truncate text-sm font-medium leading-tight"
                title={owner?.fullName ?? undefined}
              >
                {owner?.fullName ?? t("ownerUnknown")}
              </span>
            )}

            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              {/*
                The owner's cover, and the reason it is on a *property* screen: an
                owner out of contract cannot be given new work at this address.

                Three states, never two. A refusal (`canRead === false`) and a read
                still in flight are both "unknown" and must not render as "no
                contract" — that would be this screen asserting something it was
                not allowed to look at.
              */}
              {coverCanRead === null || coverPending ? (
                <Skeleton className="h-4 w-24 rounded" />
              ) : coverCanRead === false ? (
                <span className="text-[11px] text-muted-foreground">
                  {tOwner("coverUnknown")}
                </span>
              ) : phase ? (
                <Badge variant={phase.variant} className={phase.className}>
                  {/* `labelKey`, not the phase name lower-cased: `Lapsed` and
                      `Expired` share one label deliberately (the difference is a
                      job artifact of up to an hour), and deriving the key here
                      would print two words for one state. */}
                  {tPhase(phase.labelKey as "inForce")}
                </Badge>
              ) : (
                <span className="text-[11px] text-muted-foreground">
                  {tOwner("noContract")}
                </span>
              )}

              <span className="truncate font-mono text-[10.5px] text-muted-foreground">
                {property.bossOwnerUserId.slice(0, 8)}…
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/*
            A real `mailto:`, which is what the design's Email button means — and
            what it can honestly be. Opening a *support ticket* is a different act
            with a different audience (`MessageUserDialog`, on owner detail), so
            putting it behind a button labelled "Email" would surprise whoever
            pressed it. Rendered only when the directory read supplied an address.
          */}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={!owner?.email}
            nativeButton={!owner?.email}
            render={owner?.email ? <a href={`mailto:${owner.email}`} /> : undefined}
          >
            <Mail className="size-3.5" />
            {tOwner("email")}
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            nativeButton={false}
            render={<Link href={`/dashboard/owners/${property.bossOwnerUserId}`} />}
          >
            {tOwner("profile")}
            <ArrowUpRight className="size-3.5" />
          </Button>
        </div>

        <p className="flex items-start gap-2 rounded-lg bg-muted/50 px-2.5 py-2 text-[11px] leading-snug text-muted-foreground">
          <Lock aria-hidden className="mt-px size-3 flex-none" />
          {tOwner("fixedAtCreation")}
        </p>
      </CardContent>
    </Card>
  );
}
