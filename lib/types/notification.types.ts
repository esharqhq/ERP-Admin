export type NotificationType =
  // pre-v2
  | "WorkerApprovalPending"
  | "KycSubmitted"
  | "PropertyDocsSubmitted"
  // v2 — admin recipients (subject-only types are deliberately absent)
  | "WorkerOnboardingSubmitted"
  | "OwnerContractSigned"
  | "WorkerContractSigned"
  | "OwnerContractRejected"
  | "WorkerContractRejected"
  | "OnboardingExpiryAdminAlert"
  | "TicketOpenedByUser"
  // any type the backend adds later: render the row, do not crash
  | (string & {});

export type NotificationEntityType =
  | "Worker"
  | "OwnerProfile"
  | "Property"
  | "OwnerContract"
  | "WorkerContract"
  | "SupportTicket";

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
