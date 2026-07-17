import { apiClient } from "@/lib/http/client";
import type { NotificationDto } from "@/lib/types/notification.types";

export const notificationService = {
  list: async (before?: string, limit = 20): Promise<NotificationDto[]> => {
    const params: Record<string, string | number> = { limit };
    if (before) params.before = before;
    const { data } = await apiClient.get<NotificationDto[]>("/api/notifications", { params });
    return data;
  },

  getUnreadCount: async (): Promise<number> => {
    const { data } = await apiClient.get<{ count: number }>("/api/notifications/unread-count");
    return data.count;
  },

  markRead: async (id: string): Promise<void> => {
    await apiClient.post(`/api/notifications/${id}/read`);
  },

  markAllRead: async (): Promise<void> => {
    await apiClient.post("/api/notifications/read-all");
  },
};
