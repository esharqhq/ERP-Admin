"use client";

import { use, useMemo, useState } from "react";
import { ClipboardList, History, Image as ImageIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { ActionBar } from "@/components/properties/action-bar";
import { PropertyActions } from "@/components/properties/property-actions";
import { PropertyIdentityCard } from "@/components/properties/property-identity";
import { PropertyMapCard } from "@/components/properties/property-map-card";
import { PropertyOwnerCard } from "@/components/properties/property-owner-card";
import { PropertyGalleryCard } from "@/components/properties/property-gallery-card";
import { PropertyVisitsCard } from "@/components/properties/property-visits-card";
import { PropertyWorkTab } from "@/components/properties/property-work-tab";
import { AttentionStrip } from "@/components/detail/attention-strip";
import { AccountLog } from "@/components/detail/account-log";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAccountLog } from "@/hooks/use-account-log";
import { useOwnerContractCover } from "@/hooks/use-contracts";
import {
  usePropertyById,
  usePropertyMedia,
  usePropertyMemberships,
} from "@/hooks/use-properties";
import { useAdminTaskGroups } from "@/hooks/use-tasks";
import { useToday } from "@/hooks/use-today";
import { isPermissionDenied } from "@/lib/onboarding/errors";
import { derivePropertyAttention } from "@/lib/properties/attention";
import { countVisitsSince, upcomingVisits } from "@/lib/properties/visits";

const VISIT_WINDOW_DAYS = 90;

/**
 * Property detail, rebuilt to `Uyer-Admin-Properties.dc.html` §02 — and to the
 * shape Owner and Worker detail already use: the attention band first, the
 * identity card under it, the deep material behind tabs, a side column for the
 * facts an admin reads rather than acts on.
 *
 * **One task read feeds three surfaces** — the attention band, the identity
 * card's `Visits · 90 days`, and both the side column and the Work tab. They
 * cannot disagree about the same shift because they are the same response.
 */
