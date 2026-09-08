"use client";

import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LeaveQueueRow } from "@/components/leave/leave-queue-row";
import {
  LEAVE_STATUS_FILTERS,
  type LeaveStatusFilter,
  type WorkerLeaveRequestDto,
} from "@/lib/types/leave.types";

const TAB_KEY: Record<LeaveStatusFilter, string> = {
  all: "all",
  Pending: "pending",
  Approved: "approved",
  Rejected: "rejected",
  Cancelled: "cancelled",
};

interface Props {
  rows: WorkerLeaveRequestDto[];
  isLoading: boolean;
  isError: boolean;
  status: LeaveStatusFilter;
  onStatusChange: (next: LeaveStatusFilter) => void;
  selectedId: string | null;
  onSelect: (requestId: string) => void;
}

export function LeaveQueueList({
  rows,
  isLoading,
  isError,
  status,
  onStatusChange,
  selectedId,
  onSelect,
}: Props) {
  const t = useTranslations("leave");

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex shrink-0 flex-col gap-2 border-b border-border px-3 pb-2.5 pt-3">
        <div className="flex gap-0.5 overflow-x-auto rounded-lg bg-muted/60 p-0.5">
          {LEAVE_STATUS_FILTERS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => onStatusChange(key)}
              className={`shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                status === key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(`tabs.${TAB_KEY[key]}`)}
              {/* Only the open tab gets a number. The list call is per-status, so
                  every other count would be a stale zero — worse than no count. */}
              {status === key && !isLoading && !isError && (
                <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">
                  {rows.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {isLoading ? (
          <div className="flex flex-col gap-1 px-4 py-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2 py-2">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="size-7 shrink-0 rounded-full" />
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Skeleton className="h-3.5 w-2/3" />
                    <Skeleton className="h-2.5 w-1/3" />
                  </div>
                </div>
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <p className="py-10 text-center text-sm text-destructive">
            {t("listError")}
          </p>
        ) : rows.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">
            {status === "Pending" ? t("emptyPending") : t("empty")}
          </p>
        ) : (
          rows.map((row) => (
            <LeaveQueueRow
              key={row.id}
              row={row}
              selected={row.id === selectedId}
              onSelect={onSelect}
            />
          ))
        )}
      </ScrollArea>
    </div>
  );
}
