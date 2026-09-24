import type { AttendanceRowDto } from "@/lib/types/attendance.types";
import { canonicalTaskStatus } from "@/lib/tasks/status-vocab";
import { normalizeStatus } from "@/lib/types/task.types";

/**
 * The seven things an attendance row can be, derived from four fields.
 *
 * `present` is the only truth about arrival and it is a **boolean**, so the badge
 * is a reading of `present` together with `scheduledAt`, `taskStatus` and
 * `outcome`. The DTO carries no status of its own — this file is it.
 *
 * The state that justifies the whole set is **`overdue`**. The backend's own DTO
 * comment warns that an absent worker on a `Pending` task earlier in the day *"may
 * be a pending arrival, not a no-show"*, so a three-state grammar (present / late
 * / absent) had to choose between accusing that worker and saying nothing. Overdue
 * is the honest third answer: red, because somebody should look, but never the
 * words *No show* — those wait for `outcome = NoShow` or a task that finished
 * without them.
 *
 * Replaces the earlier `"present" | "late" | "absent"` triple. `components/workers/
 * matrix/matrix-cell.tsx` has its own independent `present` chip kind and does not
 * import this — deliberately, and it should stay that way.
 */
export type AttendanceKind =
  | "in"
  | "late"
  | "await"
  | "overdue"
  | "noshow"
  | "removed"
  | "cancelled";

/** Minutes after the scheduled start before a check-in counts as late. */
export const LATE_GRACE_MINUTES = 5;

/**
 * Sort severity: the rows somebody must act on first.
 *
 * Not a "goodness" order — `cancelled` is last not because it is good but because
 * it is *settled*. This is the order the phone sorts by, and the desktop's Status
 * column when clicked.
 */
export const KIND_ORDER: Record<AttendanceKind, number> = {
  overdue: 0,
  noshow: 1,
  late: 2,
  await: 3,
  in: 4,
  removed: 5,
  cancelled: 6,
};

const ms = (iso: string | null): number | null => {
  if (!iso) return null;
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? null : parsed;
};

/**
 * Which of the seven a row is, at the instant `nowMs`.
 *
 * ⚠ **`nowMs` is an instant, not a time of day.** The design's artboard computes
 * this from minutes-since-midnight because it draws one moment on one day; ported
 * literally, every date other than today would be nonsense. Comparing
 * `Date.parse(scheduledAt)` against a real instant generalises for free: a past
 * date resolves its absences to `overdue` or `noshow`, and a future date resolves
 * the whole day to `await` — *"a wall of these must read as calm, not as alarm."*
 *
 * `nowMs <= 0` means **the clock is not known yet** (`useClock`'s server
 * snapshot). The undecided absence then reads `await`, the calm answer, rather
 * than accusing every worker on the screen during one paint.
 *
 * Precedence is load-bearing and is the design's, in order:
 *
 * 1. `cancelled` and `removed` win over everything, **including a check-in** —
 *    somebody taken off a task may well have been there first. The kind changes;
 *    the check-in *time* is still rendered, because removal does not erase that
 *    they arrived.
 * 2. A check-in beats every absence reading. `late` is the grace comparison.
 * 3. `NoShow`, or a task already `Done`/`Review`, turns an absence into a fact.
 * 4. Only then does the clock decide `await` from `overdue`.
 *
 * ⚠ The two enums are read by **different** helpers, on purpose. `taskStatus` is
 * the day state and goes through `canonicalTaskStatus`, which knows that F-07 ·0
 * renamed `Active` → `CheckedIn` and `Review` → `InReview` on 2026-09-17. While
 * this file compared the raw lowercased word, an `InReview` day did not match the
 * `review` arm and fell through to the clock: a worker who never arrived on a
 * handed-in day read `overdue` instead of `noshow`. `outcome` is a separate enum
 * with its own words (`Removed`, `NoShow`, `Completed`) and keeps `normalizeStatus`.
 */
export function deriveKind(
  row: AttendanceRowDto,
  nowMs: number,
  graceMinutes: number = LATE_GRACE_MINUTES,
): AttendanceKind {
  const state = canonicalTaskStatus(row.taskStatus);
  const outcome = normalizeStatus(row.outcome);

  if (state === "cancelled" || outcome === "cancelled") return "cancelled";
  if (outcome === "removed") return "removed";

  const scheduled = ms(row.scheduledAt);
  const checkedIn = ms(row.checkinAt);

  if (row.present && checkedIn != null) {
    // An unparseable `scheduledAt` cannot prove lateness, so it reads `in`.
    if (scheduled == null) return "in";
    return checkedIn > scheduled + graceMinutes * 60_000 ? "late" : "in";
  }

  if (outcome === "noshow") return "noshow";
  // `rejected` (F-07 ·5) is a handed-in day too: absence is settled, not pending.
  if (state === "done" || state === "inReview" || state === "rejected") return "noshow";

  if (scheduled == null || nowMs <= 0) return "await";
  return nowMs < scheduled ? "await" : "overdue";
}

