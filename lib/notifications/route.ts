import type { NotificationEntityType } from "@/lib/types/notification.types";

/**
 * Deep link for a bell row, or null when the row is not navigable.
 * Unknown entity types return null — a new backend type must degrade to a
 * non-clickable row, never to a broken route.
 */
export function notificationRoute(
  entityType: NotificationEntityType | null,
  entityId: string | null,
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
    default:
      return null;
  }
}
