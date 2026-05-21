import { apiClient } from "@/lib/http/client";

export interface TaskWorkerAssignmentDto {
  id: string;
  taskId: string;
  workerId: string;
  assignedAt: string;
  checkinAt: string | null;
  checkoutAt: string | null;
}

export interface AdminTaskItemDto {
  id: string;
  groupId: string;
  propertyId: string;
  scheduledDate: string;   // "YYYY-MM-DD"
  scheduledAt: string;
  deadline: string | null;
  status: string | null;
  workers: TaskWorkerAssignmentDto[] | null;
}

export interface AdminTaskGroupDto {
  id: string;
  propertyId: string;
  ownerId: string;
  title: string | null;
  status: string | null;
  tasks: AdminTaskItemDto[] | null;
  createdAt: string;
}

export const taskService = {
  getAdminTaskGroups: async (): Promise<AdminTaskGroupDto[]> => {
    const { data } = await apiClient.get<AdminTaskGroupDto[]>("/api/tasks/admin/groups");
    return data;
  },
};
