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
  // F-06a. ⚠ Nothing reads these two literals, and that is correct rather than an
  // oversight: `notificationRoute` switches on `entityType` alone and both share one
  // destination. The union exists to document what actually arrives in an admin's
  // bell, which is what makes the ABSENCE of 63/64/65/67 - the worker's own notices -
  // meaningful. Do not go looking for a consumer.
  | "SkillRequestSubmitted"
  | "SkillRequestResponded"
  // F-07 — `entityType: "Task"` rows an admin receives (entityId = the day id).
  // Only the two complaint kinds are read (`notificationRoute`); the rest are
  // listed so their presence in the bell is documented. 80 `TaskComplaintDecided`
  // is deliberately absent: it goes to the owner and the workers, not admins.
  | "TaskComplaintRaised"
  | "TaskComplaintEscalated"
  | "TaskStaffingWarning"
  | "TaskStaffingCritical"
  | "TaskOverdue"
  | "TaskStuckEscalated"
  // any type the backend adds later: render the row, do not crash
  | (string & {});

export type NotificationEntityType =
  | "Worker"
  | "OwnerProfile"
  | "Property"
  | "OwnerContract"
  | "WorkerContract"
  | "SupportTicket"
  | "Onboarding"
  | "AgencyApplication"
  | "WorkerAgencyLink"
  | "WorkerProfessionRequest"
  | "Task";

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
