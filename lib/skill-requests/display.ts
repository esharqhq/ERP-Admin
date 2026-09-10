import { PROTECTED_PROFESSION_CODE } from "@/lib/types/profession.types";
import type { SkillRequestStatus } from "@/lib/types/skill-request.types";

/**
 * The `skillRequests.claim.*` key naming `adminNote` in this status, or `null` where
 * the field carries neither meaning and should not be labelled.
 *
 * ⚠ `adminNote` is **dual-purpose**: the admin's *question* while `InfoRequested`,
 * and the *rejection reason* once `Rejected` — reject overwrites the same column. A
 * generic "Admin note" label is wrong in both states, which is the only reason this
 * function exists rather than a literal in the component.
 *
 * A status this build has not met returns `null` rather than guessing, per the
 * project rule against exhaustive enum switches.
 */
export function adminNoteLabelKey(status: SkillRequestStatus): string | null {
  if (status === "InfoRequested") return "adminQuestion";
  if (status === "Rejected") return "rejectionReason";
  return null;
}

/**
 * Whether the revoke control may be shown at all.
 *
 * Revoke has four refusals, and **two of them are knowable client-side** — so the
 * control is hidden rather than allowed to fail:
 *
 * - `cannot_revoke_general` — `GENERAL` is the protected default that registration
 *   attaches to every worker. Keyed on `code`, never a display name: the name is
 *   admin-editable, the code is immutable.
 * - `cannot_revoke_last_skill` — a worker holding no skills could join nothing.
 *
 * The third refusal, `skill_in_use_by_live_work`, is **not** knowable here and must
 * not be pre-empted: it is temporary, clears when the blocking work finishes, and is
 * surfaced as a retryable message instead. The fourth, `reason_required`, is the
 * dialog's empty-field guard.
 *
 * Permission is a separate axis — `worker_profession_request:manage` gates the
 * control through `Can`; this function gates whether it makes sense at all.
 */
export function canOfferRevoke({
  status,
  professionCode,
  heldSkillCount,
}: {
  status: SkillRequestStatus;
  professionCode: string;
  /** `heldSkills.length` from the detail response. */
  heldSkillCount: number;
}): boolean {
  if (status !== "Approved") return false;
  if (professionCode === PROTECTED_PROFESSION_CODE) return false;
  if (heldSkillCount <= 1) return false;
  return true;
}
