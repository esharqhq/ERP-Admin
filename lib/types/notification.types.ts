export type NotificationType =
  | "WorkerApprovalPending"
  | "KycSubmitted"
  | "PropertyDocsSubmitted";

export type NotificationEntityType = "Worker" | "OwnerProfile" | "Property";

export type NotificationDto = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  entityType: NotificationEntityType | null;
  entityId: string | null;
  metadata: Record<string, string> | null;
  isRead: boolean;
  createdAt: string;
};
