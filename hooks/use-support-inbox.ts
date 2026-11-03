"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supportService } from "@/lib/services/support.service";
import { useAuthStore } from "@/store/auth.store";
import { useRequesterNames } from "@/hooks/use-requester-names";
import { requesterKind } from "@/lib/support/requester";
import { normalizeStatus } from "@/lib/types/task.types";
import type {
  SupportInboxRow,
  SupportInboxQuery,
} from "@/lib/types/support.types";
import type { SupportTicketStatusName } from "@/lib/types/support.types";

/**
 * Unified Support Inbox rows. FALLBACK MODE: fetches all tickets + the admin
 * conversations inbox and joins them by ticketId client-side, then filters/sorts
 * in memory. The tickets list is the spine (it owns subject/category); the
 * matching conversation contributes lastMessageAt. When the backend ships
 * `GET /api/admin/support/inbox`, replace the two queries + join with one call
 * returning SupportInboxRow[] — this hook's return shape stays identical.
 */
export function useSupportInbox(query: SupportInboxQuery) {
  const myId = useAuthStore((s) => s.adminMe?.id);

  const ticketsQ = useQuery({
    queryKey: ["support-inbox", "tickets"],
    queryFn: () => supportService.listAll(),
  });
  const convosQ = useQuery({
    queryKey: ["support-inbox", "conversations"],
    queryFn: () => supportService.listConversations(),
  });

  // The tickets carry no requester name; this reads it from the profiles.
  const requesterRefs = useMemo(
    () =>
      (ticketsQ.data ?? []).map((tk) => ({
        id: tk.requesterUserId,
        type: tk.requesterUserType,
      })),
    [ticketsQ.data],
  );
  const names = useRequesterNames(requesterRefs);

  const rows = useMemo<SupportInboxRow[]>(() => {
    const tickets = ticketsQ.data ?? [];
    const convos = convosQ.data ?? [];
    const convoByTicket = new Map(convos.map((c) => [c.ticketId, c]));

    let out: SupportInboxRow[] = tickets.map((tk) => {
      const c = convoByTicket.get(tk.id);
      return {
        ticketId: tk.id,
        conversationId: tk.conversationId,
        subject: tk.subject,
        category: tk.category,
        priority: tk.priority,
        status: tk.status as SupportTicketStatusName,
        requesterUserId: tk.requesterUserId,
        requesterKind: requesterKind(tk.requesterUserType),
        requesterName: names.get(tk.requesterUserId)?.name ?? null,
        assignedAdminId: tk.assignedAdminId,
        lastMessageAt: c?.lastMessageAt ?? null,
        createdAt: tk.createdAt,
      };
    });

    // Filters
    if (query.scope === "mine" && myId) {
      out = out.filter((r) => r.assignedAdminId === myId);
    }
    if (query.status) {
      const s = normalizeStatus(query.status);
      out = out.filter((r) => normalizeStatus(r.status) === s);
    }
    if (query.priority) {
      const p = normalizeStatus(query.priority);
      out = out.filter((r) => normalizeStatus(r.priority) === p);
    }
    if (query.category) {
      const cat = normalizeStatus(query.category);
      out = out.filter((r) => normalizeStatus(r.category) === cat);
    }
    if (query.search) {
      const q = query.search.toLowerCase();
      out = out.filter(
        (r) =>
          r.subject.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          r.requesterKind.includes(q) ||
          (r.requesterName ?? "").toLowerCase().includes(q),
      );
    }

    // Sort: lastMessageAt desc, fallback createdAt desc.
    return out.sort((a, b) => {
      const ax = a.lastMessageAt ?? a.createdAt;
      const bx = b.lastMessageAt ?? b.createdAt;
      return bx.localeCompare(ax);
    });
  }, [ticketsQ.data, convosQ.data, query, myId, names]);

  return {
    rows,
    isLoading: ticketsQ.isLoading || convosQ.isLoading,
    isError: ticketsQ.isError || convosQ.isError,
  };
}
