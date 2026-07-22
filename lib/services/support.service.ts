import { apiClient } from "@/lib/http/client";
import type {
  SupportTicketDto,
  ConversationMessageDto,
  ConversationSummaryDto,
  SendMessageRequest,
  PresignAttachmentRequest,
  PresignAttachmentResult,
} from "@/lib/types/support.types";

export const supportService = {
  // ── Conversations inbox (standalone) ───────────────────────────────────────
  /**
   * Admin conversations inbox; ordered by lastMessageAt ?? createdAt desc.
   * Requires `conversation:list_any`. Both filters optional (status =
   * Open|InProgress|Resolved|Closed PascalCase name).
   */
  listConversations: async (
    status?: string,
    assignedAdminId?: string,
  ): Promise<ConversationSummaryDto[]> => {
    const params: Record<string, string> = {};
    if (status) params.status = status;
    if (assignedAdminId) params.assignedAdminId = assignedAdminId;
    const { data } = await apiClient.get<ConversationSummaryDto[]>(
      "/api/admin/conversations",
      { params },
    );
    return data;
  },

  // ── Tickets ──────────────────────────────────────────────────────────────
  /** Admin: all tickets across the system; optional status filter (PascalCase enum name). */
  listAll: async (status?: string): Promise<SupportTicketDto[]> => {
    const params = status ? { status } : {};
    const { data } = await apiClient.get<SupportTicketDto[]>(
      "/api/support-tickets/admin/all",
      { params },
    );
    return data;
  },

  /** Single ticket with its conversation id (admin path uses support_ticket:read_any). */
  getTicket: async (id: string): Promise<SupportTicketDto> => {
    const { data } = await apiClient.get<SupportTicketDto>(
      `/api/support-tickets/${id}`,
    );
    return data;
  },

  /** support_ticket:assign — assign to an admin (sets status InProgress). */
  assign: async (id: string, adminId: string): Promise<SupportTicketDto> => {
    const { data } = await apiClient.post<SupportTicketDto>(
      `/api/support-tickets/${id}/assign`,
      { adminId },
    );
    return data;
  },

  /** support_ticket:resolve */
  resolve: async (id: string): Promise<SupportTicketDto> => {
    const { data } = await apiClient.post<SupportTicketDto>(
      `/api/support-tickets/${id}/resolve`,
    );
    return data;
  },

  /** support_ticket:close — archives the conversation. */
  close: async (id: string): Promise<SupportTicketDto> => {
    const { data } = await apiClient.post<SupportTicketDto>(
      `/api/support-tickets/${id}/close`,
    );
    return data;
  },

  // ── Conversation (inside the ticket) ───────────────────────────────────────
  /** Messages newest-first (cursor by `before`); admin uses conversation:read_any. */
  getMessages: async (
    conversationId: string,
    before?: string,
    limit = 50,
  ): Promise<ConversationMessageDto[]> => {
    const params: Record<string, string | number> = { limit };
    if (before) params.before = before;
    const { data } = await apiClient.get<ConversationMessageDto[]>(
      `/api/conversations/${conversationId}/messages`,
      { params },
    );
    return data;
  },

  /** Send a text message; server returns the created DTO and broadcasts ReceiveMessage. */
  sendMessage: async (
    conversationId: string,
    body: SendMessageRequest,
  ): Promise<ConversationMessageDto> => {
    const { data } = await apiClient.post<ConversationMessageDto>(
      `/api/conversations/${conversationId}/messages`,
      body,
    );
    return data;
  },

  /**
   * Mint a presigned upload URL scoped to this conversation. Attachment
   * storageKeys are tied to the conversation they were presigned for — the
   * generic /api/files/presign path is rejected on send with
   * `attachment_key_not_for_conversation`.
   */
  presignAttachment: async (
    conversationId: string,
    req: PresignAttachmentRequest,
  ): Promise<PresignAttachmentResult> => {
    const { data } = await apiClient.post<PresignAttachmentResult>(
      `/api/conversations/${conversationId}/attachments/presign`,
      req,
    );
    return data;
  },
};
