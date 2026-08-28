"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supportService } from "@/lib/services/support.service";
import { useCurrentPermissions } from "@/hooks/use-current-permissions";
import { normalizeStatus } from "@/lib/types/task.types";
import type { SupportTicketDto } from "@/lib/types/support.types";

/** Open before closed, then newest first — an unanswered thread is the point. */
const CLOSED = new Set(["resolved", "closed"]);

export interface SubjectTickets {
  tickets: SupportTicketDto[];
  /** Threads still awaiting an answer. Drives the header's count chip. */
  openCount: number;
  /** `null` while the grant set is unknown — not the same as `false`. */
  canRead: boolean | null;
  isPending: boolean;
  isError: boolean;
}

/**
 * Every support thread this account is the requester of.
 *
 * `GET /api/support-tickets/admin/all` is unpaginated and returns every ticket
 * in the system, so this reads it **under the same query key the support inbox
 * uses** and filters in memory. On a panel where the inbox has already been
 * opened this costs no request at all, and there is no per-user ticket read to
 * prefer — listing threads by target user is filed in `BACKEND-ASKS.md`.
 *
 * Matched on `requesterUserId` alone. `requesterUserType` is not part of the
 * predicate: it comes back as a friendly label on one route and as the backend
 * enum code (`"OWNER_USER"`) on another, and a user id is already unique across
 * both. A ticket an admin opened *for* this account is filed as the account's
 * own, which is what makes the Message button and this card the same story.
 */
export function useSubjectTickets(
  userId: string | null | undefined,
): SubjectTickets {
  const { permissions } = useCurrentPermissions();
  const canRead: boolean | null =
    permissions === null ? null : permissions.has("support_ticket:list_any");

  const query = useQuery({
    queryKey: ["support-inbox", "tickets"],
    queryFn: () => supportService.listAll(),
    enabled: canRead === true,
  });

  const tickets = useMemo(() => {
    if (!userId) return [];
    return (query.data ?? [])
      .filter((t) => t.requesterUserId === userId)
      .sort((a, b) => {
        const aClosed = CLOSED.has(normalizeStatus(a.status));
        const bClosed = CLOSED.has(normalizeStatus(b.status));
        if (aClosed !== bClosed) return aClosed ? 1 : -1;
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [query.data, userId]);

  return {
    tickets,
    openCount: tickets.filter((t) => !CLOSED.has(normalizeStatus(t.status)))
      .length,
    canRead,
    isPending: canRead === true && query.isPending,
    isError: query.isError,
  };
}
