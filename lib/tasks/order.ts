import type { CreateTaskGroupRequest } from "@/lib/types/task.types";

/**
 * One admin-filed order, before it is a request body.
 *
 * Shared by the two surfaces that file one: the walk-in page, which composes a
 * caller's name into the title (`walk-in-order.ts` wraps this), and the owner
 * detail's Create-order dialog, where the owner is already the customer and the
 * title is the job alone.
 *
 * Every field is a string (or a string list) because every field comes straight
 * from an input.
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
  instructions: string;
}

/**
 * Keys of the five client-side refusals. Namespace-free on purpose: the walk-in
 * form resolves them under `walkIn.errors` and the owner dialog under
 * `owners.order.errors`, with the same key names in both.
 */
export type OrderErrorKey =
  | "titleRequired"
  | "datesRequired"
  | "startTimeRequired"
  | "deadlineRequired"
  | "workerLimitInvalid";

export type OrderResult =
  | { ok: true; body: CreateTaskGroupRequest }
  | { ok: false; error: OrderErrorKey };

/** `<input type="time">` yields `HH:mm`; the API rejects anything shorter than `HH:mm:ss`. */
export function toWireTime(value: string): string {
  return value.length === 5 ? `${value}:00` : value;
}

/**
 * Form state → request body, or the first thing wrong with it.
 *
 * The five refusals exist because those fields are `[Required]` server-side and a
 * missing one returns ASP.NET **problem-details** — `{type,title,status,errors}`
 * rather than this API's `{error}`. Rendering two error envelopes costs more than
 * refusing here, which is the same call `message-user-dialog` makes.
 *
 * Deliberately **not** refused: a `deadline` earlier than `startTime`. It reads as
 * nonsense, but the server's behaviour is unverified and may mean "next day" —
 * inventing a refusal the API does not have would be the worse error.
 *
 * `propertyId` is a parameter rather than a field, and it is not validated here:
 * both callers resolve it before they render (the walk-in page from its one
 * property, the owner dialog from a select seeded with the owner's list), so an
 * empty one is a caller bug, not a user error to word.
 */
export function buildOrder(
  draft: OrderDraft,
  propertyId: string,
): OrderResult {
  const title = draft.title.trim();
  if (!title) return { ok: false, error: "titleRequired" };
  if (draft.dates.length === 0) return { ok: false, error: "datesRequired" };
  if (!draft.startTime) return { ok: false, error: "startTimeRequired" };
  if (draft.hasDeadline && !draft.deadline) {
    return { ok: false, error: "deadlineRequired" };
  }

  // `Number("")` is 0 and `Number("1.5")` is 1.5 — both have to fail, so the
  // integer check is explicit rather than a `parseInt` that would round.
  const workerLimit = Number(draft.workerLimit);
  if (!Number.isInteger(workerLimit) || workerLimit < 1) {
    return { ok: false, error: "workerLimitInvalid" };
  }

  const instructions = draft.instructions.trim();

  return {
    ok: true,
    body: {
      propertyId,
      title,
      defaultStartTime: toWireTime(draft.startTime),
      defaultWorkerLimit: workerLimit,
      dates: draft.dates,
      // Spread rather than an explicit null: an omitted key and an explicit null
      // are the same to the server, and omitting keeps the body to what the form
      // actually collected.
      ...(draft.hasDeadline ? { defaultDeadline: toWireTime(draft.deadline) } : {}),
      ...(instructions ? { instructions } : {}),
    },
  };
}
