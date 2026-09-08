import type { AdminIntakeRequest } from "@/lib/types/agency.types";

/**
 * The admin intake form, as strings — the shape every controlled input holds.
 *
 * ⚠ **Not `AgencyFormState`, and deliberately not a reuse of it.** Eight of the
 * ten fields are the same, but the last two are opposites: phase 2's form carries
 * `signedOn`/`validUntil`, which decide whether an agency can sign in, and this
 * one carries `expectedWorkerCount`/`message`, which are things the *applicant*
 * said. A shared type would put contract dates on a screen that has no agency to
 * apply them to, and `POST /api/agency-applications/admin` accepts neither.
 *
 * What the two forms genuinely share is the *rules* — the required set, the
 * trim-before-send, the country-clears-city gesture — and those are mirrored here
 * rather than abstracted, because one function serving two bodies is how a field
 * ends up on the wrong request.
 */
export interface IntakeFormState {
  legalName: string;
  registrationNumber: string;
  licenceNumber: string;
  countryId: string;
  cityId: string;
  contactPersonName: string;
  contactEmail: string;
  contactPhone: string;
  /** A string, because the input is. `""` means *unanswered* — see `buildAdminIntake`. */
  expectedWorkerCount: string;
  message: string;
}

export function emptyIntakeForm(): IntakeFormState {
  return {
    legalName: "",
    registrationNumber: "",
    licenceNumber: "",
    countryId: "",
    cityId: "",
    contactPersonName: "",
    contactEmail: "",
    contactPhone: "",
    expectedWorkerCount: "",
    message: "",
  };
}

/** Trimmed, or `undefined` when the box is empty. */
function opt(value: string): string | undefined {
  const t = value.trim();
  return t === "" ? undefined : t;
}

/**
 * An answered count, or `undefined`.
 *
 * ⚠ **`Number("")` is `0`, and `0` is a valid answer** — the guide's range is
 * `0–100000`. So a bare `Number(form.expectedWorkerCount)` turns *"they did not
 * say"* into *"they expect nobody"*, the server accepts it, and the row carries a
 * fact the agency never stated. The empty check has to come first, and a
 * non-numeric string has to fall out rather than reach a JSON body as `NaN`.
 */
function count(value: string): number | undefined {
  const t = value.trim();
  if (t === "") return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * The form → the request body.
 *
 * ⚠ **`termsVersion` and `termsAccepted` are absent, and that is the contract.**
 * They belong to the public form; here the agency accepted the terms on paper, so
 * the server records the current version, the moment of typing and the admin's
 * id. Sending them would claim a consent this screen never collected.
 *
 * Every optional field is **omitted** rather than sent empty: this door has no
 * "clear when omitted" rule to worry about — it is a create — so omission is
 * simply the honest way to say nothing was given.
 */
export function buildAdminIntake(form: IntakeFormState): AdminIntakeRequest {
  const workers = count(form.expectedWorkerCount);
  return {
    legalName: form.legalName.trim(),
    registrationNumber: form.registrationNumber.trim(),
    countryId: form.countryId,
    cityId: form.cityId,
    contactPersonName: form.contactPersonName.trim(),
    contactEmail: form.contactEmail.trim(),
    ...(opt(form.licenceNumber) ? { licenceNumber: opt(form.licenceNumber) } : {}),
    ...(opt(form.contactPhone) ? { contactPhone: opt(form.contactPhone) } : {}),
    ...(workers !== undefined ? { expectedWorkerCount: workers } : {}),
    ...(opt(form.message) ? { message: opt(form.message) } : {}),
  };
}

/**
 * The six fields the API refuses a create without, in the order the form draws
 * them — **not** in `IntakeFormState` key order.
 *
 * ⚠ The order is the point: the submit button's disabled line reads these out,
 * and an operator scanning the dialog top to bottom should meet them as the
 * controls appear. `Object.keys` order would put the location pair before the
 * contact person, because that is how the interface happens to be declared.
 */
export const REQUIRED_INTAKE_FIELDS = [
  "legalName",
  "registrationNumber",
  "contactPersonName",
  "countryId",
  "cityId",
  "contactEmail",
] as const satisfies readonly (keyof IntakeFormState)[];

export type RequiredIntakeField = (typeof REQUIRED_INTAKE_FIELDS)[number];

/**
 * Which required fields are still empty.
 *
 * ⚠ Whitespace counts as empty, matching `buildAdminIntake`, which trims before
 * sending — otherwise a form holding `"   "` passes the client check and is
 * refused by the server as problem-details, with no error code to map.
 */
export function missingIntakeRequired(
  form: IntakeFormState,
): RequiredIntakeField[] {
  return REQUIRED_INTAKE_FIELDS.filter((key) => form[key].trim() === "");
}

/**
 * The country picker owns two fields, so it writes both at once.
 *
 * ⚠ The city must belong to the country or the create answers
 * `city_country_mismatch`, and a stale city id left behind by a country change is
 * exactly how that happens. Phase 2's dialog learned this the same way.
 */
export function clearCityOnCountry(
  form: IntakeFormState,
  countryId: string,
): Partial<IntakeFormState> {
  return form.countryId === countryId
    ? { countryId }
    : { countryId, cityId: "" };
}
