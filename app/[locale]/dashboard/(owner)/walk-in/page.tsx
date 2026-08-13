// app/[locale]/dashboard/(owner)/walk-in/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Info, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeeklyWorkCard } from "@/components/owners/weekly-work-card";
import { WalkInOrderForm } from "@/components/walk-in/walk-in-order-form";
import { WalkInOrdersList } from "@/components/walk-in/walk-in-orders-list";
import { WalkInOrderSheet } from "@/components/walk-in/walk-in-order-sheet";
import {
  useOwner,
  useOwnerProperties,
  useOwnerTaskGroups,
  useWalkInOwnerId,
} from "@/hooks/use-owners";
import { describeApiError, isPermissionDenied } from "@/lib/onboarding/errors";
import type { TaskGroupDto } from "@/lib/types/task.types";

const TABS = ["create", "orders"] as const;
type TabKey = (typeof TABS)[number];

function readTab(value: string | null): TabKey {
  return TABS.includes(value as TabKey) ? (value as TabKey) : "create";
}

/**
 * Filing an order that arrived by phone, Instagram, WhatsApp or Telegram — and
 * then keeping an eye on it.
 *
 * The task engine cannot create work without an owner and a property, and these
 * customers have neither, so the backend seeds one permanent account and every
 * manual order is filed under it. There is nothing to create here but the order:
 * the account is capped at one by the database, and delete, edit, contract and
 * ticket against it are all refused.
 */
export default function WalkInPage() {
  const t = useTranslations("walkIn");
  const tOnboarding = useTranslations("onboarding");
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = readTab(searchParams.get("tab"));

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [justCreated, setJustCreated] = useState<TaskGroupDto | null>(null);

  const walkIn = useWalkInOwnerId();
  const walkInId = walkIn.data ?? "";
  // All four carry `enabled: !!id`, so they stay idle until the id resolves.
  const owner = useOwner(walkInId);
  const { data: properties = [], isPending: propertiesPending } =
    useOwnerProperties(walkInId);
  /**
   * `useOwnerTaskGroups` — not `useAdminTaskGroups` — even though this is an admin
   * page. Both call `GET /api/tasks/admin/groups?ownerUserId=` with the same
   * argument; they differ only in cache key. `WeeklyWorkCard` below already reads
   * `["owner-task-groups", id]`, so sharing it means one request instead of two
   * and an instant render when switching tabs. `invalidateTasks` invalidates this
   * key too, so every mutation still flows through.
   */
  const groups = useOwnerTaskGroups(walkInId);

  /**
   * The **oldest** property, not `properties[0]`. `GET /api/properties` is ordered
   * by `name` server-side, so a second property filed under this account with an
   * earlier-sorting name would silently become the one every order is booked
   * against — deterministically, not just on an unlucky refetch. The seeded
   * walk-in property is the oldest by construction.
   */
  const property = properties.length
    ? properties.reduce((oldest, p) =>
        Date.parse(p.createdAt) < Date.parse(oldest.createdAt) ? p : oldest,
      )
    : null;

  /**
   * Looked up by id out of the live list on every render, never held. After an
   * assignment the list refetches and a new object arrives; a held copy would
   * keep showing the pre-assignment state until the sheet was closed and
   * reopened. `justCreated` covers the instant after filing, before the refetched
   * list contains the new group.
   */
  const selected = useMemo(() => {
    if (!selectedId) return null;
    return (
      (groups.data ?? []).find((g) => g.id === selectedId) ??
      (justCreated?.id === selectedId ? justCreated : null)
    );
  }, [groups.data, justCreated, selectedId]);

  function setTab(next: TabKey) {
    // `replace`, not `push`: a history entry per tab click would make the back
    // button walk backwards through tab switches, and after the post-create
    // switch it would land on the create tab holding a just-submitted form.
    router.replace(`?tab=${next}`, { scroll: false });
  }

  const settling =
    walkIn.isPending || (!!walkInId && (propertiesPending || owner.isPending));

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
         * `useWalkInOwnerId`'s queryFn only resolves `null` for a genuinely empty
         * page. A refused (403) or failed (500, network) request instead leaves
         * the query in its `error` state, and that must not be read as
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
         * A query that resolved successfully with no walk-in row or with a row but
         * no property means the environment is unseeded — a fact about the system,
         * not about an owner. A refused or failed lookup is handled above, so
         * arriving here means the request succeeded and found nothing. No form is
         * rendered: an enabled form over a missing property only produces
         * `400 property_not_found` after the order has been typed.
         */
        <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/40 px-4 py-3">
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("unseeded")}</p>
        </div>
      ) : (
        <>
          {/* One line, no card: the account is context for the tabs below it, not
              the subject of the page. `HeroCard` is deliberately not used — it
              reads a contract period, and this account can never hold one. */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-border px-4 py-3">
            <span className="text-sm font-medium">{owner.data?.fullName ?? "—"}</span>
            <Badge variant="secondary">{t("systemAccount")}</Badge>
            <span className="text-sm text-muted-foreground">
              {t("property")}: {property.name || property.address}
            </span>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(readTab(String(v)))}>
            <TabsList>
              <TabsTrigger value="create">{t("tabs.create")}</TabsTrigger>
              <TabsTrigger value="orders">{t("tabs.orders")}</TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="flex flex-col gap-6">
              <WalkInOrderForm
                propertyId={property.id}
                onCreated={(group) => {
                  setJustCreated(group);
                  setSelectedId(group.id);
                  setTab("orders");
                }}
              />
              {/* Stays on this tab only. Seeing what is already booked is how
                  `400 worker_has_overlapping_assignment` gets avoided while the
                  dates are being chosen — a worker cannot hold two assignments on
                  one date, and the fix is a different worker, not a different
                  time. On the Orders tab the list answers this already. */}
              <WeeklyWorkCard ownerUserId={walkInId} properties={properties} />
            </TabsContent>

            <TabsContent value="orders">
              <WalkInOrdersList
                groups={groups.data ?? []}
                isPending={groups.isPending}
                error={groups.isError ? groups.error : null}
                showPropertyName={properties.length > 1}
                onSelect={setSelectedId}
              />
            </TabsContent>
          </Tabs>

          <WalkInOrderSheet group={selected} onClose={() => setSelectedId(null)} />
        </>
      )}
    </div>
  );
}
