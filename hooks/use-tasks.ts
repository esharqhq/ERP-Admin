"use client";

import { useQuery } from "@tanstack/react-query";
import { taskService } from "@/lib/services/task.service";

export function useAdminTaskGroups() {
  return useQuery({
    queryKey: ["admin-task-groups"],
    queryFn: taskService.getAdminTaskGroups,
  });
}
