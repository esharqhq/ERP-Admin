import type {
  AgencyDto,
  CreateAgencyRequest,
  UpdateAgencyRequest,
} from "@/lib/types/agency.types";

/**
 * The create and edit forms hold exactly the same ten fields, as strings, so a
 * field cannot exist on one form and not the other. Dates are `YYYY-MM-DD`, which
 * is what `DayControl` speaks and what the API accepts.
 */
export interface AgencyFormState {
  legalName: string;
  registrationNumber: string;
  licenceNumber: string;
  countryId: string;
  cityId: string;
  contactPersonName: string;
  contactEmail: string;
  contactPhone: string;
  signedOn: string;
  validUntil: string;
}

export function emptyAgencyForm(): AgencyFormState {
  return {
    legalName: "",
    registrationNumber: "",
    licenceNumber: "",
    countryId: "",
    cityId: "",
    contactPersonName: "",
    contactEmail: "",
    contactPhone: "",
    signedOn: "",
    validUntil: "",
  };
}

/** `2026-01-01T00:00:00Z` → `2026-01-01`; anything unparseable → `""`. */
function toDay(iso: string | null): string {
  if (!iso) return "";
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? "" : at.toISOString().slice(0, 10);
}

/**
 * Populate the edit form. Nulls become empty strings: every input stays
 * controlled, and an empty box is what `buildAgencyUpdate` reads as "cleared".
 */
export function agencyFormFrom(agency: AgencyDto): AgencyFormState {
  return {
    legalName: agency.legalName,
    registrationNumber: agency.registrationNumber,
    licenceNumber: agency.licenceNumber ?? "",
    countryId: agency.countryId,
    cityId: agency.cityId,
    contactPersonName: agency.contactPersonName,
    contactEmail: agency.contactEmail,
    contactPhone: agency.contactPhone ?? "",
    signedOn: toDay(agency.signedOn),
    validUntil: toDay(agency.validUntil),
  };
}

/** Trimmed, or `undefined` when the box is empty. */
function opt(value: string): string | undefined {
  const t = value.trim();
  return t === "" ? undefined : t;
}

function base(form: AgencyFormState): CreateAgencyRequest {
  return {
    legalName: form.legalName.trim(),
    registrationNumber: form.registrationNumber.trim(),
    countryId: form.countryId,
    cityId: form.cityId,
    contactPersonName: form.contactPersonName.trim(),
    contactEmail: form.contactEmail.trim(),
    ...(opt(form.licenceNumber) ? { licenceNumber: opt(form.licenceNumber) } : {}),
    ...(opt(form.contactPhone) ? { contactPhone: opt(form.contactPhone) } : {}),
    ...(opt(form.signedOn) ? { signedOn: opt(form.signedOn) } : {}),
    ...(opt(form.validUntil) ? { validUntil: opt(form.validUntil) } : {}),
  };
}

export function buildAgencyCreate(form: AgencyFormState): CreateAgencyRequest {
  return base(form);
}

/**
 * ⚠ **Two rules, both of which silently lose data if got wrong.**
 *
 * 1. `licenceNumber` and `contactPhone` are **cleared when omitted** while the two
 *    dates and the two location ids are **kept**. Omitting an empty optional is
 *    therefore exactly right for the first pair and exactly wrong for the dates —
 *    which is what rule 2 exists for.
 * 2. An empty date means *unchanged*, so emptying a box cannot express "blank it".
 *    `clearContractDates` is sent whenever **either** box is empty, and only the
 *    non-empty dates go with it. Clearing an already-null date is a no-op, so the
 *    simpler predicate is also the safe one: it cannot leave a date the operator
 *    emptied still set. The flag is applied *before* the dates, so
 *    `{ clear: true, signedOn: X }` means *keep the start, make it open-ended*.
 */
export function buildAgencyUpdate(form: AgencyFormState): UpdateAgencyRequest {
  return {
    ...base(form),
    clearContractDates:
      opt(form.signedOn) === undefined || opt(form.validUntil) === undefined,
  };
}

/**
 * Whether saving this form switches off a partner that can log in **today**.
 *
 * ⚠ The trigger for the edit dialog's second confirmation. Moving `validUntil`
 * into the past — or clearing `signedOn` on a live partner — ends their access
 * within one request, and **nothing notifies them**. A phone-number typo and
 * switching off a business must not feel like the same button.
 *
 * Gated on `agency.isActive`: an agency that already cannot log in is not losing
 * anything, and warning there would fire on the most common repair of all —
 * filling in the dates of an `AwaitingContract` partner.
 */
export function endsAccessNow(
  form: AgencyFormState,
  agency: AgencyDto,
  today: number,
): boolean {
  if (!agency.isActive) return false;
  if (opt(form.signedOn) === undefined) return true;
  const end = opt(form.validUntil);
  if (end === undefined) return false;
  const at = Date.parse(end);
  return !Number.isNaN(at) && at < today;
}
