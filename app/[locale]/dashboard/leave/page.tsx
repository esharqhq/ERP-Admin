"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarOff } from "lucide-react";
import { LeaveQueueList } from "@/components/leave/leave-queue-list";
import { LeaveDecisionPane } from "@/components/leave/leave-decision-pane";
import { useLeaveRequests } from "@/hooks/use-leave";
import { orderQueue } from "@/lib/leave/queue-order";
import {
  LEAVE_STATUS_FILTERS,
  type LeaveStatusFilter,
} from "@/lib/types/leave.types";

function parseStatus(raw: string | null): LeaveStatusFilter {
  return (LEAVE_STATUS_FILTERS as readonly string[]).includes(raw ?? "")
    ? (raw as LeaveStatusFilter)
    : "Pending";
}

/**
 * Queue + decision panel, replacing the six-column table and its modal.
 *
 * Both the tab and the selected request live in the URL. Keeping only the
 * selection there would restore a request on reload without the tab that
 * contains it, and the queue would render empty behind a populated panel.
 */
export default function LeavePage() {
  const t = useTranslations("leave");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const status = parseStatus(searchParams.get("status"));
  const selectedId = searchParams.get("request");

  const {
    data: requests = [],
    isLoading,
    isError,
  } = useLeaveRequests(status === "all" ? undefined : status);

  // Soonest affected shift first. The server returns createdAt-descending, which
  // treats a shift in four hours and one next month as equally urgent — the exact
  // reading this screen exists to replace. See `bySoonestAffected` for what a
  // null sort key means, and why a past date sorts to the very top.
  const rows = useMemo(() => orderQueue(requests), [requests]);

  const selected = useMemo(
    () => rows.find((r) => r.id === selectedId) ?? null,
    [rows, selectedId],
  );

  const select = useCallback(
    (requestId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("request", requestId);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const clearSelection = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("request");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [router, pathname, searchParams]);

  // Switching tabs always drops the selection: the open request is almost never
  // in the tab being moved to, and a stale ?request= would render the pane empty.
  const selectStatus = useCallback(
    (next: LeaveStatusFilter) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("status", next);
      params.delete("request");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  // A ?request= that this tab's payload does not contain — a shared link, a
  // bookmark, a request someone else decided. The pane already falls back to the
  // empty state; drop the param too, so the URL stops carrying a dead id.
  const staleSelection =
    !!selectedId && !selected && !isLoading && !isError;
  useEffect(() => {
    if (staleSelection) clearSelection();
  }, [staleSelection, clearSelection]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* The dashboard <main> is `flex flex-1 flex-col`, so the grid fills what is
          left of it — no viewport arithmetic that has to be re-tuned whenever the
          header above changes height. `min-h` is a floor, not a size. */}
      <div className="grid min-h-[30rem] flex-1 grid-cols-1 overflow-hidden rounded-xl border border-border bg-card shadow-sm md:grid-cols-[23.5rem_1fr]">
        {/* Left pane: hidden on mobile once a request is selected */}
        <div
          className={`min-h-0 border-border md:border-r ${
            selected ? "hidden md:block" : "block"
          }`}
        >
          <LeaveQueueList
            rows={rows}
            isLoading={isLoading}
            isError={isError}
            status={status}
            onStatusChange={selectStatus}
            selectedId={selected?.id ?? null}
            onSelect={select}
          />
        </div>

        {/* Right pane */}
        <div
          className={`min-h-0 min-w-0 ${
            selected ? "flex flex-col" : "hidden md:flex md:flex-col"
          }`}
        >
          {selected ? (
            <LeaveDecisionPane
              key={selected.id}
              request={selected}
              onBack={clearSelection}
              // The decided request leaves this status-filtered list, so the pane
              // has nothing left to show; clearing keeps the URL honest too.
              onDecided={clearSelection}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 bg-muted/30 p-8 text-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <CalendarOff className="size-7" />
              </span>
              <div className="flex flex-col gap-1">
                <p className="text-base font-medium">{t("pane.emptyTitle")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("pane.emptyHint")}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
