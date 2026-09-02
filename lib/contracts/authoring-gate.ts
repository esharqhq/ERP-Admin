import type { ContractPhase } from "@/lib/types/onboarding.types";

/**
 * Why the two authoring actions are refused — or `null` when they are allowed.
 *
 * These exist because the form used to compute the same conditions inline, as
 * booleans, and spend them only on `disabled`. The result was the screen an admin
 * meets straight after approving an owner: an empty period, two dead buttons, and
 * nothing on the page saying which of them is waiting on what. The blocker is the
 * *reason*, not the boolean, so the panel can say it out loud; each member is an
 * i18n key suffix under `docsWorkspace.contract`.
 *
 * Ordered, not combined: only the first thing standing in the way is reported,
 * because that is the only one the admin can act on next.
 */
export type SaveDraftBlocker = "locked" | "periodMissing" | "periodBackwards";
export type SendBlocker = "locked" | "needsDraft";

/**
 * `from`/`to` are the raw `<input type="date">` values (`YYYY-MM-DD`, `""` when
 * empty), compared as strings — that format sorts lexicographically, and parsing
 * them into `Date` here would only reintroduce the timezone question that
 * `toUtcIso` already answers at the point of sending.
 *
 * A same-day period is **allowed**. The old inline check demanded `from < to`,
 * which refused it; but the body sends `eligibleTo` at `23:59:59`, so `from ===
 * to` is a real 24-hour period on the wire rather than an empty one. Refusing it
 * client-side was a silent, wrong "no".
 */
export function saveDraftBlocker(
  canAuthor: boolean,
  from: string,
  to: string,
): SaveDraftBlocker | null {
  // The account-level refusal comes first: someone who cannot author at all is
  // not helped by being told which date is missing.
  if (!canAuthor) return "locked";
  if (!from || !to) return "periodMissing";
  if (to < from) return "periodBackwards";
  return null;
}

/**
 * `phase` is the newest contract's phase, or `null` when the subject has none
 * (which is also what a renewal in progress reports — it authors a fresh row).
 *
 * Everything that is not a live `Draft` collapses to one answer. The panel's
 * authoring form is also where `Expired` / `Lapsed` / `Terminated` land — they
 * are neither `Sent` nor covered, so they fall past the panel's earlier branches
 * — and saving from there writes a **new** contract rather than editing the old
 * one. So "there is no draft yet" and "the draft you have is spent" are the same
 * instruction to the admin: save one, then send it.
 */
export function sendBlocker(
  canAuthor: boolean,
  phase: ContractPhase | null,
): SendBlocker | null {
  if (!canAuthor) return "locked";
  if (phase !== "Draft") return "needsDraft";
  return null;
}
