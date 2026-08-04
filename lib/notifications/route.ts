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
    // Phase 1 repoints this to /dashboard/owner-documents/{ownerProfileId} when the
    // Docs workspace replaces /dashboard/kyc. See the roadmap, Phase 1 task 5.
    case "OwnerProfile":
      return `/dashboard/kyc`;
    case "Property":
      return `/dashboard/properties/${entityId}`;
    case "SupportTicket":
      return `/dashboard/support`;
    // Contract rows have no dedicated screen until Phase 2's registry exists.
    case "OwnerContract":
    case "WorkerContract":
      return `/dashboard/contracts`;
    // OnboardingRevertedToKyc carries this with the subject's id. Phase 1 repoints it
    // at the subject's Docs detail once those routes exist; until then, no route to
    // invent, so the row renders non-clickable.
    case "Onboarding":
      return null;
    default:
      return null;
  }
}
