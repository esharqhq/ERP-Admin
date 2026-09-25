import type {
  CreateSingleTaskRequest,
  CreateTaskBaseRequest,
  CreateTaskGroupRequest,
} from "@/lib/types/task.types";

/**
 * One admin-filed order, before it is a request body.
 *
 * Shared by the two surfaces that file one: the walk-in page, which composes a
 * caller's name into the title (`walk-in-order.ts` wraps this), and the owner
 * detail's Create-order dialog, where the owner is already the customer and the
 * title is the job alone.
 *
 * Every field is a string (or a string list) because every field comes straight
 * from an input — except the tools answer, which is a three-state choice.
 */
export interface OrderDraft {
  /** What has to be done. Goes on the wire as `title`, trimmed. */
  title: string;
  /** `YYYY-MM-DD`, from the month grid. One task is generated per date. */
  dates: string[];
  /** `HH:mm` from `<input type="time">`, or `HH:mm:ss`. */
  startTime: string;
  hasDeadline: boolean;
  /** `HH:mm`; only read when `hasDeadline`. An end-of-day cutoff — a time, not a date. */
  deadline: string;
  workerLimit: string;
  /** The description. Required since F-07 ·7. */
  instructions: string;
  /**
   * Does the owner provide the cleaning tools? `null` = not answered yet, which
   * is refused: the form must never pre-select an answer for the admin.
   */
  ownerProvidesTools: boolean | null;
  /** The add-on / special-situation note. Optional. */
  addOnNote: string;
}

/**
 * Keys of the client-side refusals. Namespace-free on purpose: the walk-in form
 * resolves them under `walkIn.errors` and the owner dialog under
 * `owners.order.errors`, with the same key names in both.
 */
export type OrderErrorKey =
  | "titleRequired"
  | "datesRequired"
  | "startTimeRequired"
  | "startInPast"
  | "deadlineRequired"
  | "deadlineNotAfterStart"
  | "workerLimitInvalid"
  | "instructionsRequired"
  | "toolsRequired"
  | "addOnNoteTooLong";

/**
 * Which admin create door the order goes through (F-07 ·12,
 * `task-lifecycle.md` §0f). The form does not ask: the number of distinct dates
 * decides, exactly as the server's own rule does.
 */
export type OrderRequest =
  | { kind: "single"; body: CreateSingleTaskRequest }
  | { kind: "booking"; body: CreateTaskGroupRequest };

export type OrderResult =
  | { ok: true; request: OrderRequest }
  | { ok: false; error: OrderErrorKey };

/** Server-side cap on `addOnNote`, counted before trimming (`task-lifecycle.md` §0g·1). */
export const ADD_ON_NOTE_MAX = 2000;

/** `<input type="time">` yields `HH:mm`; the API rejects anything shorter than `HH:mm:ss`. */
export function toWireTime(value: string): string {
  return value.length === 5 ? `${value}:00` : value;
}

/**
 * `date + time` as the server reads it — **UTC** (`task-lifecycle.md` §0f·2).
 * Mirrored exactly rather than read as local time: refusing a start the server
 * accepts would invent a rule the API does not have. Exported for
 * `buildCloneOrder`, whose route judges the start the same way.
 */
export function startsAtOrBefore(date: string, wireTime: string, now: Date): boolean {
  return new Date(`${date}T${wireTime}Z`).getTime() <= now.getTime();
}

/**
 * Form state → the request and its route, or the first thing wrong with it.
 *
 * Every refusal here mirrors one the server makes, so the admin is told in
 * words before the request rather than met with a problem-details envelope —
 * `{type,title,status,errors}` instead of this API's `{error}` — after it. They
 * are checked in the order the fields appear in the form.
 *
 * ⚠ **A deadline at or before the start is refused**, although the server only
 * refuses *equal* (`deadline_not_after_start`, F-07 ·10). An earlier deadline is
 * a night job: it is accepted, stored on the start's own date, and does not work
 * — the work window is over before it begins. `task-lifecycle.md` §0i·1 says not
 * to offer night jobs, so this is the backend's instruction, not an invented rule.
 *
 * `propertyId` is a parameter rather than a field, and it is not validated here:
 * both callers resolve it before they render (the walk-in page from its one
 * property, the owner dialog from a select seeded with the owner's list), so an
 * empty one is a caller bug, not a user error to word. `now` is a parameter so
 * the past-start rule is testable.
 */
export function buildOrder(
  draft: OrderDraft,
  propertyId: string,
  now: Date = new Date(),
): OrderResult {
  const title = draft.title.trim();
  if (!title) return { ok: false, error: "titleRequired" };

  // Distinct, because the server counts distinct dates: the same day twice is
  // one date, and the booking door refuses it.
  const dates = [...new Set(draft.dates)];
  if (dates.length === 0) return { ok: false, error: "datesRequired" };

  if (!draft.startTime) return { ok: false, error: "startTimeRequired" };
  const startTime = toWireTime(draft.startTime);
  if (dates.some((d) => startsAtOrBefore(d, startTime, now))) {
    return { ok: false, error: "startInPast" };
  }

  if (draft.hasDeadline && !draft.deadline) {
    return { ok: false, error: "deadlineRequired" };
  }
  const deadline = draft.hasDeadline ? toWireTime(draft.deadline) : null;
  // Both are zero-padded `HH:mm:ss`, so string order is time order.
  if (deadline !== null && deadline <= startTime) {
    return { ok: false, error: "deadlineNotAfterStart" };
  }

  // `Number("")` is 0 and `Number("1.5")` is 1.5 — both have to fail, so the
  // integer check is explicit rather than a `parseInt` that would round.
  const workerLimit = Number(draft.workerLimit);
  if (!Number.isInteger(workerLimit) || workerLimit < 1) {
    return { ok: false, error: "workerLimitInvalid" };
  }

  const instructions = draft.instructions.trim();
  if (!instructions) return { ok: false, error: "instructionsRequired" };

  if (draft.ownerProvidesTools === null) {
    return { ok: false, error: "toolsRequired" };
  }

  if (draft.addOnNote.length > ADD_ON_NOTE_MAX) {
    return { ok: false, error: "addOnNoteTooLong" };
  }
  const addOnNote = draft.addOnNote.trim();

  const base: CreateTaskBaseRequest = {
    propertyId,
    title,
    defaultStartTime: startTime,
    defaultWorkerLimit: workerLimit,
    instructions,
    ownerProvidesTools: draft.ownerProvidesTools,
    // Spread rather than an explicit null: an omitted key and an explicit null
    // are the same to the server, and omitting keeps the body to what the form
    // actually collected.
    ...(deadline !== null ? { defaultDeadline: deadline } : {}),
    ...(addOnNote ? { addOnNote } : {}),
  };

  return {
    ok: true,
    request:
      dates.length === 1
        ? { kind: "single", body: { ...base, date: dates[0] } }
        : { kind: "booking", body: { ...base, dates } },
  };
}
