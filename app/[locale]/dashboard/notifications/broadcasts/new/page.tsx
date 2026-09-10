"use client";

import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useHasPermission } from "@/hooks/use-current-permissions";
import { useBroadcastDetail } from "@/hooks/use-broadcasts";
import { ComposeForm, broadcastDetailToRecreateValues } from "@/components/broadcasts/compose-form";

// Plain create mode, or recreate when `?recreateFrom=` is present — the list
// page's Recreate action already links here with that param (Phase 3a's
// broadcasts/page.tsx `recreateHref`). `useBroadcastDetail("")` no-ops
// (its own `enabled: !!id`), so the common create-mode case never fires an
// extra request.

export default function NewBroadcastPage() {
  const t = useTranslations("broadcasts.compose");
  const router = useRouter();
  const canCompose = useHasPermission("notification:broadcast");

  const searchParams = useSearchParams();
  const recreateFrom = searchParams.get("recreateFrom") ?? "";

  const { data: source, isLoading } = useBroadcastDetail(recreateFrom);

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
          {t("backToList")}
        </Button>
      </div>
      <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">
        {t("newTitle")}
      </h1>
      <p className="text-sm text-muted-foreground">{t("newSubtitle")}</p>
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

  // Waiting on the source broadcast, not on the create-mode default —
  // mounting ComposeForm before it lands would freeze the form on the empty
  // defaults, since its initial state is only ever read once.
  if (recreateFrom && isLoading) {
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

  return (
    <ComposeForm
      mode={source ? "recreate" : "create"}
      initialValues={source ? broadcastDetailToRecreateValues(source) : undefined}
      existingImageUrl={source?.imageUrl}
      notice={source?.audience === "Custom" ? t("recreate.customAudienceDropped") : undefined}
      title={t("newTitle")}
      subtitle={t("newSubtitle")}
      onSaved={() => router.push("/dashboard/notifications/broadcasts")}
    />
  );
}
