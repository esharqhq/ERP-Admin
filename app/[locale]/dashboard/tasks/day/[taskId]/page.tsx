"use client";

import { use, useEffect } from "react";
import { AxiosError } from "axios";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { complaintKeys } from "@/hooks/use-complaints";
import { isPermissionDenied } from "@/lib/onboarding/errors";
import { taskService } from "@/lib/services/task.service";

/**
 * A day id → its booking page. Exists for the bell: every `Task` row carries
 * the day id, and the booking page is keyed on the booking id. `replace`, so
 * Back returns to where the admin clicked the bell, not to this hop.
 */
export default function TaskDayResolverPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = use(params);
  const t = useTranslations("complaints.detail");
  const tTasks = useTranslations("tasks.detail");
  const router = useRouter();
  const { data, isError, error, refetch } = useQuery({
    queryKey: complaintKeys.task(taskId),
    queryFn: () => taskService.getTask(taskId),
  });

  useEffect(() => {
    if (data?.groupId) router.replace(`/dashboard/tasks/${data.groupId}`);
  }, [data?.groupId, router]);

  if (isError) {
    // `GET /api/tasks/{id}` answers an unknown id with a bodiless `NotFound()`
    // (`TasksController.cs:584-585`) — no `error` code rides along, so the
    // HTTP status is the only signal for "this day does not exist".
    const httpStatus = error instanceof AxiosError ? error.response?.status : undefined;
    const forbidden = isPermissionDenied(error);
    const notFound = !forbidden && httpStatus === 404;
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-muted-foreground">
          {forbidden ? t("forbidden") : notFound ? t("notFound") : t("loadError")}
        </p>
        {!forbidden && !notFound ? (
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            {t("retry")}
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          className="gap-1.5 text-muted-foreground"
          render={<Link href="/dashboard/tasks" />}
        >
          <ArrowLeft className="size-4" />
          {tTasks("backToList")}
        </Button>
      </div>
    );
  }
  return <Skeleton className="h-40 w-full rounded-xl" />;
}