/** A row plus the kind derived for it. */
export interface AttendanceRow extends AttendanceRowDto {
  kind: AttendanceKind;
  /** `refusedCheckinCount > 0`. Orthogonal to `kind` — a refused worker can still be `in`. */
  refused: boolean;
}

export function deriveRows(
  rows: AttendanceRowDto[],
  nowMs: number,
  graceMinutes: number = LATE_GRACE_MINUTES,
): AttendanceRow[] {
  return rows.map((row) => ({
    ...row,
    kind: deriveKind(row, nowMs, graceMinutes),
    refused: row.refusedCheckinCount > 0,
  }));
}

/**
 * How late, in whole minutes, or `null` when the question does not apply.
 *
 * Positive for a late arrival, negative for an early one. For an absence it is the
 * age of the miss — how long ago the shift should have started — which is only a
 * meaningful number **while the day is running**, so the caller passes
 * `isToday: false` for any other date and gets `null`. `+2847m` on last Tuesday is
 * noise, not information.
 */
export function lateBy(
  row: AttendanceRow,
  nowMs: number,
  isToday: boolean,
): number | null {
  const scheduled = ms(row.scheduledAt);
  if (scheduled == null) return null;
  const checkedIn = ms(row.checkinAt);
  if (checkedIn != null) return Math.round((checkedIn - scheduled) / 60_000);
  if (row.kind !== "overdue" || !isToday || nowMs <= 0) return null;
  return Math.round((nowMs - scheduled) / 60_000);
}

/** The five tabs. `all` and `missing` are groups; `refused` is a different axis entirely. */
export type AttendanceTab = "all" | "in" | "late" | "missing" | "refused";

/** The three kinds that mean *nobody has arrived*, which the strip and the tab count together. */
const MISSING: AttendanceKind[] = ["await", "overdue", "noshow"];

export function matchesTab(row: AttendanceRow, tab: AttendanceTab): boolean {
  switch (tab) {
    case "all":
      return true;
    case "in":
      return row.kind === "in";
    case "late":
      return row.kind === "late";
    case "missing":
      return MISSING.includes(row.kind);
    case "refused":
      return row.refused;
  }
}

export interface AttendanceCounts extends Record<AttendanceTab, number> {
  /** `in + late` — the numerator of the strip's "8 / 12". */
  arrived: number;
}

/**
 * The counts behind the strip and the tab badges.
 *
 * ⚠ **`in + late + missing` does not equal `all`, and must not be made to.**
 * `removed` and `cancelled` rows are in the day but in none of those three, and
 * `refused` overlaps all of them. That is why this is not a percentage: the strip
 * prints *"8 / 12 checked in"* and the design's own limit says why — there is no
 * stored rate, no target and no contracted-hours field anywhere in this response,
 * so nothing here may imply one.
 */
export function countRows(rows: AttendanceRow[]): AttendanceCounts {
  const counts: AttendanceCounts = {
    all: rows.length,
    in: 0,
    late: 0,
    missing: 0,
    refused: 0,
    arrived: 0,
  };
  for (const row of rows) {
    if (row.kind === "in") counts.in++;
    else if (row.kind === "late") counts.late++;
    if (MISSING.includes(row.kind)) counts.missing++;
    if (row.refused) counts.refused++;
  }
  counts.arrived = counts.in + counts.late;
  return counts;
}

/**
 * The three refusal reasons, lower-cased for a message key.
 *
 * The DTO documents TitleCase, but the field is a `string` on the wire and the
 * union is our assertion about it — so an unrecognised value returns `null` and
 * the chip drops the reason clause rather than rendering `"3 refused · "` with a
 * dangling separator.
 */
export type RefusalReasonKey = "outsideGeofence" | "gpsRequired" | "targetMissing";

export function refusalReasonKey(reason: string | null): RefusalReasonKey | null {
  switch (normalizeStatus(reason)) {
    case "outsidegeofence":
      return "outsideGeofence";
    case "gpsrequired":
      return "gpsRequired";
    case "geofencetargetmissing":
      return "targetMissing";
    default:
      return null;
  }
}
