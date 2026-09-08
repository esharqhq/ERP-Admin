import { getApiErrorCode, getValidationMessage } from "@/lib/http/api-error";

/**
 * This feature's own error catalogue, keyed to `agencyRequests.errors.*`.
 *
 * ⚠ **A second mapper, not an extension of phase 2's.** The catalogues do not
 * overlap: phase 2 meets `agency_email_taken` on *create* as a plain sentence,
 * this one meets it on *approve* carrying two extra keys and needing a panel; and
 * this one adds seven document codes phase 2 never sees. One mapper with twenty
 * entries serving two unrelated screens is how a message ends up in the wrong
 * place.
 *
 * ⚠ **A `403` has an empty body**, and a `429` cannot occur on any admin door
 * here — the cooldown is on the public submit only.
 */
const BY_CODE: Record<string, string> = {
  // Review verbs
  application_already_reviewed: "alreadyReviewed",
  note_required: "noteRequired",
  reason_required: "reasonRequired",
  application_not_found: "notFound",
  // Approve
  agency_email_taken: "emailTaken",
  invalid_contract_window: "invalidContractWindow",
  application_location_missing: "locationMissing",
  agency_role_missing: "roleMissing",
  // Intake
  terms_not_configured: "termsNotConfigured",
  country_not_found: "countryNotFound",
  city_not_found: "cityNotFound",
  city_country_mismatch: "cityCountryMismatch",
  // Document doors
  invalid_or_expired_token: "invalidToken",
  storage_key_mismatch: "storageKeyMismatch",
  unsupported_document_type: "unsupportedType",
  file_not_found: "fileNotFound",
  declared_mime_mismatch: "mimeMismatch",
  document_too_large: "tooLarge",
  document_limit_reached: "limitReached",
};

/** Approve's clash names the live agency in the way of it. */
function blockingAgency(
  err: unknown,
): { id: string; legalName: string } | undefined {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (!data || typeof data !== "object") return undefined;
  const body = data as {
    existingAgencyId?: unknown;
    existingAgencyLegalName?: unknown;
  };
  if (
    typeof body.existingAgencyId === "string" &&
    typeof body.existingAgencyLegalName === "string"
  ) {
    return { id: body.existingAgencyId, legalName: body.existingAgencyLegalName };
  }
  // The two keys are documented as always present on this code, but a refusal
  // without them must still produce a usable message rather than a crash.
  return undefined;
}

export function applicationErrorKey(err: unknown): {
  key: string;
  detail?: string;
  blocking?: { id: string; legalName: string };
} {
  const code = getApiErrorCode(err);

  if (code) {
    const key = BY_CODE[code];
    if (key === "emailTaken") {
      const blocking = blockingAgency(err);
      return blocking ? { key, blocking } : { key };
    }
    if (key) return { key };
    /*
      An `error` field we do not recognise: either a genuinely new code — machine
      text, meaningless to an admin — or a leaked `ex.Message`
      (`G_ArgumentExceptionMessageLeaksIntoErrorField`), which is library prose
      dressed as a diagnosis. Both get the generic sentence and **neither becomes
      a `detail`**, which is the property the test pins.
    */
    return { key: "generic" };
  }

  // No `error` field: problem-details (model validation runs before the action
  // body) or a network failure. The server's own field message beats our generic
  // string, which would otherwise swallow the one useful line.
  const detail = getValidationMessage(err);
  return detail ? { key: "generic", detail } : { key: "generic" };
}
