import type { AgencyDto } from "@/lib/types/agency.types";

export interface AgencySummary {
  total: number;
  /** `!isVerified` — the set-password link has not been used. */
  invitationPending: number;
  awaitingContract: number;
  expired: number;
}

/**
 * Counts for the strip. Derived from the rows on screen, which **is** the whole
 * set — `GET /api/agencies` is unpaged, so unlike a server-paged queue these
 * numbers describe the platform rather than the current page.
 *
 * ⚠ **A row can be counted in two tiles.** `invitationPending` and
 * `awaitingContract` are independent axes and a partner approved yesterday is
 * both. The tiles write filters, so a row counted once would make the number and
 * the filtered table disagree.
 */
export function agencySummary(rows: AgencyDto[]): AgencySummary {
  return {
    total: rows.length,
    invitationPending: rows.filter((a) => !a.isVerified).length,
    awaitingContract: rows.filter((a) => a.standing === "AwaitingContract").length,
    expired: rows.filter((a) => a.standing === "Expired").length,
  };
}
