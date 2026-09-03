import { verdictOf } from "@/lib/onboarding/doc-set";
import type { KycProfileDto } from "@/lib/types/kyc.types";

/**
 * What has been decided on this bundle, newest first.
 *
 * Assembled from the review stamps already on the profile — each document's
 * `status` + `reviewedAt` + `rejectReason`, plus the submission's own
 * `onboardingReviewedAt`. Nothing else is read: the audit log keys per-document
 * verdicts on the **document** id, so it cannot be filtered to a subject at all
 * (ask #19).
 *
 * ⚠ **No attribution.** The design reads *"Passport approved by D. Krüger"*, and
 * the *who* is not obtainable: `OwnerProfile.OnboardingReviewedByAdminId` exists
 * as a column but no DTO returns it, and nothing resolves an admin id to a name
 * (ask #25). Entries carry the action and the time. Printing a GUID at an
 * operator, or guessing from the newest document's reviewer, would both be worse
 * than the blank — the second names the wrong admin whenever two worked the same
 * bundle.
 */

export type HistoryKind =
  | "docApproved"
  | "docRejected"
  | "submissionApproved"
  | "submissionRejected";

export interface HistoryEntry {
  /** Stable across renders — the document id, or the submission's own marker. */
  id: string;
  kind: HistoryKind;
  at: string;
  /** Wire `OwnerKYCDocType` name, for the document entries. */
  docType?: string | null;
  reason?: string | null;
}

export function buildHistory(profile: KycProfileDto | null | undefined): HistoryEntry[] {
  if (!profile) return [];
  const entries: HistoryEntry[] = [];

  for (const doc of profile.documents ?? []) {
    // An undecided document has no entry — `reviewedAt` is the stamp that a
    // verdict happened, and a `status` without one is the default, not an event.
    if (!doc.reviewedAt) continue;
    const verdict = verdictOf(doc.status);
    if (verdict === "pending") continue;

    entries.push({
      id: doc.id,
      kind: verdict === "approved" ? "docApproved" : "docRejected",
      at: doc.reviewedAt,
      docType: doc.type,
      reason: verdict === "rejected" ? doc.rejectReason : null,
    });
  }

  if (profile.onboardingReviewedAt) {
    const rejected = profile.onboardingStatus === "Rejected";
    entries.push({
      id: `submission:${profile.ownerProfileId}`,
      kind: rejected ? "submissionRejected" : "submissionApproved",
      at: profile.onboardingReviewedAt,
      reason: rejected ? profile.onboardingRejectReason : null,
    });
  }

  return entries.sort((a, b) => b.at.localeCompare(a.at));
}
