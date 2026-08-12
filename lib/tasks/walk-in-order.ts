import type { CreateTaskGroupRequest } from "@/lib/types/task.types";

/** Every field is a string because every field comes straight from an input. */
export interface WalkInOrderDraft {
  title: string;
  /** `YYYY-MM-DD`, from the month grid. */
  date: string;
  /** `HH:mm` from `<input type="time">`, or `HH:mm:ss`. */
  startTime: string;
  workerLimit: string;
  instructions: string;
}

/** Keys under the `walkIn.errors` i18n namespace. */
export type WalkInOrderErrorKey =
  | "titleRequired"
  | "dateRequired"
  | "startTimeRequired"
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
 * The four refusals exist because those fields are `[Required]` server-side and
 * a missing one returns ASP.NET **problem-details** — `{type,title,status,errors}`
 * rather than this API's `{error}`. Rendering two error envelopes costs more than
 * refusing here, which is the same call `message-owner-dialog` makes.
 */
export function buildWalkInOrder(
  draft: WalkInOrderDraft,
  propertyId: string,
): WalkInOrderResult {
  const title = draft.title.trim();
  if (!title) return { ok: false, error: "titleRequired" };
  if (!draft.date) return { ok: false, error: "dateRequired" };
  if (!draft.startTime) return { ok: false, error: "startTimeRequired" };

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
      dates: [draft.date],
      // Spread rather than `instructions: instructions || null`: an omitted key
      // and an explicit null are the same to the server, and omitting keeps the
      // body to what the form actually collected.
      ...(instructions ? { instructions } : {}),
    },
  };
}
