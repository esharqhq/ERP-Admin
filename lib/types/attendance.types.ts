/**
 * Admin attendance report (backend ask #2: GET /api/admin/attendance?date=).
 * Wire shape verified against the live API 2026-06-11 — one row per assigned
 * worker for tasks scheduled that day (absent workers included).
 */
export interface AttendanceRowDto {
  taskId: string;
  taskGroupId: string;
  /** May be null. */
  taskGroupTitle: string | null;
  propertyId: string;
  propertyName: string;
  workerId: string;
  workerName: string;
  /** YYYY-MM-DD. */
  scheduledDate: string;
  /** ISO instant. */
  scheduledAt: string;
  taskStatus: string;
  /** `checkinAt != null`. No-shows surface as `present: false` with null check-in fields. */
  present: boolean;
  checkinAt: string | null;
  checkinLat: number | null;
  checkinLng: number | null;
  checkoutAt: string | null;
  submittedAt: string | null;
  outcome: string;

  /*
    F-06c (2026-08-26) — four fields describing the **latest refused check-in**.
    No new permission and no new route; they simply appeared on this row.
  */

  /**
   * `0` when there are none. ⚠ **Counts attempt *windows*, not requests** — it is
   * deduplicated to one per (task, worker) per 15 minutes, so a worker fighting
   * poor signal who retries ten times in a minute produces `1`. Word it as
   * *"2 refused attempts"*, never *"2 failed requests"*.
   */
  refusedCheckinCount: number;
  /** TitleCase on the wire. `null` when the count is `0`. */
  lastRefusalReason:
    | "GpsRequired"
    | "OutsideGeofence"
    | "GeofenceTargetMissing"
    | null;
  lastRefusalAt: string | null;
  /**
   * Metres from the target on that latest refusal.
   *
   * ⚠ **`null` unless the latest reason was `OutsideGeofence`** — the other two
   * refuse before any distance can be computed. A refused chip must therefore
   * render without a number as a normal case, not as missing data.
   */
  lastRefusalDistanceMeters: number | null;
}
