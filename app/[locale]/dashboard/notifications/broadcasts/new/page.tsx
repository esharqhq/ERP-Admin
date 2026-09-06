"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useHasPermission } from "@/hooks/use-current-permissions";
import { ComposeForm } from "@/components/broadcasts/compose-form";

// Route only this commit — always "create" mode. Reading `?recreateFrom=`
// (the list page's Recreate action already links here with that param, see
// Phase 3a's broadcasts/page.tsx `recreateHref`) is commit 6's job, once
// prefill-from-an-existing-broadcast has somewhere to load into.

export default function NewBroadcastPage() {
  const t = useTranslations("broadcasts.compose");
  const router = useRouter();
  const canCompose = useHasPermission("notification:broadcast");

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

  return (
    <div className="flex flex-col gap-6">
      {Header}
      <ComposeForm
        mode="create"
        onSaved={() => router.push("/dashboard/notifications/broadcasts")}
      />
    </div>
  );
}
