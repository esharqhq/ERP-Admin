"use client";

import { AlertTriangle, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { lateBy, refusalReasonKey, type AttendanceRow } from "@/lib/attendance/status";
import { EMPTY, hhmm, metres } from "@/lib/attendance/format";
import { coordsAreScanners } from "@/lib/attendance/checkin-door";
import { CheckinDoorLabel } from "@/components/attendance/checkin-door-label";
import { cn } from "@/lib/utils";

/**
 * The check-in cell: a time on top, refusals underneath.
 *
 * **A refusal is a check-in that did not happen, so it belongs here** — not in a
 * column of its own. That is the design's central decision about the four F-06c
 * fields and it is also why the table still fits seven columns: an eighth column
 * would have been empty on almost every row of almost every day, and the one place
 * a reader looks to ask *"did they get in?"* is exactly where the answer *"they
 * tried and were turned away"* has to be.
 *
 * The two lines are independent, which is the case the layout exists for: a
 * refusal count and a successful check-in **coexist**. The count is history,
 * `present` is now. Both lines stay, so the forty minutes between them have an
 * explanation.
 *
 * The door (F-07 ·2 `checkinDoor`) is a third, quieter line under the time — a
 * caption, not a chip, because the row already has its one badge. It is absent
 * for `null` (never checked in, or a pre-2026-09-22 row) rather than guessed.
 */
export function CheckinCell({
  row,
  nowMs,
  isToday,
  locale,
}: {
  row: AttendanceRow;
  nowMs: number;
  isToday: boolean;
  locale: string;
}) {
  const t = useTranslations("attendance");
  const hasCoords = row.checkinLat != null && row.checkinLng != null;
  // ⚠ On a staff scan the pair is the SCANNER's phone, not the worker's — the
  // pin still opens it, but its tooltip has to say whose location it is.
  const scannerCoords = coordsAreScanners(row.checkinDoor);
  const delta = lateBy(row, nowMs, isToday);

  return (
    <div className="flex flex-col gap-0.5">
      <span className="flex items-center gap-1.5">
        <span
          className={cn(
            "font-mono text-[13px] tabular-nums",
            row.checkinAt ? "text-foreground" : "text-muted-foreground/50",
          )}
        >
          {hhmm(row.checkinAt, locale)}
        </span>

        {/*
          The pin is drawn only when **both** halves of the pair are present. The
          two fields are separately nullable on the wire, and a map link built from
          one of them would point at the equator.
        */}
        {hasCoords && (
          <a
            href={`https://www.google.com/maps?q=${row.checkinLat},${row.checkinLng}`}
            target="_blank"
            rel="noopener noreferrer"
            /* The row itself opens the detail sheet, so an inner link has to keep
               its click to itself or the map and the sheet both fire. */
            onClick={(e) => e.stopPropagation()}
            title={t(scannerCoords ? "cell.mapTooltipScanner" : "cell.mapTooltip", {
              lat: String(row.checkinLat),
              lng: String(row.checkinLng),
            })}
            aria-label={
              scannerCoords
                ? `${t("cell.openMap")}. ${t("door.scannerCoords")}.`
                : t("cell.openMap")
            }
            className="flex-none text-ink-soft transition-colors hover:text-primary"
          >
            <MapPin className="size-3" />
          </a>
        )}

        {delta != null && <DeltaChip minutes={delta} kind={row.kind} />}
      </span>

      <CheckinDoorLabel door={row.checkinDoor} />

      {row.refused && <RefusalLine row={row} />}
    </div>
  );
}

/**
 * How late, in minutes, beside the time.
 *
 * Grace is a **client constant**, not an API field — the response sends two
 * timestamps and no notion of lateness — so the number is ours and is drawn in
 * mono to say so. `on time` rather than `+0m` for anything inside the window,
 * because a punctual arrival should not read as a measurement.
 */
function DeltaChip({ minutes, kind }: { minutes: number; kind: AttendanceRow["kind"] }) {
  const t = useTranslations("attendance.cell");
  const late = kind === "late" || kind === "overdue";
  return (
    <span
      className={cn(
        "flex-none font-mono text-[10.5px] tabular-nums",
        kind === "overdue"
          ? "text-status-cancelled"
          : kind === "late"
            ? "text-status-pending-deep"
            : "text-muted-foreground/70",
      )}
    >
      {late
        ? t("lateBy", { minutes })
        : minutes < 0
          ? t("earlyBy", { minutes })
          : t("onTime")}
    </span>
  );
}

/**
 * *"3 refused · outside geofence · 142 m"*
 *
 * Three clauses, each of which can be absent, assembled rather than templated:
 *
 * - The **count** is always there when this renders. It counts attempt *windows* —
 *   the backend deduplicates to one per (task, worker) per fifteen minutes — so the
 *   wording is "refused", never "failed requests": a worker fighting poor signal
 *   who retries ten times in a minute produces `1`.
 * - The **reason** is dropped when it is not one of the three the DTO documents.
 *   The field is a plain `string` on the wire and the union is our assertion about
 *   it, so an unrecognised value must not leave a dangling separator behind.
 * - The **metres** exist only for `OutsideGeofence`. The other two reasons refuse
 *   before any distance can be computed, so the line simply ends — never `0 m`,
 *   which would read as standing on the target. A chip without a number is a
 *   normal case here, not missing data.
 */
function RefusalLine({ row }: { row: AttendanceRow }) {
  const t = useTranslations("attendance.refusal");
  const reason = refusalReasonKey(row.lastRefusalReason);
  const distance = metres(row.lastRefusalDistanceMeters);

  const parts = [t("count", { count: row.refusedCheckinCount })];
  if (reason) parts.push(t(`reason.${reason}`));
  if (distance != null) parts.push(t("distance", { meters: distance }));

  return (
    <span className="flex items-center gap-1 text-[10.5px] font-medium text-status-cancelled-deep">
      <AlertTriangle className="size-2.5 flex-none" />
      <span className="truncate">{parts.join(" · ")}</span>
    </span>
  );
}

/**
 * The check-out cell.
 *
 * ⚠ **`checkoutAt` is task-wide, not per worker.** The backend stamps it for every
 * worker on the task at once when the owner accepts it, so the second line says
 * `task-wide` and the copy never says *"left at"* and never derives a worked
 * duration from it. A per-worker time and a per-worker duration are both things
 * this field cannot support, and both are things a reader would otherwise assume.
 */
export function CheckoutCell({ row, locale }: { row: AttendanceRow; locale: string }) {
  const t = useTranslations("attendance.cell");
  // `submittedAt` is separately nullable, so the "sent 11:04" clause is only
  // offered when there is a time to put in it — never "sent —".
  const sub = row.checkoutAt
    ? row.submittedAt
      ? t("sent", { time: hhmm(row.submittedAt, locale) })
      : t("taskWide")
    : row.checkinAt
      ? t("stillOnSite")
      : EMPTY;

  return (
    <div className="flex flex-col gap-0.5">
      <span
        className={cn(
          "font-mono text-[13px] tabular-nums",
          row.checkoutAt ? "text-foreground" : "text-muted-foreground/50",
        )}
      >
        {hhmm(row.checkoutAt, locale)}
      </span>
      <span className="truncate text-[10.5px] text-muted-foreground/80">{sub}</span>
    </div>
  );
}
