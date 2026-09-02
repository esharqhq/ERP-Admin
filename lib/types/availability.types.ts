/**
 * A worker's declared schedule.
 *
 * Guide: `../Backend/docs/handoff/f-04b-worker-availability.md`. The admin routes
 * are `api/admin/workers/{workerId}/availability` and mirror the worker's own six
 * calls exactly — `worker:read` to read, `worker:profile:update_any` to write, and
 * **every write needs a `reason`** (missing or blank ⇒ `400 reason_required`).
 *
 * ⚠ **This describes intent, not permission.** Nothing in the system checks a
 * schedule at any door: a worker whose schedule says Tuesdays off can be assigned
 * to a Tuesday task and nothing warns anyone. Re-verified by the backend on
 * 2026-08-27 when `?availableOn=` shipped — a filter now *reads* this data, which
 * is easy to mistake for the gate arriving. It did not.
 */

/** `Base` — inherited. `Worker` / `Admin` — hand-set by that party. */
export type AvailabilitySource = "Base" | "Worker" | "Admin";

export interface AvailabilityBaseDto {
  /** `"HH:mm:ss"`. */
  startTime: string;
  endTime: string;
}

/** One of the seven weekday rows. Always all seven, Monday-first, once a base exists. */
export interface AvailabilityDayDto {
  /** `"Monday"` … `"Sunday"`. */
  dayOfWeek: string;
  isAvailable: boolean;
  /** `null` on a day that is off. */
  startTime: string | null;
  endTime: string | null;
  source: AvailabilitySource;
}

/**
 * A dated override. It beats the weekday row **in either direction** — it can
 * close a normally-open day or add hours to a normally-closed one.
 *
 * ⚠ **No `source` field.** An exception carries `setByAdmin` instead, so it
 * resolves to `Admin` or `Worker` and can never be `Base`. See
 * `lib/workers/availability.ts`.
 */
export interface AvailabilityExceptionDto {
  /** `YYYY-MM-DD`. */
  date: string;
  isAvailable: boolean;
  startTime: string | null;
  endTime: string | null;
  setByAdmin: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface AvailabilityDto {
  base: AvailabilityBaseDto | null;
  days: AvailabilityDayDto[];
  /**
   * Bounded by the `from`/`to` query — **exceptions only**; the base and the seven
   * days always come back in full. Default window is today … +90 days, so a read
   * of a past week must pass explicit bounds or it gets none.
   */
  exceptions: AvailabilityExceptionDto[];
  /**
   * `false` means **no base row at all**, with `days` empty.
   *
   * ⚠ Absence is *unknown*, not *unavailable* — the same rule `?availableOn=`
   * follows, and it must not be drawn as "closed". `register-merge` made
   * registration write the base and all seven days, so this should be unreachable
   * for anyone who registered since; it is modelled because the guide still
   * documents it and old rows may predate that.
   */
  isSet: boolean;
}
