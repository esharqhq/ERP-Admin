"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Copy, Info, XCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Can } from "@/components/auth/can";
import { DayPanel } from "@/components/tasks/detail/day-panel";
import { DaysList } from "@/components/tasks/detail/days-list";
import { DetailHeaderCard } from "@/components/tasks/detail/detail-header-card";
import { DetailModals, type DetailModal } from "@/components/tasks/detail/detail-modals";
import { DetailFailure, DetailSkeleton } from "@/components/tasks/detail/detail-page-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTaskRead } from "@/hooks/use-complaints";
import { useWalkInOwnerId } from "@/hooks/use-owners";
import { useTaskGroup } from "@/hooks/use-tasks";
import { useLiveClock, useTodayKey } from "@/hooks/use-today";
import { Link } from "@/i18n/navigation";
import { isWalkInSource } from "@/lib/tasks/clone-order";
import { bookingCancelledAt, headerPlace, isNothingLeftToRun, isSingleDay } from "@/lib/tasks/detail/booking-facts";
import { classifyGroupLoad } from "@/lib/tasks/detail/page-state";
import { dayToPin, resolveSelectedDay, sortDays } from "@/lib/tasks/detail/select-day";
import { isGroupActive } from "@/lib/tasks/staffing";
import { canonicalTaskStatus } from "@/lib/tasks/status-vocab";

/** Writes `?day=` in place — no history entry, no route refetch. */
function writeDay(taskId: string) {
  window.history.replaceState(null, "", `?day=${encodeURIComponent(taskId)}`);
}

/**
 * The booking page — spec `2026-10-05-admin-task-detail-design.md`. Thin on
 * purpose: every decision is a tested function in `lib/tasks/detail/`.
 */
export default function TaskGroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("tasks");
  const tDetail = useTranslations("tasks.detail");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const dayParam = searchParams.get("day");
  // Ticks each minute: "34 min past start" and the late verdicts must move.
  const now = useLiveClock();
  const todayKey = useTodayKey();

  const { data: group, isLoading, error, refetch } = useTaskGroup(id);
  const walkIn = useWalkInOwnerId();
  const [modal, setModal] = useState<DetailModal>(null);

  const days = useMemo(() => sortDays(group?.tasks ?? []), [group?.tasks]);
  const selected = resolveSelectedDay(days, dayParam, now, todayKey);
  const selectedId = selected?.id ?? null;

  // Pin the resolved day into the URL (also over a stale `?day=`), so it does not
  // jump as the clock turns a day "late", and so the address is shareable.
  // `history.replaceState` rather than `router.replace`: Next 16 syncs it with
  // `useSearchParams` (docs: single-page-applications.md → "Native History API"),
  // so switching days does not refetch the route.
  const pin = dayToPin(dayParam, selectedId, now);
  useEffect(() => {
    if (pin) writeDay(pin);
  }, [pin]);
  const selectDay = writeDay;

  /**
   * `null` while the walk-in lookup has not answered — then copy is hidden. A
   * walk-in's `propertyAddress` is a placeholder, so the header says "Walk-in order".
   */
  const sourceIsWalkIn = group ? isWalkInSource(group, walkIn.isSuccess ? walkIn.data : undefined) : null;

  const selectedState = selected ? canonicalTaskStatus(selected.status) : null;
  // The complaint rides only on `GET /api/tasks/{id}`. A disputed day needs it (reason,
  // photos). An upheld day reads its note from `closureNote` (§0k·1); only a row the
  // 2026-10-06 backfill did not reach (no note, no close time) still falls back to it.
  const needsComplaint =
    !!selected &&
    (selectedState === "rejected" ||
      (selectedState === "done" &&
        selected.closureReason === "ClosedReplacement" &&
        selected.closureNote == null &&
        selected.closedAt == null));
  const complaintRead = useTaskRead(selectedId ?? "", needsComplaint);
  const complaint = needsComplaint ? (complaintRead.data?.complaint ?? null) : null;

  const backButton = (
    <Button
      variant="ghost"
      size="sm"
      nativeButton={false}
      className="w-fit gap-1.5 text-muted-foreground"
      render={<Link href="/dashboard/tasks" />}
    >
      <ArrowLeft className="size-4" />
      {tDetail("backToList")}
    </Button>
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {backButton}
        <DetailSkeleton single={false} />
      </div>
    );
  }
  if (error || !group) {
    return (
      <div className="flex flex-col gap-4">
        {backButton}
        <DetailFailure kind={error ? classifyGroupLoad(error) : "error"} onRetry={() => refetch()} />
      </div>
    );
  }

  const single = isSingleDay(group);
  const nothingLeft = isNothingLeftToRun(group);
  const cancelledOn = bookingCancelledAt(days);
  // §0k·3: the header comes from the booking — no property or owner read. ⚠ `ownerId`
  // is whoever booked; the header names the property's BOSS (`bossOwnerName`).
  const place = headerPlace({
    isWalkIn: sourceIsWalkIn,
    address: group.propertyAddress,
    propertyName: group.propertyName ?? days[0]?.propertyName,
  });
  const ownerName = group.bossOwnerName?.trim() || null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {backButton}
        <div className="flex flex-wrap gap-2">
          {/* Any state can be copied (F-07 ·10) — a finished booking is what gets repeated. */}
          {sourceIsWalkIn !== null ? (
            <Can permission="task_group:create_any">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setModal({ type: "clone" })}>
                <Copy className="size-3.5" />
                {t("clone.action")}
              </Button>
            </Can>
          ) : null}
          {isGroupActive(group) && !nothingLeft ? (
            <Can permission="task_group:cancel_any">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-destructive"
                onClick={() => setModal({ type: "cancelGroup" })}
              >
                <XCircle className="size-3.5" />
                {single ? tDetail("cancelTask") : tDetail("cancelBooking")}
              </Button>
            </Can>
          ) : null}
        </div>
      </div>

      {nothingLeft ? (
        <div className="flex items-center gap-3 rounded-xl bg-muted/60 px-4 py-3 ring-1 ring-inset ring-border">
          <Info className="size-4 flex-none text-muted-foreground" />
          <span className="text-[13px]">
            {/* §0k·2: the booking's own cancel date, read from the days that went with it;
                without one, the neutral count (one day can be cancelled on its own or by the timer). */}
            {cancelledOn !== null
              ? tDetail("bookingCancelled", {
                  date: new Date(cancelledOn).toLocaleDateString(locale, { dateStyle: "medium" }),
                })
              : tDetail("nothingLeft", { cancelled: group.days.cancelled, total: group.days.total })}
          </span>
        </div>
      ) : null}

      <DetailHeaderCard
        group={group}
        days={days}
        selectedId={selectedId}
        onSelect={selectDay}
        single={single}
        ownerName={ownerName}
        place={place}
        locale={locale}
      />

      <div className={single ? "flex flex-col gap-4" : "grid items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)]"}>
        {!single ? (
          <DaysList
            days={days}
            selectedId={selectedId}
            onSelect={selectDay}
            now={now}
            locale={locale}
            group={group}
          />
        ) : null}
        {selected ? (
          <DayPanel
            task={selected}
            complaint={complaint}
            now={now}
            locale={locale}
            todayKey={todayKey}
            onModal={setModal}
          />
        ) : (
          <Card className="px-5 py-10 text-center text-sm text-muted-foreground">{tDetail("noDays")}</Card>
        )}
      </div>

      <DetailModals
        modal={modal}
        group={group}
        groupId={id}
        sourceIsWalkIn={sourceIsWalkIn}
        now={now}
        onClose={() => setModal(null)}
      />
    </div>
  );
}
