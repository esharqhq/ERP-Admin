"use client";

import { Star, Sparkles, TrendingUp, ClipboardCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { WorkerRatingDto } from "@/lib/types/worker.types";

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground ring-1 ring-border">
        {icon}
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </span>
        <span className="font-heading text-xl font-semibold leading-none tracking-tight">
          {value}
        </span>
      </div>
    </div>
  );
}

export function RatingSnapshotCard({
  rating,
  isLoading,
}: {
  rating: WorkerRatingDto | undefined;
  isLoading: boolean;
}) {
  const t = useTranslations("workers.rating");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-base">{t("title")}</CardTitle>
          {rating && (
            <span className="text-[11px] text-muted-foreground">
              {t("calculatedAt", {
                date: new Date(rating.calculatedAt).toLocaleDateString(),
              })}
            </span>
          )}
        </div>
        {rating &&
          (rating.isNew ? (
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="size-3" />
              {t("new")}
            </Badge>
          ) : (
            <Badge variant="outline">{rating.label}</Badge>
          ))}
      </CardHeader>
      <CardContent>
        {isLoading || !rating ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Metric
              icon={
                <Star
                  className={cn(
                    "size-4",
                    rating.isNew
                      ? "text-muted-foreground"
                      : "text-amber-500 dark:text-amber-400",
                  )}
                />
              }
              label={t("score")}
              value={
                rating.displayRating === null
                  ? t("new")
                  : rating.displayRating.toFixed(2)
              }
            />
            <Metric
              icon={<TrendingUp className="size-4" />}
              label={t("completionRate")}
              value={`${(rating.completionRate * 100).toFixed(0)}%`}
            />
            <Metric
              icon={<ClipboardCheck className="size-4" />}
              label={t("tasks")}
              value={`${rating.completedTasks} / ${rating.totalTasks}`}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
