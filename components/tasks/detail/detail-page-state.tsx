"use client";

import { AlertTriangle, FileQuestion, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import type { GroupLoadFailure } from "@/lib/tasks/detail/page-state";
import { cn } from "@/lib/utils";

/** Final-layout skeleton: a 260px header, then 300px + fluid (or one column). */
export function DetailSkeleton({ single }: { single: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-[260px] w-full rounded-xl" />
      <div className={cn("grid gap-4", !single && "lg:grid-cols-[300px_minmax(0,1fr)]")}>
        {!single ? <Skeleton className="h-[520px] rounded-xl" /> : null}
        <Skeleton className="h-[520px] rounded-xl" />
      </div>
    </div>
  );
}

const VIEW: Record<GroupLoadFailure, { icon: typeof AlertTriangle; tile: string }> = {
  error: { icon: AlertTriangle, tile: "bg-status-cancelled-tint text-status-cancelled-deep" },
  notFound: { icon: FileQuestion, tile: "bg-muted text-muted-foreground" },
  forbidden: { icon: Lock, tile: "bg-status-pending-tint text-status-pending-deep" },
};

/** Spec §7 — error (retry), not found and no permission (back to tasks). No error codes. */
export function DetailFailure({ kind, onRetry }: { kind: GroupLoadFailure; onRetry: () => void }) {
  const t = useTranslations("tasks.detail");
  const v = VIEW[kind];
  const Icon = v.icon;
  return (
    <Card className="items-center gap-3 px-6 py-14 text-center">
      <span className={cn("flex size-12 items-center justify-center rounded-[14px]", v.tile)}>
        <Icon className="size-6" />
      </span>
      <span className="text-lg font-bold">{t(`page.${kind}Title`)}</span>
      <span className="max-w-md text-sm text-pretty text-muted-foreground">{t(`page.${kind}Text`)}</span>
      {kind === "error" ? (
        <Button size="sm" onClick={onRetry}>
          {t("page.retry")}
        </Button>
      ) : (
        <Button size="sm" nativeButton={false} render={<Link href="/dashboard/tasks" />}>
          {t("backToList")}
        </Button>
      )}
    </Card>
  );
}
