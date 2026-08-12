/**
 * What Owner Detail may offer, derived from three reads that arrive separately.
 *
 * This lives in `lib/` rather than inside the component because vitest in this
 * repo runs node-only over `lib/**` and `hooks/**` — logic left in a component
 * is logic left unverified, and every rule below is one the server enforces.
 */

/**
 * The three outcomes of `GET /api/admin/kyc/owner/{id}`, which are three
 * different facts and must not be collapsed into a boolean:
 *
 * - `visible`   — 200. The owner has an `OwnerProfile`. Its `identity` fields
 *                 may still be all null; an unfilled profile is still a profile.
 * - `absent`    — 404. No profile row. This is the state behind the endpoint's
 *                 `400 owner_profile_not_found`.
 * - `forbidden` — 403, or any other failure. Says nothing about the owner.
 */
export type KycRead = "visible" | "forbidden" | "absent";

/** Why the legal-name fields are not writable. Three reasons, three messages. */
export type NameLock = "self-editable" | "no-profile" | "system" | null;

export interface OwnerDetailActions {
  isWalkIn: boolean;
  canEdit: boolean;
  canDelete: boolean;
  nameLock: NameLock;
}

export interface OwnerUpdateBody {
  firstName?: string;
  lastName?: string;
  reason: string;
}

/**
 * The only two stages where the owner can still write their own legal name via
 * `PUT /api/kyc/identity`. The admin endpoint and the owner endpoint are exact
 * complements — exactly one party can write at any moment — so these are the
 * two stages where the admin route answers `409 owner_can_self_edit`.
 */
const SELF_EDITABLE = new Set(["Kyc", "Rejected"]);

export function ownerDetailActions(input: {
  ownerId: string;
  walkInId: string | null;
  kycRead: KycRead;
  /** Meaningful only when `kycRead === "visible"`. */
  onboardingStatus: string | null;
}): OwnerDetailActions {
  const { ownerId, walkInId, kycRead, onboardingStatus } = input;

  // First, mirroring the server: owner_is_system is returned ahead of the
  // subject lookup on both routes, so it wins over everything below.
  if (walkInId !== null && ownerId === walkInId) {
    return { isWalkIn: true, canEdit: false, canDelete: false, nameLock: "system" };
  }

  if (kycRead === "absent") {
    return { isWalkIn: false, canEdit: false, canDelete: true, nameLock: "no-profile" };
  }

  // Nothing to prefill and no way to know whether the name is writable, so the
  // button is hidden rather than opened on a guess.
  if (kycRead === "forbidden") {
    return { isWalkIn: false, canEdit: false, canDelete: true, nameLock: null };
  }

  const locked = onboardingStatus !== null && SELF_EDITABLE.has(onboardingStatus);
  return {
    isWalkIn: false,
    canEdit: true,
    canDelete: true,
    nameLock: locked ? "self-editable" : null,
  };
}

/**
 * Build the PUT body, or `null` when it must not be sent.
 *
 * Two refusals, both because the endpoint would otherwise accept the request
 * and do nothing: a blank `reason` is `400 reason_required` (validated in the
 * service, not by model attributes), and a body whose every name is blank is a
 * silent no-op — `""` means "leave unchanged", so it changes nothing, writes no
 * audit entry, and still returns `200`.
 */
export function buildOwnerUpdateBody(input: {
  firstName: string;
  lastName: string;
  reason: string;
}): OwnerUpdateBody | null {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const reason = input.reason.trim();

  if (!reason) return null;
  if (!firstName && !lastName) return null;

  return {
    ...(firstName ? { firstName } : {}),
    ...(lastName ? { lastName } : {}),
    reason,
  };
}
