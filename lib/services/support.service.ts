import { apiClient } from "@/lib/http/client";
import type {
  SupportTicketDto,
  ConversationMessageDto,
  SendMessageRequest,
} from "@/lib/types/support.types";

export const supportService = {
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
};
