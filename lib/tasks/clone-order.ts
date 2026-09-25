import { getApiErrorCode } from "@/lib/http/api-error";
import { describeApiError, isPermissionDenied } from "@/lib/onboarding/errors";
import { startsAtOrBefore, toWireTime } from "@/lib/tasks/order";
import type { CloneTaskGroupRequest, TaskGroupDto } from "@/lib/types/task.types";

/**
 * "Copy as new order" — the admin clone door (F-07 ·10,
 * `task-lifecycle.md` §0i; `TaskService.BuildCloneRequestAsync`).
 *
 * ⚠ **The admin cannot edit the copy afterwards** — the panel has no admin edit
 * route — so everything the server would refuse, or silently decide, is settled
 * here before the request.
 */

/** The fields of the source booking the clone rules read. */
export type CloneSource = Pick<
  TaskGroupDto,
  | "ownerId"
  | "title"
  | "instructions"
  | "ownerProvidesTools"
  | "defaultStartTime"
  | "defaultDeadline"
  | "cityId"
>;

/**
 * The dialog's state. Strings because they come from inputs, like `OrderDraft`.
 * The gap-fill fields (`title`, `instructions`, `ownerProvidesTools`) are only
 * read when the source's own value is missing; the walk-in fields only on a
 * walk-in source.
 */
export interface CloneDraft {
  /** `YYYY-MM-DD` from the month grid. */
  dates: string[];
  /** `HH:mm` — pre-filled with the source's, so an untouched one is omitted. */
  startTime: string;
  /**
   * Only meaningful when the source has **no** deadline. When it has one this is
   * ignored: `null`/omitted means "copy" on this route, so there is no way to
   * send "no deadline" and an "off" switch would be a lie.
   */
  hasDeadline: boolean;
  /** `HH:mm` — pre-filled with the source's deadline, if any. */
  deadline: string;
  /** Gap-fill: read only when the source's title is null/blank. */
  title: string;
  /** Gap-fill: read only when the source's instructions are null/blank. */
  instructions: string;
  /** Gap-fill: read only when the source's answer is `null`. `null` = not answered. */
  ownerProvidesTools: boolean | null;
  /** Walk-in only: scopes the city list, never sent (see `WalkInOrderDraft`). */
  countryId: string;
  /** Walk-in only. `""` = keep the source's city. */
  cityId: string;
  /** Walk-in only. Replace the order's address — then the map point is required. */
  moveAddress: boolean;
  /**
   * Walk-in only, read only when `moveAddress`. One nullable pair, never two
   * fields — the route refuses half a pair (`walkin_location_required`).
   */
  location: { lat: number; long: number } | null;
}

/** Keys under `tasks.clone.errors` — the client refusals and the worded server ones. */
export type CloneErrorKey =
  | "datesRequired"
  | "startTimeRequired"
  | "startInPast"
  | "deadlineRequired"
  | "deadlineNotAfterStart"
  | "titleRequired"
  | "instructionsRequired"
  | "toolsRequired"
  | "cityRequired"
  | "locationRequired"
  // Server only — see `CLONE_SERVER_ERRORS`.
  | "fieldAlreadySet"
  | "sourceGone"
  | "propertyGone"
  | "cityGone";

export type CloneResult =
  | { ok: true; body: CloneTaskGroupRequest }
  | { ok: false; error: CloneErrorKey };

/** `"08:00:00"` / `"08:00"` → `"08:00:00"`: the one shape both sides compare in. */
function wire(time: string): string {
  return toWireTime(time.slice(0, 8));
}

/** `null`, `""` and whitespace are all "missing" — the server's `IsNullOrWhiteSpace`. */
function isBlank(value: string | null | undefined): boolean {
  return !(value ?? "").trim();
}

/** The dialog's opening state: the source's own times, nothing else chosen. */
export function cloneDraftFrom(source: CloneSource): CloneDraft {
  return {
    dates: [],
    startTime: source.defaultStartTime.slice(0, 5),
    hasDeadline: source.defaultDeadline != null,
    deadline: source.defaultDeadline ? source.defaultDeadline.slice(0, 5) : "",
    title: "",
    instructions: "",
    ownerProvidesTools: null,
    countryId: "",
    cityId: "",
    moveAddress: false,
    location: null,
  };
}

