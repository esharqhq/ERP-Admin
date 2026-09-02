/**
 * Staffing agencies, as far as this panel currently reads them.
 *
 * Only the picker is here. The full agency surface — the application queue, the
 * detail, the three verbs, the links table — is sub-project #3 in
 * `docs/superpowers/plans/2026-08-31-admin-work-queue-roadmap.md` and will bring
 * its own richer DTOs. This file exists so the workers table's `?agencyId=`
 * filter has something to populate itself from without waiting for that.
 *
 * Guide: `../Backend/docs/handoff/f-05-c-worker-agency-link.md` §4.2.
 */

/**
 * One row of `GET /api/agencies/active`.
 *
 * **Three fields, and that is the whole point of the endpoint.** `GET /api/agencies`
 * returns far more and is gated on `agency:read` (170002); this one carries no
 * permission attribute at all — `[Authorize]` only — so a picker built on it works
 * for every admin, including one whose role does not include the agency screens.
 *
 * `city` is part of the contract rather than decoration: two agencies can share a
 * trading name, and the city is what tells them apart in a dropdown.
 *
 * ⚠ **A lapsed agency is absent here while its badge still renders on a worker
 * row.** Both halves are correct — the row states a historical fact, this endpoint
 * answers "who can be picked today" — so a worker can legitimately show an agency
 * name that the filter cannot offer.
 */
export interface ActiveAgencyDto {
  id: string;
  legalName: string;
  city: string | null;
}
