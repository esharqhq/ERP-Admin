"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  HubConnectionBuilder,
  LogLevel,
  type HubConnection,
} from "@microsoft/signalr";
import { useAuthStore } from "@/store/auth.store";
import { upsertNotificationInCache } from "@/hooks/use-notifications";
import type { NotificationDto } from "@/lib/types/notification.types";
import { toast } from "sonner";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

/**
 * Best-effort real-time notification push via the `/hubs/chat` SignalR hub.
 * Fail-silent — never throws into render; the REST refetch on mount, window focus
 * and reconnect covers missed events (`notification-bell.md` §10).
 */
export function NotificationProvider() {
  const qc = useQueryClient();
  const connectionRef = useRef<HubConnection | null>(null);

  useEffect(() => {
    if (!BASE_URL) return;

    const connection = new HubConnectionBuilder()
      .withUrl(`${BASE_URL}/hubs/chat`, {
        accessTokenFactory: () => useAuthStore.getState().accessToken ?? "",
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.None)
      .build();

    connection.on("ReceiveNotification", (dto: NotificationDto) => {
      // Upsert by id, never append: an escalation re-fires with the same id
      // (§11.1), and appending it showed the row twice and over-counted.
      upsertNotificationInCache(qc, dto);
      toast(dto.title, { description: dto.body });
    });

    connection.onreconnected(() => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    });

    (async () => {
      try {
        await connection.start();
      } catch {
        // Hub unavailable — on-mount REST fetch covers state.
      }
    })();

    connectionRef.current = connection;

    return () => {
      const conn = connectionRef.current;
      connectionRef.current = null;
      if (!conn) return;
      conn.stop().catch(() => {});
    };
  }, [qc]);

  return null;
}
