"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { supportService } from "@/lib/services/support.service";
import type {
  ConversationMessageDto,
  SendMessageRequest,
} from "@/lib/types/support.types";

// ── Conversations inbox ────────────────────────────────────────────────────────
export function useConversations(status?: string, assignedAdminId?: string) {
  return useQuery({
    queryKey: ["conversations", status ?? "all", assignedAdminId ?? "any"],
    queryFn: () => supportService.listConversations(status, assignedAdminId),
  });
}

// ── Tickets ──────────────────────────────────────────────────────────────────
export function useTickets(status?: string) {
  return useQuery({
    queryKey: ["support-tickets", status ?? "all"],
    queryFn: () => supportService.listAll(status),
  });
}

export function useTicket(id: string) {
  return useQuery({
    queryKey: ["support-ticket", id],
    queryFn: () => supportService.getTicket(id),
    enabled: !!id,
  });
}

function useInvalidateTicket() {
  const qc = useQueryClient();
  return (id: string) => {
    qc.invalidateQueries({ queryKey: ["support-tickets"] });
    qc.invalidateQueries({ queryKey: ["support-ticket", id] });
  };
}

export function useAssignTicket() {
  const invalidate = useInvalidateTicket();
  return useMutation({
    mutationFn: ({ id, adminId }: { id: string; adminId: string }) =>
      supportService.assign(id, adminId),
    onSuccess: (_d, { id }) => invalidate(id),
  });
}

export function useResolveTicket() {
  const invalidate = useInvalidateTicket();
  return useMutation({
    mutationFn: (id: string) => supportService.resolve(id),
    onSuccess: (_d, id) => invalidate(id),
  });
}

export function useCloseTicket() {
  const invalidate = useInvalidateTicket();
  return useMutation({
    mutationFn: (id: string) => supportService.close(id),
    onSuccess: (_d, id) => invalidate(id),
  });
}

// ── Conversation messages ──────────────────────────────────────────────────
export function conversationMessagesKey(conversationId: string) {
  return ["conversation-messages", conversationId] as const;
}

/**
 * Single append path shared by send-success AND the live ReceiveMessage broadcast.
 * Dedups by message id so the sender's own echoed broadcast doesn't double-render
 * (the send endpoint broadcasts to the whole group, including the sender).
 */
export function appendMessageToCache(
  qc: QueryClient,
  conversationId: string,
  dto: ConversationMessageDto,
) {
  qc.setQueryData<ConversationMessageDto[]>(
    conversationMessagesKey(conversationId),
    (prev) => {
      if (!prev) return [dto];
      return prev.some((m) => m.id === dto.id) ? prev : [...prev, dto];
    },
  );
}

/**
 * Loads the latest 50 messages. Server returns newest-first; we sort ascending for
 * chat display via `select`.
 *
 * Liveness is now SignalR-first (ask #6: the hub authenticates admins over WS and
 * accepts admin JoinConversation). When the hub is connected (`isLive`), the 15s
 * poll is retired; if the connection drops, the poll resumes as a fallback so the
 * thread never goes stale.
 */
export function useConversationMessages(conversationId: string, isLive = false) {
  return useQuery({
    queryKey: conversationMessagesKey(conversationId),
    queryFn: () => supportService.getMessages(conversationId),
    enabled: !!conversationId,
    refetchInterval: isLive ? false : 15000,
    select: (msgs) =>
      [...msgs].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  });
}

export function useSendMessage(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SendMessageRequest) =>
      supportService.sendMessage(conversationId, body),
    onSuccess: (dto) => appendMessageToCache(qc, conversationId, dto),
  });
}
