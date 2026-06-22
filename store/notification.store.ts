import { create } from "zustand";

export type InAppNotification = {
  id: string;
  title: string;
  body: string;
  receivedAt: number;
  isRead: boolean;
};

type NotificationStore = {
  notifications: InAppNotification[];
  addNotification: (title: string, body: string) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
};

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],

  addNotification: (title, body) =>
    set((s) => ({
      notifications: [
        {
          id: crypto.randomUUID(),
          title,
          body,
          receivedAt: Date.now(),
          isRead: false,
        },
        ...s.notifications,
      ].slice(0, 50),
    })),

  markRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ),
    })),

  markAllRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, isRead: true })),
    })),
}));
