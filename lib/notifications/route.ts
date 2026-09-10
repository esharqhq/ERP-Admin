import type { NotificationEntityType } from "@/lib/types/notification.types";

/**
 * Deep link for a bell row, or null when the row is not navigable.
 * Unknown entity types return null — a new backend type must degrade to a
 * non-clickable row, never to a broken route.
 */
export function notificationRoute(
  entityType: NotificationEntityType | null,
  entityId: string | null,
  /**
   * The notification `type`, needed by exactly one entity.
   *
   * ⚠ `WorkerAgencyLink` covers three types with **two different audiences**:
   * 58 goes to the worker, 59 and 60 to every admin, and the two admin notices
   * belong on different tabs of one screen. `entityType` alone cannot separate
   * them, which is why this argument exists — optional, so a caller that does
   * not pass it keeps working unchanged.
   */
  type?: string,
): string | null {
  if (!entityType || !entityId) return null;
  switch (entityType) {
    case "Worker":
      return `/dashboard/workers/${entityId}`;
    // `entityId` is the ownerProfileId, which is exactly what the Docs detail route
    // is keyed on — so this lands on the owner's documents, not on a list.
    case "OwnerProfile":
      return `/dashboard/owner-documents/${entityId}`;
    case "Property":
      return `/dashboard/properties/${entityId}`;
    case "SupportTicket":
      return `/dashboard/support`;
    // Type 61 `AgencyApplicationSubmitted` — bell-only, to every admin. It has
    // been arriving since 2026-08-23 and landing on a non-clickable row because
    // there was no screen to send it to.
    //
    // ⚠ The three `WorkerAgencyLink` types (58–60) stay unrouted: their
    // destination is the agency-links screen, which phase 4 builds.
    case "AgencyApplication":
      return `/dashboard/agency-requests/${entityId}`;
    /*
      Types 58-60. ⚠ `entityId` is the **link** id and nothing is keyed on one —
      there is no `GET /api/admin/agency-links/{id}` and no link detail route. So
      the destination is the queue, which `notification-bell.md:233` names as a
      sanctioned target, and the tab is what makes it land on the right work. A
      `?linkId=` the endpoint does not accept would be a filter that silently
      does nothing, so `entityId` goes deliberately unused here; the queue's
      `createdAt desc` default puts the row that fired the bell at the top.
    */
    case "WorkerAgencyLink":
      // 58 `AgencyLinkProposedByAdmin` is the WORKER's own notice. An admin
      // panel has no row for it, so it stays non-clickable.
      if (type === "AgencyLinkProposedByAdmin") return null;
      if (type === "AgencyLinkProposedByWorker") {
        return "/dashboard/agency-links?tab=Proposed";
      }
      /*
        ⚠ `AgencyLinkDisputed` gets **no** `?tab=`: `Disputed` is that screen's
        default tab and `useTableUrlState` deletes the param when it matches the
        default — so the bare path is the canonical URL for that view, and
        emitting one would mean two addresses for the same screen.

        A type this build has not met lands in the same, sensible place.
      */
      return "/dashboard/agency-links";
    // Contract rows have no screen to land on. `/dashboard/contracts` was deleted as
    // unused, and `entityId` here is a *contract* id — no surviving route is keyed on
    // one, so there is nothing to redirect to rather than a list. Per this file's rule
    // above, that makes the row non-clickable; a link to a deleted route would be the
    // broken route the rule forbids. Restore this the day a contracts screen exists.
    case "OwnerContract":
    case "WorkerContract":
      return null;
    // OnboardingRevertedToKyc carries the *subject's* id, which is a worker id or an
    // ownerUserId depending on the side — and neither Docs detail route is keyed on
    // an ownerUserId. Routing it would need the notification to say which side it is,
    // so the row stays non-clickable rather than guessing wrong half the time.
    case "Onboarding":
      return null;
    /*
      F-06a types 62 `SkillRequestSubmitted` and 66 `SkillRequestResponded` - the two
      that reach an admin; 63, 64, 65 and 67 are the worker's own notices and never
      arrive here. `entityId` is the request id and the detail route is keyed on one,
      so this lands on the decision screen rather than a list. Unlike
      `WorkerAgencyLink` no `type` argument is needed: both admin types share one
      audience and one destination.
    */
    case "WorkerProfessionRequest":
      return `/dashboard/skill-requests/${entityId}`;
    default:
      return null;
  }
}
