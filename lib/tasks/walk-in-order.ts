import { buildOrder, type OrderDraft, type OrderErrorKey, type OrderResult } from "@/lib/tasks/order";

/** The shared draft plus the one field only the walk-in surface collects. */
export interface WalkInOrderDraft extends OrderDraft {
  /**
   * Who the order came from. Composed into `title` rather than sent separately:
   * `internalNote` is the only "not shown to workers" field and it appears in no
   * response DTO, so anything written there can never be read back. `title` is
   * what the orders list renders, which is the whole point of collecting this.
   */
  customer: string;
}

/** Keys under the `walkIn.errors` i18n namespace. */
export type WalkInOrderErrorKey = OrderErrorKey;

export type WalkInOrderResult = OrderResult;

/**
 * A walk-in order is the shared order with a caller's name folded into the title.
 *
 * The blank-job check happens **here, before composing** — with a customer
 * present, an empty job would compose to `" — Frau Weber"`, which is a non-empty
 * title the shared builder would accept. The owner detail files the same order
 * without this step: there the account *is* the customer, so the title is the
 * job alone (`buildOrder`).
 */
export function buildWalkInOrder(
  draft: WalkInOrderDraft,
  propertyId: string,
): WalkInOrderResult {
  const job = draft.title.trim();
  if (!job) return { ok: false, error: "titleRequired" };

  const customer = draft.customer.trim();
  return buildOrder(
    { ...draft, title: customer ? `${job} — ${customer}` : job },
    propertyId,
  );
}
