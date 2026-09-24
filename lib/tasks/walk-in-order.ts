import {
  buildOrder,
  type OrderDraft,
  type OrderErrorKey,
  type OrderRequest,
  type OrderResult,
} from "@/lib/tasks/order";

/** The shared draft plus the things only the walk-in surface collects. */
export interface WalkInOrderDraft extends OrderDraft {
  /**
   * Who the order came from. Composed into `title` rather than sent separately:
   * `internalNote` is the only "not shown to workers" field and it appears in no
   * response DTO, so anything written there can never be read back. `title` is
   * what the orders list renders, which is the whole point of collecting this.
   */
  customer: string;
  /**
   * Only there to scope the city list — cities are always fetched per country
   * (`GET /api/countries/{id}/cities`, there is no flat list). Never sent: the
   * create routes take a city and nothing else.
   */
  countryId: string;
  /**
   * The order's own city (F-07 ·9b, 2026-09-23). `""` = not picked. The walk-in
   * property deliberately has no city, so the order must carry one — it is what
   * the worker app's same-city gate reads (`task-lifecycle.md` §0h).
   */
  cityId: string;
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
 * `cityRequired` and `locationRequired` are walk-in-only: the shared builder has
 * neither field because the owner dialog files against an ordinary property,
 * where sending them is refused (`group_city_not_allowed`,
 * `group_location_not_allowed`).
 */
export type WalkInOrderErrorKey = OrderErrorKey | "cityRequired" | "locationRequired";

export type WalkInOrderResult =
  | { ok: true; request: OrderRequest }
  | { ok: false; error: WalkInOrderErrorKey };

/**
 * A walk-in order is the shared order with a caller's name folded into the
 * title, and the order's own city and coordinates attached — on whichever route
 * the shared builder picked, since both admin create doors take the walk-in
 * property with the same requirements.
 *
 * The blank-job check happens **here, before composing** — with a customer
 * present, an empty job would compose to `" — Frau Weber"`, which is a non-empty
 * title the shared builder would accept. The owner detail files the same order
 * without this step: there the account *is* the customer, so the title is the
 * job alone (`buildOrder`).
 *
 * **The city and location refusals are this function's job, not the form's.**
 * Without them the route answers `400 walkin_city_required` /
 * `walkin_location_required` — refusals with no field to attach them to.
 * Refusing here keeps the guard in the one place the suite can prove, rather
 * than in a disabled submit button.
 *
 * Both are checked **last**, after every shared refusal, and the map last of
 * all: the picker sits at the bottom of the form and is the most expensive thing
 * to redo.
 */
export function buildWalkInOrder(
  draft: WalkInOrderDraft,
  propertyId: string,
  now: Date = new Date(),
): WalkInOrderResult {
  const job = draft.title.trim();
  if (!job) return { ok: false, error: "titleRequired" };

  const customer = draft.customer.trim();
  const result: OrderResult = buildOrder(
    { ...draft, title: customer ? `${job} — ${customer}` : job },
    propertyId,
    now,
  );
  if (!result.ok) return result;

  if (!draft.cityId) return { ok: false, error: "cityRequired" };
  if (!draft.location) return { ok: false, error: "locationRequired" };

  // Range is not re-checked: the map picker cannot produce a point outside
  // -90..90 / -180..180, and inventing a refusal for a value no input can hold
  // would be dead code. Out of range is a problem-details 400 the form renders.
  const walkIn = {
    cityId: draft.cityId,
    lat: draft.location.lat,
    long: draft.location.long,
  };
  const { request } = result;
  return {
    ok: true,
    request:
      request.kind === "single"
        ? { kind: "single", body: { ...request.body, ...walkIn } }
        : { kind: "booking", body: { ...request.body, ...walkIn } },
  };
}
