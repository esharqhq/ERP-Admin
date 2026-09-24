"use client";

import { use, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Skeleton } from "@/components/ui/skeleton";
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
  const router = useRouter();
  const { data, isError } = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => taskService.getTask(taskId),
  });

  useEffect(() => {
    if (data?.groupId) router.replace(`/dashboard/tasks/${data.groupId}`);
  }, [data?.groupId, router]);

  if (isError) {
    return <p className="text-sm text-muted-foreground">{t("notFound")}</p>;
  }
  return <Skeleton className="h-40 w-full rounded-xl" />;
}
