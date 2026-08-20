import type { CreateTaskGroupRequest } from "@/lib/types/task.types";

/** Every field is a string (or a string list) because every field comes straight from an input. */
export interface WalkInOrderDraft {
  /** The job itself — "Apartment clean". Composed with `customer` into the wire `title`. */
  title: string;
  /**
   * Who the order came from. Composed into `title` rather than sent separately:
   * `internalNote` is the only "not shown to workers" field and it appears in no
   * response DTO, so anything written there can never be read back. `title` is
   * what the orders list renders, which is the whole point of collecting this.
   */
  customer: string;
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

/** Keys under the `walkIn.errors` i18n namespace. */
export type WalkInOrderErrorKey =
  | "titleRequired"
  | "datesRequired"
  | "startTimeRequired"
  | "deadlineRequired"
  | "workerLimitInvalid";

export type WalkInOrderResult =
  | { ok: true; body: CreateTaskGroupRequest }
  | { ok: false; error: WalkInOrderErrorKey };

/** `<input type="time">` yields `HH:mm`; the API rejects anything shorter than `HH:mm:ss`. */
function toWireTime(value: string): string {
  return value.length === 5 ? `${value}:00` : value;
}

/**
 * Form state → request body, or the first thing wrong with it.
 *
 * The five refusals exist because those fields are `[Required]` server-side and a
 * missing one returns ASP.NET **problem-details** — `{type,title,status,errors}`
 * rather than this API's `{error}`. Rendering two error envelopes costs more than
 * refusing here, which is the same call `message-owner-dialog` makes.
 *
 * Deliberately **not** refused: a `deadline` earlier than `startTime`. It reads as
 * nonsense, but the server's behaviour is unverified and may mean "next day" —
 * inventing a refusal the API does not have would be the worse error.
 */
export function buildWalkInOrder(
  draft: WalkInOrderDraft,
  propertyId: string,
): WalkInOrderResult {
  const job = draft.title.trim();
  if (!job) return { ok: false, error: "titleRequired" };
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

  const customer = draft.customer.trim();
  const instructions = draft.instructions.trim();

  return {
    ok: true,
    body: {
      propertyId,
      title: customer ? `${job} — ${customer}` : job,
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
