import { type OnboardingStatus } from "@/lib/types/onboarding.types";
import {
  accountStatusPresentation,
  stageKey,
  type AccountStatusPresentation,
  type AccountStatusRail,
  type AccountStatusTone,
} from "@/lib/onboarding/account-status";

/**
 * The workers table's one **Status** column.
 *
 * ## Why one column and not two
 *
 * A worker carries two independent statuses and both are real: `onboardingStatus`
 * is the stage of becoming bookable, `status` is the account's standing. The brief
 * asks for both without letting them read as one thing, and the design's answer —
 * `Uyer-Admin-Workers-Table.dc.html` §04, and the `statusFor()` that draws its §01
 * artboard — is **one column that shows the stage, until the account state is
 * something other than Active or Pending, at which point that takes the column
 * over**.
 *
 * The argument is that every registered worker carries `status: Active`, so a
 * second always-on column would repeat one word down the whole page. The freed
 * slot went to Location.
 *
 * ⚠ **The design file contradicts itself here** and the contradiction has a right
 * answer: §01's artboard header, §04's heading and body, and the implementing
 * function all say one column, while §05's `colSpec` prose and §09's answer #3 say
 * two. The three that actually *draw* something agree; the two that disagree are
 * prose that was not updated when the columns merged. Recorded in full in
 * `docs/superpowers/plans/2026-09-01-workers-table-state.md` § D1.
 *
 * ⚠ **§04's warning box is about the row this merge is most likely to flatten**
 * — a blocked worker holding a live contract reads `Blocked`, and *"that
 * contradiction is the truth, and both columns must show it."* One merged column
 * honours that by carrying **both** on the row: the account word in the badge and
 * the stage in the sub-line beside the reason (`workers.status.overrides`), on the
 * desktop cell and on the mobile card alike. A `stage` column also sits in the
 * picker, off by default — but that is for scanning the axis, **not** the answer
 * to the warning: a column an admin has to switch on is reachable, which is not
 * the same as shown.
 *
 * ## Why the precedence is here and nowhere else
 *
 * `Deleted → Blocked → Active → Lapsed → Pending` is the server's own ordering, and
 * a row can satisfy more than one of them at once. Written down twice it drifts;
 * written down here, the row cell, the row rail and the mobile card all read the
 * same function.
 */

/** How the badge is drawn. Names a role, never a colour — tones are tokens. */
export type WorkerStatusTone = AccountStatusTone;
export type WorkerStatusRail = AccountStatusRail;
export type WorkerStatusPresentation = AccountStatusPresentation;

/**
 * The worker-typed entry point to `accountStatusPresentation`.
 *
 * ⚠ The logic moved to `lib/onboarding/account-status.ts` when the **owners**
 * table was brought onto the same badge. It was never worker-specific — it only
 * ever read `status` and `onboardingStatus`, which both tables carry — and two
 * copies would have been two readings of the same `Active` account.
 *
 * This wrapper stays because six call sites and a test suite name it, and
 * because it keeps the `OnboardingStatus` union on the worker side: a worker row
 * never carries the walk-in owner's `"NotApplicable"`, so there is no reason to
 * widen the type here.
 */
export function workerStatusPresentation(row: {
  status: string | null;
  onboardingStatus: OnboardingStatus;
}): WorkerStatusPresentation {
  return accountStatusPresentation(row);
}

export { stageKey };

/**
 * The stage badge's tone.
 *
 * Quiet by default and coloured only at the two ends that mean something: the
 * review queue is the one an admin acts on, `Rejected` is a stop, `Active` is
 * done. A distinct colour per stage would make a page of rows into a rainbow in
 * which none of the three carried any signal.
 *
 * Shared by the Table's Status column and the Matrix's row identity, so the
 * same badge reads the same colour in both drawings of the same worker.
 */
export function stageTone(
  labelKey: string,
): "warning" | "danger" | "success" | "neutral" {
  if (labelKey === "review") return "warning";
  if (labelKey === "rejected") return "danger";
  if (labelKey === "active") return "success";
  return "neutral";
}
