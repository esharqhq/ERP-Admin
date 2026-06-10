import { Clock, PlayCircle, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocale, useTranslations } from "next-intl";
import type { TaskGroupDto } from "@/lib/types/task.types";

interface ActivityTimelineProps {
  taskGroups: TaskGroupDto[];
  /** propertyId → property name (the endpoint returns propertyId only). */
  propertyNames: Record<string, string>;
}

function formatDate(iso: string, locale: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
}

/** Earliest scheduled date (yyyy-MM-dd sorts lexicographically); falls back to createdAt. */
function firstScheduledDate(group: TaskGroupDto): string {
  if (group.dates && group.dates.length > 0) {
    return [...group.dates].map((d) => d.scheduledDate).sort()[0];
  }
  return group.createdAt;
}

function StatusIcon({ status }: { status: string }) {
  if (status === "Active") return <PlayCircle className="size-4 text-blue-500" />;
  if (status === "Done") return <CheckCircle2 className="size-4 text-emerald-500" />;
  if (status === "Cancelled") return <XCircle className="size-4 text-red-500" />;
  return <Clock className="size-4 text-amber-500" />;
}

function statusVariant(status: string): "default" | "secondary" | "destructive" {
  if (status === "Done") return "default";
  if (status === "Cancelled") return "destructive";
  return "secondary";
}

export function ActivityTimeline({ taskGroups, propertyNames }: ActivityTimelineProps) {
  const t = useTranslations("owners");
  const locale = useLocale();

  return (
    <Card>
      <CardHeader className="pb-3">
        <h2 className="font-heading text-base font-semibold tracking-tight">{t("activity.title")}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t("activity.subtitle")}
        </p>
      </CardHeader>

      {taskGroups.length === 0 ? (
        <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
          <Clock className="size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{t("activity.empty")}</p>
        </CardContent>
      ) : (
        <CardContent className="flex flex-col gap-2.5">
          {taskGroups.map((group) => (
            <div
              key={group.id}
              className="flex items-start gap-3 rounded-lg border border-border bg-card p-2.5"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                <StatusIcon status={group.status} />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[13px] font-medium leading-tight">
                  {group.title ?? t("activity.unnamed")}
                </span>
                <span className="truncate text-[11px] text-muted-foreground">
                  {propertyNames[group.propertyId] ?? "—"}
                </span>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  {formatDate(firstScheduledDate(group), locale)}
                </span>
                <Badge variant={statusVariant(group.status)} className="text-[10px]">
                  {group.status}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}
