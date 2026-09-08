import { getApiErrorCode, getValidationMessage } from "@/lib/http/api-error";

/**
 * Wire code → a key under `agencies.errors.*`, plus the server's own sentence
 * where that is the only useful text.
 *
 * One mapper for create, edit, delete and resend, because the same code appears
 * on several doors and a generic fallback shared between them would hide an
 * actionable difference.
 *
 * ⚠ **`404` shapes differ across this route family.** `PUT /api/agencies/{id}`
 * answers `{ error: "not_found", detail }`; `GET /api/agencies/{id}` answers a
 * **bodiless** `404`. This phase only meets `PUT`'s — the detail page will meet
 * the other, and one parser cannot serve both.
 *
 * ⚠ **A `403` has an empty body.** Nothing to map, which is why every action is
 * gated before the click rather than reported after it.
 */
const BY_CODE: Record<string, string> = {
  // Scoped to agencies only. The same address may legitimately belong to a worker
  // or an owner — the four user types have independent email uniqueness — so the
  // copy says "an agency already uses this address", never "already registered".
  agency_email_taken: "emailTaken",
  country_not_found: "countryNotFound",
  city_not_found: "cityNotFound",
  city_country_mismatch: "cityCountryMismatch",
  invalid_contract_window: "invalidContractWindow",
  // A server setup fault, not a bad request: the AGENCY role is not seeded.
  agency_role_missing: "roleMissing",
  not_found: "notFound",
};

/**
 * `detail` is the server's own sentence, shown only when it is genuinely more
 * useful than our generic string. It is populated for **problem-details** —
 * `[Required]` failures are refused before the action runs and carry no `error`
 * field at all, so without this the admin who left a box empty is told "unknown
 * error".
 *
 * ⚠ It is deliberately **not** populated for a leaked exception message.
 * `G_ArgumentExceptionMessageLeaksIntoErrorField` (open): nine controller sites
 * put `ex.Message` straight into `error`, so that field can hold library prose
 * whose wording changes on upgrade. Showing it would dress an internal crash as a
 * diagnosis an admin could act on.
 */
export function agencyErrorKey(err: unknown): { key: string; detail?: string } {
  const code = getApiErrorCode(err);

  if (code) {
    const key = BY_CODE[code];
    if (key) return { key };
    /*
      An `error` field we do not recognise. Two things it can be, and the same
      answer serves both, so there is deliberately **no branch and no
      `looksLikeLeakedMessage` call** here:

      - a real new code — machine text, meaningless to an admin;
      - a leaked `ex.Message` (`G_ArgumentExceptionMessageLeaksIntoErrorField`,
        open: nine controller sites do `error = ex.Message`) — library prose
        dressed as a diagnosis.

      Both get the generic sentence and **neither is passed on as `detail`**,
      which is the property the test pins. Importing the predicate to make that
      visible would leave an unused import justified by a comment; if a future
      requirement is to *tell* an operator the server leaked, import it then.
    */
    return { key: "generic" };
  }

  // No `error` field: problem-details, or a network failure. Prefer the server's
  // own field message over our generic string, which would otherwise swallow it.
  const detail = getValidationMessage(err);
  return detail ? { key: "generic", detail } : { key: "generic" };
}
