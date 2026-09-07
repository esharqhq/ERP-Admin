"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { AxiosError } from "axios";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useHasPermission } from "@/hooks/use-current-permissions";
import { useBroadcastDetail } from "@/hooks/use-broadcasts";
import { BroadcastDetailHeader } from "@/components/broadcasts/broadcast-detail-header";
import { BroadcastDetailPanels } from "@/components/broadcasts/broadcast-detail-panels";
import { BroadcastDetailRail } from "@/components/broadcasts/broadcast-detail-rail";
import { CancelBroadcastDialog } from "@/components/broadcasts/cancel-broadcast-dialog";

// Source of truth: assets/Uyer Admin Broadcast Detail.dc.html — the third
// page of the broadcast set (list → compose → this). One layout, five
// shapes: the header's action slot and the reach card change per `status`,
// everything else — banner, content, audience, timing, provenance — reads
// the same `BroadcastDetailDto` regardless of which state it's in.
//
// Not gated on `broadcast_forbidden`: that with-body 403 is documented for
// PUT/cancel (routes 4-5) only, per f-01-a-broadcast-core.md's error table —
// GET (route 3) shares the same empty-body-403 rule as every other broadcast
// route ("your role lacks notification:broadcast"), which `canView` below
// already covers. Cancel's own 403, if the viewer isn't the creator, surfaces
// through `CancelBroadcastDialog`'s existing error handling, unchanged.

export default function BroadcastDetailPage() {
  const t = useTranslations("broadcasts.detail");
  const tCompose = useTranslations("broadcasts.compose");
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const canView = useHasPermission("notification:broadcast");
  const [cancelling, setCancelling] = useState(false);

  const { data: detail, isLoading, isError, error } = useBroadcastDetail(id);
  const notFound = isError && error instanceof AxiosError && error.response?.status === 404;

  const Back = (
    <Button
      variant="ghost"
      size="sm"
      nativeButton={false}
      className="-ml-2 self-start gap-1.5 text-muted-foreground"
      render={<Link href="/dashboard/notifications/broadcasts" />}
    >
      <ArrowLeft className="size-4" />
      {tCompose("backToList")}
    </Button>
  );

  if (!canView) {
    return (
      <div className="flex flex-col gap-4">
        {Back}
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            {tCompose("noAccess")}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {Back}
        <Skeleton className="h-[104px] w-full rounded-xl" />
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
          <div className="flex w-full flex-col gap-4 lg:w-[372px] lg:flex-none">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !detail) {
    return (
      <div className="flex flex-col gap-4">
        {Back}
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            {notFound ? t("notFound") : tCompose("errors.generic")}
          </CardContent>
        </Card>
      </div>
    );
  }

  const recreateHref = `/dashboard/notifications/broadcasts/new?recreateFrom=${id}`;

  return (
    <div className="flex flex-col gap-4">
      {Back}

      <BroadcastDetailHeader
        detail={detail}
        onEdit={() => router.push(`/dashboard/notifications/broadcasts/${id}/edit`)}
        onCancel={() => setCancelling(true)}
        onRecreate={() => router.push(recreateHref)}
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <BroadcastDetailPanels detail={detail} />
        <BroadcastDetailRail detail={detail} />
      </div>

      {cancelling && (
        <CancelBroadcastDialog broadcast={detail} onClose={() => setCancelling(false)} />
      )}
    </div>
  );
}