/**
 * Is `source` a walk-in order? `true` / `false`, or `null` while that cannot be
 * told yet — and the caller must treat `null` as **hide the door**, not as
 * "ordinary": a walk-in order read as ordinary loses its city and address
 * fields, and one filed before 2026-09-23 then cannot be copied at all.
 *
 * - A `cityId` settles it at once: only walk-in orders carry one (§0h).
 * - Otherwise the owner does. `walkInOwnerId` is `useWalkInOwnerId()`'s answer —
 *   the same convention the owner detail page uses — passed as `undefined` while
 *   that lookup is pending or failed, and `null` when it found no walk-in account.
 *
 * ⚠ `cityId` alone is not enough: it is `null` on exactly the walk-in orders that
 * most need the city field — the ones filed before it existed.
 */
export function isWalkInSource(
  source: Pick<CloneSource, "ownerId" | "cityId">,
  walkInOwnerId: string | null | undefined,
): boolean | null {
  if (source.cityId) return true;
  if (walkInOwnerId === undefined) return null;
  return walkInOwnerId !== null && source.ownerId === walkInOwnerId;
}

/**
 * The copy keeps the source's deadline untouched, and the (possibly moved) start
 * has passed it — so the server **drops** it and the new days get the standard
 * 8 hours (§0i·3). The dialog says so in a line under the deadline.
 *
 * Not refused, on purpose: for a night-job source (22:00–06:00) the 8-hour
 * fallback is the only way to a day that works — its copied deadline is before
 * its start by construction, and forcing the admin to type a new one would push
 * them towards 23:59. A deadline the admin *changed* is never dropped: it is
 * sent and judged (`deadlineNotAfterStart`).
 */
export function copiedDeadlineFallsBack(draft: CloneDraft, source: CloneSource): boolean {
  if (!source.defaultDeadline || !draft.startTime || !draft.deadline) return false;
  const sourceDeadline = wire(source.defaultDeadline);
  return wire(draft.deadline) === sourceDeadline && sourceDeadline <= wire(draft.startTime);
}

/**
 * Dialog state → the clone body, or the first thing wrong with it, in the order
 * the fields appear.
 *
 * **Every optional field is omitted unless it changes something**, because
 * omitted means "copy" on this route — an unchanged time is left out, and a
 * gap-fill field the source already has is never sent (that is
 * `400 clone_field_already_set`, not a no-op).
 *
 * - **Past start** — judged with the effective start: the typed one, or the
 *   source's when left alone. In UTC, like `buildOrder` and the server.
 * - **Deadline** — see `copiedDeadlineFallsBack` for the untouched one. A changed
 *   one at or before the start is refused, as `buildOrder` does (§0i·1 says not
 *   to offer night jobs), although the server only refuses *equal*.
 * - **Gap-fill** — required exactly when the source lacks the value, so the
 *   client refuses before `clone_*_required` does.
 * - **Walk-in** — `isWalkIn` from `isWalkInSource`. A city is required only when
 *   the source has none; an address change requires the map point. Neither is
 *   ever sent for an ordinary source (`group_city_not_allowed`,
 *   `group_location_not_allowed`).
 */
