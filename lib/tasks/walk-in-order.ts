import { buildOrder, type OrderDraft, type OrderErrorKey, type OrderResult } from "@/lib/tasks/order";
import type { CreateTaskGroupRequest } from "@/lib/types/task.types";

/** The shared draft plus the two things only the walk-in surface collects. */
export interface WalkInOrderDraft extends OrderDraft {
  /**
   * Who the order came from. Composed into `title` rather than sent separately:
   * `internalNote` is the only "not shown to workers" field and it appears in no
   * response DTO, so anything written there can never be read back. `title` is
   * what the orders list renders, which is the whole point of collecting this.
   */
  customer: string;
  /**
   * Where the work happens — the order's own address, which becomes the geofence
   * target for every task it generates (F-06c).
   *
   * ⚠ **One nullable pair, deliberately not two fields.** The route refuses `lat`
   * without `long` as `walkin_location_required`, so a half-filled pair must be
   * unrepresentable rather than validated. Splitting this into `lat: string` and
   * `long: string` re-introduces that failure.
   *
   * `null` means the admin has not pointed at the map yet.
   */
  location: { lat: number; long: number } | null;
}

/**
 * Keys under the `walkIn.errors` i18n namespace.
 *
 * `locationRequired` is walk-in-only: the shared builder has no location field
 * because the owner dialog files against an ordinary property, where sending one
 * is refused with `400 group_location_not_allowed`.
 */
export type WalkInOrderErrorKey = OrderErrorKey | "locationRequired";

export type WalkInOrderResult =
  | { ok: true; body: CreateTaskGroupRequest }
  | { ok: false; error: WalkInOrderErrorKey };

/**
 * A walk-in order is the shared order with a caller's name folded into the title
 * and the order's own coordinates attached.
 *
 * The blank-job check happens **here, before composing** — with a customer
 * present, an empty job would compose to `" — Frau Weber"`, which is a non-empty
 * title the shared builder would accept. The owner detail files the same order
 * without this step: there the account *is* the customer, so the title is the
 * job alone (`buildOrder`).
 *
 * **The location refusal is this function's job, not the form's.** `POST
 * /api/tasks/admin/groups` has required `lat`/`long` against the walk-in property
 * since 2026-08-26 (F-06c) and answers `400 walkin_location_required` without
 * them — a refusal with no field to attach it to. Refusing here keeps the guard
 * in the one place the suite can prove, rather than in a disabled submit button.
 *
 * Checked **last**, after every shared refusal, so the admin fixes the typed
 * fields before being sent to the map: the picker sits at the bottom of the form
 * and is the most expensive thing to redo.
 */
export function buildWalkInOrder(
  draft: WalkInOrderDraft,
  propertyId: string,
): WalkInOrderResult {
  const job = draft.title.trim();
  if (!job) return { ok: false, error: "titleRequired" };

  const customer = draft.customer.trim();
  const result: OrderResult = buildOrder(
    { ...draft, title: customer ? `${job} — ${customer}` : job },
    propertyId,
  );
  if (!result.ok) return result;

  if (!draft.location) return { ok: false, error: "locationRequired" };

  // Range is not re-checked: the map picker cannot produce a point outside
  // -90..90 / -180..180, and inventing a refusal for a value no input can hold
  // would be dead code. Out of range is a problem-details 400 the form renders.
  return {
    ok: true,
    body: {
      ...result.body,
      lat: draft.location.lat,
      long: draft.location.long,
    },
  };
}
