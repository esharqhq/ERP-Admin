"use client";

import { Link } from "@/i18n/navigation";
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
import { ComposeForm, broadcastDetailToEditValues } from "@/components/broadcasts/compose-form";

// Edit is only reachable for a still-`Scheduled` row (list page only wires
// the Edit action there), but that can flip between the list render and this
// page's own load — checked again here rather than trusting the caller.
//
// Custom-audience broadcasts are blocked entirely: `BroadcastDetailDto` has
// no `selection` field (f-01-a-broadcast-core.md §5.2 — 16 keys, none of
// them who-was-picked), so there's no way to prefill it, and a PUT that
// resends whatever the form holds would silently narrow or wipe the frozen
// audience rather than leave it alone. Rendering the form anyway and hoping
// the admin doesn't touch the audience card is not an option — the block is
// unconditional, same treatment as the banner storageKey gap.

export default function EditBroadcastPage() {
  const t = useTranslations("broadcasts.compose");
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const canCompose = useHasPermission("notification:broadcast");

  const { data: detail, isLoading, isError, error } = useBroadcastDetail(id);
  const notFound = isError && error instanceof AxiosError && error.response?.status === 404;

  const Header = (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          className="gap-1.5 text-muted-foreground"
          render={<Link href="/dashboard/notifications/broadcasts" />}
        >
          <ArrowLeft className="size-4" />
          {t("edit.backToList")}
        </Button>
      </div>
      <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">
        {t("edit.title")}
      </h1>
      <p className="text-sm text-muted-foreground">{t("edit.subtitle")}</p>
    </div>
  );

  if (!canCompose) {
    return (
      <div className="flex flex-col gap-6">
        {Header}
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            {t("noAccess")}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        {Header}
        <div className="flex flex-col gap-4">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !detail) {
    return (
      <div className="flex flex-col gap-6">
        {Header}
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            {notFound ? t("edit.notFound") : t("errors.generic")}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (detail.status !== "Scheduled") {
    return (
      <div className="flex flex-col gap-6">
        {Header}
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center text-sm text-muted-foreground">
            <p>{t("edit.notScheduled")}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                router.push(`/dashboard/notifications/broadcasts/new?recreateFrom=${id}`)
              }
            >
              {t("edit.recreateInstead")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (detail.audience === "Custom") {
    return (
      <div className="flex flex-col gap-6">
        {Header}
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center text-sm text-muted-foreground">
            <p>{t("edit.customNotEditable")}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                router.push(`/dashboard/notifications/broadcasts/new?recreateFrom=${id}`)
              }
            >
              {t("edit.recreateInstead")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ComposeForm
      mode="edit"
      broadcastId={id}
      initialValues={broadcastDetailToEditValues(detail)}
      existingImageUrl={detail.imageUrl}
      title={t("edit.title")}
      subtitle={t("edit.subtitle")}
      onSaved={() => router.push("/dashboard/notifications/broadcasts")}
    />
  );
}
