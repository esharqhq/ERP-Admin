import { getApiErrorCode, getValidationMessage } from "@/lib/http/api-error";

/**
 * This screen's own error catalogue, keyed to `agencyLinks.errors.*`.
 *
 * ⚠ **A third mapper, not an extension of phase 2's or phase 3's**, and the
 * catalogues genuinely do not overlap in *meaning* even where a code repeats:
 * `agency_not_found` is a **form field** refusal on an agency create and *"that
 * partner is gone, reject this link"* here. One mapper serving both would put
 * one of those two sentences on the wrong screen.
 *
 * ⚠ **A `403` has an empty body** — nothing to parse, which is why the queue
 * reads `isPermissionDenied` off the source rather than a code from here.
 */
const BY_CODE: Record<string, string> = {
  agency_link_not_found: "notFound",
  worker_not_found: "workerNotFound",
  agency_not_found: "agencyNotFound",
  agency_not_in_force: "agencyNotInForce",
  agency_link_exists: "linkExists",
  agency_link_not_awaiting_you: "notAwaitingYou",
  agency_link_already_resolved: "alreadyResolved",
  reason_required: "reasonRequired",
  invalid_sort_column: "invalidSortColumn",
};

export function linkErrorKey(err: unknown): { key: string; detail?: string } {
  const code = getApiErrorCode(err);

  if (code) {
    const key = BY_CODE[code];
    if (key) return { key };
    /*
      An `error` field we do not recognise: either a genuinely new code — machine
      text, meaningless to an admin — or a leaked `ex.Message`, which is library
      prose dressed as a diagnosis. Both get the generic sentence and **neither
      becomes a `detail`**, which is the property the test pins.
    */
    return { key: "generic" };
  }

  /*
    No `error` field: problem-details — which is what the ATTACH door returns for
    a whitespace-only reason, because `[Required]` trims it away before the
    service is reached — or a network failure. The server's own field message
    beats our generic string, which would otherwise swallow the one useful line.
  */
  const detail = getValidationMessage(err);
  return detail ? { key: "generic", detail } : { key: "generic" };
}
