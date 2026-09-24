"use client";

import { use } from "react";
import { AxiosError } from "axios";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ComplaintDecisionCard } from "@/components/complaints/complaint-decision-card";
import { ComplaintEvidenceCard } from "@/components/complaints/complaint-evidence-card";
import { ComplaintTeamCard } from "@/components/complaints/complaint-team-card";
import { TaskStatusBadge } from "@/components/tasks/task-status-badge";
import { useTaskMedia, useTaskRead } from "@/hooks/use-complaints";
import { useHasPermission } from "@/hooks/use-current-permissions";
import { complaintState } from "@/lib/complaints/decision";
import { hoursWaiting, isEscalated } from "@/lib/complaints/waiting";
import { isPermissionDenied } from "@/lib/onboarding/errors";

function fmt(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

/**
 * One complaint (F-07 ·5). Keyed on the DAY id — which is what the bell carries
 * (79 has no `taskGroupId`) and what `GET /api/tasks/{taskId}` takes; that read
 * is the only one that fills `complaint`.
 */
export default function ComplaintPage({ params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = use(params);
  const t = useTranslations("complaints.detail");
  const tState = useTranslations("complaints.state");
  const locale = useLocale();
  const router = useRouter();
  const canReadMedia = useHasPermission("task:media:read_any");

  const task = useTaskRead(taskId);
  const media = useTaskMedia(taskId, canReadMedia);

  const back = (
    <Link href="/dashboard/complaints" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" />
      {t("back")}
    </Link>
  );

  if (task.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {back}
        <Skeleton className="h-10 w-1/2" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (task.isError) {
    // `GET /api/tasks/{id}` answers an unknown id with a bodiless `NotFound()`
    // (`TasksController.cs:584-585`) — no `error` code rides along, so the
    // HTTP status is the only signal for "this day does not exist".
    const httpStatus = task.error instanceof AxiosError ? task.error.response?.status : undefined;
    const forbidden = isPermissionDenied(task.error);
    const notFound = !forbidden && httpStatus === 404;
    return (
      <div className="flex flex-col gap-4">
        {back}
        <p className="text-sm text-muted-foreground">
          {forbidden ? t("forbidden") : notFound ? t("notFound") : t("loadError")}
        </p>
        {!forbidden && !notFound ? (
          <Button variant="outline" size="sm" className="w-fit" onClick={() => task.refetch()}>
            {t("retry")}
          </Button>
        ) : null}
      </div>
    );
  }

  if (!task.data) {
    return (
      <div className="flex flex-col gap-4">
        {back}
        <p className="text-sm text-muted-foreground">{t("notFound")}</p>
      </div>
    );
  }

  const day = task.data;
  const complaint = day.complaint ?? null;
  const state = complaintState(complaint);
  const now = new Date();
  const hours = complaint ? hoursWaiting(complaint.raisedAt, now) : null;
  const escalated = state === "open" && isEscalated(complaint?.raisedAt, now);

  return (
    <div className="flex flex-col gap-5">
      {back}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            {day.propertyName ?? "–"} · <span className="font-mono">{fmt(day.scheduledAt, locale)}</span>
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {state === "open" ? (
              <Badge tone={escalated ? "danger" : "warning"}>
                {escalated ? tState("escalated") : tState("open")}
              </Badge>
            ) : (
              <TaskStatusBadge status={day.status} />
            )}
            {state === "open" && hours !== null ? (
              <span className="font-mono tabular-nums">{t("waiting", { hours })}</span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {complaint?.supportTicketId ? (
            <Link href={`/dashboard/support/${complaint.supportTicketId}`} className="inline-flex items-center gap-1 text-primary hover:underline">
              {t("ticket")} <ExternalLink className="size-3.5" />
            </Link>
          ) : null}
          <Link href={`/dashboard/tasks/${day.groupId}`} className="inline-flex items-center gap-1 text-primary hover:underline">
            {t("booking")} <ExternalLink className="size-3.5" />
          </Link>
        </div>
      </div>

      {state === "none" ? (
        <p className="text-sm text-muted-foreground">{t("noComplaint")}</p>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {complaint ? <ComplaintEvidenceCard complaint={complaint} /> : null}
            <ComplaintTeamCard
              task={day}
              media={media.data}
              mediaForbidden={!canReadMedia || isPermissionDenied(media.error)}
              mediaLoading={media.isLoading}
              mediaError={media.isError && !isPermissionDenied(media.error)}
            />
          </div>
          <ComplaintDecisionCard task={day} onDecided={() => router.push("/dashboard/complaints")} />
        </>
      )}
    </div>
  );
}