export function buildCloneOrder(
  draft: CloneDraft,
  source: CloneSource,
  isWalkIn: boolean,
  now: Date = new Date(),
): CloneResult {
  // Distinct, because the server counts distinct dates to pick the kind.
  const dates = [...new Set(draft.dates)];
  if (dates.length === 0) return { ok: false, error: "datesRequired" };

  if (!draft.startTime) return { ok: false, error: "startTimeRequired" };
  const start = wire(draft.startTime);
  if (dates.some((d) => startsAtOrBefore(d, start, now))) {
    return { ok: false, error: "startInPast" };
  }

  const sourceDeadline = source.defaultDeadline ? wire(source.defaultDeadline) : null;
  // A source deadline cannot be removed, only moved — so it is "on" regardless.
  const deadlineOn = draft.hasDeadline || sourceDeadline !== null;
  if (deadlineOn && !draft.deadline) return { ok: false, error: "deadlineRequired" };
  const deadline = deadlineOn ? wire(draft.deadline) : null;
  const deadlineChanged = deadline !== null && deadline !== sourceDeadline;
  // Both are zero-padded `HH:mm:ss`, so string order is time order.
  if (deadlineChanged && deadline <= start) {
    return { ok: false, error: "deadlineNotAfterStart" };
  }

  const body: CloneTaskGroupRequest = { dates };
  if (start !== wire(source.defaultStartTime)) body.defaultStartTime = start;
  if (deadlineChanged) body.defaultDeadline = deadline;

  if (isBlank(source.title)) {
    const title = draft.title.trim();
    if (!title) return { ok: false, error: "titleRequired" };
    body.title = title;
  }

  if (isBlank(source.instructions)) {
    const instructions = draft.instructions.trim();
    if (!instructions) return { ok: false, error: "instructionsRequired" };
    body.instructions = instructions;
  }

  // `== null` on purpose: an absent field (a stale API) is as unanswered as `null`.
  if (source.ownerProvidesTools == null) {
    if (draft.ownerProvidesTools === null) return { ok: false, error: "toolsRequired" };
    body.ownerProvidesTools = draft.ownerProvidesTools;
  }

  if (isWalkIn) {
    const needsCity = !source.cityId;
    if (needsCity && !draft.cityId) return { ok: false, error: "cityRequired" };
    // A city is only ever asked for in two places — the missing one, and the
    // address change — so a held one outside those is dropped, like the point.
    if (
      (needsCity || draft.moveAddress) &&
      draft.cityId &&
      draft.cityId !== source.cityId
    ) {
      body.cityId = draft.cityId;
    }

    if (draft.moveAddress) {
      if (!draft.location) return { ok: false, error: "locationRequired" };
      // Range is not re-checked: the map picker cannot produce a point outside
      // it (see `buildWalkInOrder`). Out of range is a problem-details 400.
      body.lat = draft.location.lat;
      body.long = draft.location.long;
    }
  }

  return { ok: true, body };
}

/**
 * Server refusals the dialog words itself, under `tasks.clone.errors`. Most are
 * refused by `buildCloneOrder` first and are here for the races — a source
 * edited while the dialog was open (`clone_field_already_set`), a start time
 * passing, a city deactivated.
 *
 * ⚠ The two walk-in codes are **also in the shared catalog**, whose wording
 * ("file it from the Walk-in page") is wrong in a dialog that has the field —
 * which is why this map is consulted first.
 *
 * `walkin_location_required` is the one refusal the client cannot predict:
 * `TaskGroupDto` does not return an order's coordinates, so a walk-in order that
 * never had any is invisible until the server says so. The dialog answers it by
 * opening the address change.
 */
const CLONE_SERVER_ERRORS: Record<string, CloneErrorKey> = {
  clone_title_required: "titleRequired",
  clone_instructions_required: "instructionsRequired",
  clone_tools_answer_required: "toolsRequired",
  clone_field_already_set: "fieldAlreadySet",
  task_group_not_found: "sourceGone",
  dates_required: "datesRequired",
  task_date_in_past: "startInPast",
  deadline_not_after_start: "deadlineNotAfterStart",
  walkin_city_required: "cityRequired",
  walkin_location_required: "locationRequired",
  city_not_found: "cityGone",
  city_inactive: "cityGone",
  property_not_found: "propertyGone",
};

export type CloneErrorKind =
  /** `tasks.clone.errors.<key>` */
  | { kind: "clone"; key: CloneErrorKey }
  /** `onboarding.apiErrors.<labelKey>` — the contract gate and the rest of the create catalogue. */
  | { kind: "catalog"; labelKey: string }
  /** Problem-details (`dates` missing, `lat`/`long` out of range): the server's own words. */
  | { kind: "validation"; message: string }
  /** An empty-bodied 403 — not SUPER_ADMIN. */
  | { kind: "permission" }
  | { kind: "unknown" };

/**
 * Which namespace a refused clone is worded from. Keyed on the `error` string,
 * never the status — §0i·5: "the clone's own checks run first … switch on the
 * `error` string". The ladder is the repo's: `{error}` code (local map, then the
 * shared catalog) → problem-details → empty 403 → generic.
 */
export function classifyCloneError(error: unknown): CloneErrorKind {
  const code = getApiErrorCode(error);
  const local = code ? CLONE_SERVER_ERRORS[code] : undefined;
  if (local) return { kind: "clone", key: local };

  const info = describeApiError(error);
  if (info?.code === "validation" && info.detail) {
    return { kind: "validation", message: info.detail };
  }
  if (info && info.labelKey !== "unknown") return { kind: "catalog", labelKey: info.labelKey };

  if (isPermissionDenied(error)) return { kind: "permission" };
  return { kind: "unknown" };
}
