"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
  type HubConnection,
} from "@microsoft/signalr";
import { useAuthStore } from "@/store/auth.store";
import { appendMessageToCache } from "@/hooks/use-support";
import type { ConversationMessageDto } from "@/lib/types/support.types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

/**
 * Best-effort real-time conversation push via the `/hubs/chat` SignalR hub.
 *
 * This layer is intentionally FAIL-SILENT: every hub interaction is guarded so a
 * connection/join failure logs and no-ops — it must never throw into render or block
 * the REST-backed thread, which works on its own (load + send + 15s poll).
 *
 * Known backend gaps (see plan "Backend asks") that currently prevent live push for
 * admins — both are 1-line server fixes after which this hook lights up unchanged:
 *  1. No `JwtBearerEvents.OnMessageReceived` reading `access_token` from query → WS/SSE
 *     can't authenticate (browsers can't set the Authorization header); only LongPolling does.
 *  2. ChatHub.JoinConversation checks `userType == "ADMIN"` (uppercase) but the admin role
 *     claim is `"Admin"` → admin JoinConversation throws `not_a_participant`.
 */
export function useConversationHub(conversationId: string | undefined) {
  const [isLive, setIsLive] = useState(false);
  const qc = useQueryClient();
  const connectionRef = useRef<HubConnection | null>(null);

  useEffect(() => {
    if (!conversationId || !BASE_URL) return;
    let cancelled = false;

    const connection = new HubConnectionBuilder()
      .withUrl(`${BASE_URL}/hubs/chat`, {
        accessTokenFactory: () => useAuthStore.getState().accessToken ?? "",
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.None)
      .build();

    connection.on("ReceiveMessage", (dto: ConversationMessageDto) => {
      if (dto?.conversationId === conversationId) {
        appendMessageToCache(qc, conversationId, dto);
      }
    });

    const onClosed = () => !cancelled && setIsLive(false);
    connection.onclose(onClosed);
    connection.onreconnecting(onClosed);
    connection.onreconnected(async () => {
      try {
        await connection.invoke("JoinConversation", conversationId);
        if (!cancelled) setIsLive(true);
      } catch {
        if (!cancelled) setIsLive(false);
      }
    });

    (async () => {
      try {
        await connection.start();
        await connection.invoke("JoinConversation", conversationId);
        if (!cancelled) setIsLive(true);
      } catch {
        // Connection or join rejected — REST + polling cover the thread. Stay silent.
        if (!cancelled) setIsLive(false);
      }
    })();

    connectionRef.current = connection;

    return () => {
      cancelled = true;
      const conn = connectionRef.current;
      connectionRef.current = null;
      if (!conn) return;
      (async () => {
        try {
          if (conn.state === HubConnectionState.Connected) {
            await conn.invoke("LeaveConversation", conversationId);
          }
        } catch {
          /* ignore */
        } finally {
          try {
            await conn.stop();
          } catch {
            /* ignore */
          }
        }
      })();
    };
  }, [conversationId, qc]);

  return { isLive };
}
