import { normalizeStatus } from "@/lib/types/task.types";

/**
 * Which door a check-in came through — F-07 ·2 (2026-09-22), `checkinDoor` on
 * both `TaskWorkerDto` and `AttendanceRowDto`. No guide section: read from
 * `GermanyERP.Domain/Enums/TaskEnums.cs` (`enum CheckinDoor`) and the two DTOs.
 *
 * - `WorkerTapped` — `POST /api/tasks/{taskId}/check-in`, the worker tapped in
 *   the app. The coordinates are the worker's own phone.
 * - `WorkerScannedDisplay` — `POST /api/tasks/check-in`, the worker scanned the
 *   on-site display QR. Coordinates are still the worker's phone.
 * - `OwnerScannedWorker` — `POST /api/tasks/{taskId}/check-in/scan`, on-site
 *   staff scanned the worker's code. ⚠ **`checkinLat`/`checkinLng` are then the
 *   SCANNER's phone, not the worker's** — the reason the field exists at all.
 *
 * ⚠ **`null` has two causes that cannot be told apart**: the worker never checked
 * in, or the row predates 2026-09-22 (a refused check-in also leaves it null).
 * So `null` renders *nothing* — never "not recorded", never "did not check in".
 *
 * ⚠ The wire is **PascalCase** (`JsonStringEnumConverter`). The backend's
 * `index/` spells these `WORKER_TAPPED` etc.; that is not what arrives, and is
 * deliberately not matched here.
 */
export type CheckinDoorKind = "tapped" | "display" | "scanned";

/**
 * The door, lower-cased for a message key — or `null`.
 *
 * Same shape as `refusalReasonKey`: the field is a plain `string` on the wire and
 * the three names are our assertion about it, so a fourth door the backend adds
 * later returns `null` and the UI shows nothing extra rather than borrowing one
 * of the three labels or throwing.
 */
export function checkinDoorKind(value: string | null | undefined): CheckinDoorKind | null {
  switch (normalizeStatus(value)) {
    case "workertapped":
      return "tapped";
    case "workerscanneddisplay":
      return "display";
    case "ownerscannedworker":
      return "scanned";
    default:
      return null;
  }
}

/**
 * `true` only when the row's check-in coordinates belong to whoever held the
 * scanning phone. An unknown door is `false` — we only caveat what we can prove.
 */
export function coordsAreScanners(value: string | null | undefined): boolean {
  return checkinDoorKind(value) === "scanned";
}
