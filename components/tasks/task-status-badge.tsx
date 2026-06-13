"use client";
import { Badge } from "@/components/ui/badge";
import { normalizeStatus } from "@/lib/types/task.types";

export function TaskStatusBadge({ status }: { status: string }) {
  const s = normalizeStatus(status);
  const variant =
    s === "active"
      ? "default"
      : s === "done"
        ? "secondary"
        : s === "cancelled"
          ? "destructive"
          : "outline";
  return <Badge variant={variant}>{status || "—"}</Badge>;
}
