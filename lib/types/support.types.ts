// ── Support ticket + conversation types (mirror GermanyERP.Domain/Models/DTOs/Support/SupportDtos.cs) ──
// Enums serialize as their PascalCase string NAME (global JsonStringEnumConverter). Compare
// case-insensitively via normalizeStatus() from task.types (re-exported below for convenience).

export type SupportTicketStatusName =
  | "Open"
  | "InProgress"
  | "Resolved"
  | "Closed";

// Category / Priority are rendered as raw enum names (Payment | Task | Property | Technical
// | Account | Other ; Low | Normal | High | Urgent) — kept as string so new backend values
// never crash the UI.

export interface SupportTicketDto {
  id: string;
  subject: string;
  status: string; // SupportTicketStatusName
  category: string;
  priority: string;
  requesterUserId: string;
  requesterUserType: string; // "Owner" | "Worker" | "Admin"
  assignedAdminId: string | null;
  relatedPropertyId: string | null;
  relatedTaskGroupId: string | null;
  relatedTaskId: string | null;
  conversationId: string;
  conversationArchived: boolean;
  resolvedAt: string | null;
  closedAt: string | null;
  createdAt: string;
}

/**
 * Standalone conversations inbox row (backend ask #3: GET /api/admin/conversations).
 * Wire shape verified against the live API 2026-06-11. NOTE the field is
 * `requesterUserId` (NOT `requesterId` as the handoff doc wrote), and
 * `requesterUserType` comes back as the backend enum CODE ("OWNER_USER",
 * "WORKER", …), not a friendly label — kept as string, prettified in the UI.
 * Conversations are currently support-ticket-scoped 1:1 (`scope: "Support"`).
 */
export interface ConversationSummaryDto {
  id: string;
  ticketId: string;
  scope: string;
  requesterUserType: string;
  requesterUserId: string;
  assignedAdminId: string | null;
  ticketStatus: string;
  ticketPriority: string;
  /** Max non-deleted message time; null if no messages yet. */
  lastMessageAt: string | null;
  createdAt: string;
}

export interface MessageAttachmentDto {
  id: string;
  conversationMessageId: string;
  type: string; // AttachmentType name: Voice | Image | Video | File
  url: string;
  mimeType: string;
  sizeBytes: number;
  durationSeconds: number | null;
  fileName: string;
}

export interface ConversationMessageDto {
  id: string;
  conversationId: string;
  senderUserType: string; // "Admin" | "Owner" | "Worker"
  senderUserId: string | null;
  messageType: string; // MessageType name: User | System
  body: string | null;
  attachments: MessageAttachmentDto[];
  createdAt: string;
}

export interface SendMessageRequest {
  body?: string | null;
  // Outbound attachments (presign→confirm) deferred from v1; text-only for now.
  attachments?: null;
}

export interface AssignTicketRequest {
  adminId: string;
}

/** Filterable ticket statuses for the admin list (plus "all"). */
export const SUPPORT_STATUS_FILTERS = [
  "all",
  "Open",
  "InProgress",
  "Resolved",
  "Closed",
] as const;
export type SupportStatusFilter = (typeof SUPPORT_STATUS_FILTERS)[number];

// ── Unified Support Inbox (Tickets ∪ Conversations, joined by ticketId) ──────
export type SupportInboxScope = "all" | "mine";

/** One inbox row: a ticket plus its 1:1 conversation's activity fields. */
export interface SupportInboxRow {
  ticketId: string;
  conversationId: string;
  subject: string;
  category: string;
  priority: string; // Low | Normal | High | Urgent (kept string; new values won't crash)
  status: SupportTicketStatusName; // Open | InProgress | Resolved | Closed
  requesterUserType: string; // normalized to friendly form ("Owner"|"Worker"|"Admin")
  assignedAdminId: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  unreadCount?: number; // optional; drives the unread indicator when backend provides it
}

/** The controlled filter state emitted by inbox-filters. */
export interface SupportInboxQuery {
  scope: SupportInboxScope;
  status?: SupportTicketStatusName;
  priority?: string;
  category?: string;
  search?: string;
}