export default function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations("properties");
  const tDetail = useTranslations("properties.detail");
  const today = useToday();

  const { data: property, isLoading, isError } = usePropertyById(id);
  const media = usePropertyMedia(id);
  const memberships = usePropertyMemberships(property?.id);

  /**
   * ⚠ Gated on the id. Unscoped, this route returns **every task group on the
   * platform** — and `property` is undefined on the first render, so an ungated
   * call fetches the whole system once before refetching scoped.
   */
  const groupsQuery = useAdminTaskGroups(undefined, property?.id, Boolean(property?.id));
  const groups = useMemo(() => groupsQuery.data ?? [], [groupsQuery.data]);
  const visitsForbidden = isPermissionDenied(groupsQuery.error);

  const visits = useMemo(() => upcomingVisits(groups, today), [groups, today]);
  const visitCount = useMemo(
    () => countVisitsSince(groups, today, VISIT_WINDOW_DAYS),
    [groups, today],
  );

  // The **owner's** cover, not the property's — a property has none. An owner out
  // of contract cannot be given new work at this address, which is a fact about
  // this screen even though it belongs to another one.
  // The hook already leaves itself disabled on a blank id, so the empty string is
  // "no owner resolved yet" rather than a request for owner "".
  const cover = useOwnerContractCover(property?.bossOwnerUserId ?? "");

  // Property create / deactivate / restore are audited against `targetEntity:
  // "Property"`, so the History tab is a filter over the same trail the owner and
  // worker screens read.
  const log = useAccountLog([property?.id]);

  const attention = useMemo(
    () =>
      derivePropertyAttention({
        visits,
        visitsPending: groupsQuery.isPending,
        visitsForbidden,
        media: media.data ?? null,
        cover: {
          canRead: cover.canRead,
          isPending: cover.isPending,
          cover: cover.cover,
        },
        today,
        copy: {
          unassignedTitle: (a) => tDetail("attention.unassignedTitle", a),
          unassignedDetail: (a) => tDetail("attention.unassignedDetail", a),
          unassignedAction: () => tDetail("attention.assign"),
          visitsUnknown: () => tDetail("attention.visitsUnknown"),
          visitsUnknownDetail: () => tDetail("attention.visitsUnknownWhy"),
          coverExpiredTitle: () => tDetail("attention.coverExpired"),
          coverExpiredDetail: () => tDetail("attention.coverExpiredWhy"),
          coverEndingTitle: (a) => tDetail("attention.coverEnding", a),
          coverEndingDetail: () => tDetail("attention.coverEndingWhy"),
          coverAction: () => tDetail("attention.renew"),
          coverUnknown: () => tDetail("attention.coverUnknown"),
          coverUnknownDetail: () => tDetail("attention.coverUnknownWhy"),
          stalePhotosTitle: (a) => tDetail("attention.stalePhotos", a),
          stalePhotosDetail: (a) => tDetail("attention.stalePhotosWhy", a),
          noPhotosTitle: () => tDetail("attention.noPhotos"),
          noPhotosDetail: () => tDetail("attention.noPhotosWhy"),
          photosAction: () => tDetail("attention.view"),
        },
      }),
    [visits, groupsQuery.isPending, visitsForbidden, media.data, cover, today, tDetail],
  );

  const [tab, setTab] = useState("photos");

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <ActionBar />
        <Skeleton className="h-[68px] w-full rounded-xl" />
        <Skeleton className="h-44 w-full rounded-xl" />
        <div className="grid gap-5 lg:grid-cols-3">
          <Skeleton className="h-72 w-full rounded-xl lg:col-span-2" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !property) {
    return (
      <div className="flex flex-col gap-5">
        <ActionBar />
        <p className="text-sm text-destructive">{t("notFound")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <ActionBar actions={<PropertyActions property={property} />} />

      <AttentionStrip
        summary={attention}
        isLoading={groupsQuery.isPending && media.isLoading}
      />

      <PropertyIdentityCard
        property={property}
        memberships={memberships.data ?? []}
        membershipsPending={memberships.isPending}
        visitCount={visitsForbidden ? null : visitCount}
        visitsPending={groupsQuery.isPending}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <Card>
            <CardContent>
              <Tabs value={tab} onValueChange={setTab} className="gap-4">
                <TabsList variant="line" className="self-start">
                  <TabsTrigger value="photos" className="gap-2">
                    <ImageIcon className="size-4" />
                    {tDetail("tabs.photos")}
                    <TabCount n={media.data?.length} />
                  </TabsTrigger>
                  <TabsTrigger value="work" className="gap-2">
                    <ClipboardList className="size-4" />
                    {tDetail("tabs.work")}
                    <TabCount n={countTasks(groups)} />
                  </TabsTrigger>
                  <TabsTrigger value="history" className="gap-2">
                    <History className="size-4" />
                    {tDetail("tabs.history")}
                  </TabsTrigger>
                </TabsList>

                {/* The gallery keeps its own card chrome and its own read — it is
                    the one surface here that already existed and works. */}
                <TabsContent value="photos">
                  <PropertyGalleryCard propertyId={property.id} bare />
                </TabsContent>

                <TabsContent value="work">
                  <PropertyWorkTab
                    groups={groups}
                    isPending={groupsQuery.isPending}
                    isForbidden={visitsForbidden}
                    isError={groupsQuery.isError}
                  />
                </TabsContent>

                <TabsContent value="history">
                  <AccountLog
                    entries={log.entries}
                    canRead={log.canRead}
                    isPending={log.isPending}
                    isError={log.isError}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <PropertyMapCard property={property} />
        </div>

        <div className="flex flex-col gap-5">
          {/* The cover comes from the page's read, not a second one: the attention
              band above already asked, and two reads could disagree. */}
          <PropertyOwnerCard
            property={property}
            cover={cover.cover}
            coverCanRead={cover.canRead}
            coverPending={cover.isPending}
          />
          <PropertyVisitsCard
            visits={visits}
            isPending={groupsQuery.isPending}
            isForbidden={visitsForbidden}
            isError={groupsQuery.isError}
          />
        </div>
      </div>
    </div>
  );
}

/** A count beside a tab label, or nothing while it is still unknown. */
function TabCount({ n }: { n: number | undefined }) {
  if (n === undefined) return null;
  return (
    <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{n}</span>
  );
}

function countTasks(groups: { tasks?: unknown[] }[]): number | undefined {
  return groups.reduce((n, g) => n + (g.tasks?.length ?? 0), 0);
}
