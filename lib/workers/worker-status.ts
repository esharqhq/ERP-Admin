import {
  ONBOARDING_STATUSES,
  type OnboardingStatus,
} from "@/lib/types/onboarding.types";

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
export type WorkerStatusTone =
  /** The stage. Quiet, because most rows are one of these and a page of alarm is no alarm. */
  | "stage"
  /** An admin sanction, or a soft-delete. Filled, so it cannot be read as a stage. */
  | "solidCritical"
  /** Cover ran out. Outlined amber and **never red** — nobody did anything wrong. */
  | "outlineWarning";

/** The row-level accent this status paints, or `null` for the quiet majority. */
export type WorkerStatusRail = "critical" | "warning" | null;

export interface WorkerStatusPresentation {
  /** Which axis won the column. Drives whether the sub-line is a step or a reason. */
  kind: "stage" | "account";
  /** Key under `workers.stage.*` (kind `stage`) or `workers.account.*` (kind `account`). */
  labelKey: string;
  tone: WorkerStatusTone;
  rail: WorkerStatusRail;
  /**
   * 1-based position in the onboarding machine, for the `step n / 5` sub-line.
   * `null` whenever the account state took the column, because a step number
   * under the word `Blocked` would describe the wrong axis.
   *
   * ⚠ It is `n / 5` and not `n / 6` on purpose: `Rejected` is a **branch off** the
   * machine, not a rung of it, so it has no step.
   */
  step: number | null;
  /** Total rungs, so the copy never hard-codes a number the enum can move. */
  steps: number;
  /**
   * The review queue tints its rows — it is the one stage an admin acts on from
   * this list, and §01 draws those rows on a warm ground.
   */
  isReviewQueue: boolean;
}

/** `Rejected` is a branch, not a rung — the ladder is the other five. */
const LADDER: readonly OnboardingStatus[] = ONBOARDING_STATUSES.filter(
  (s) => s !== "Rejected",
);

/**
 * The two account states that do **not** take the column over.
 *
 * `Active` is obvious. `Pending` is the interesting one: a pending account is
 * exactly a worker mid-onboarding, so their stage is the more informative word and
 * showing `Pending` instead would replace a specific answer with a vague one.
 */
const PASSIVE = new Set(["Active", "Pending"]);

const ACCOUNT: Record<
  string,
  { labelKey: string; tone: WorkerStatusTone; rail: WorkerStatusRail }
> = {
  /**
   * Soft-deleted. Outranks everything, and is absent from the table unless
   * `?status=Deleted` is set explicitly — so seeing one means somebody asked.
   */
  Deleted: { labelKey: "deleted", tone: "solidCritical", rail: "critical" },
  /** An admin sanction. Outranks `Active`: a blocked worker with live cover reads this. */
  Blocked: { labelKey: "blocked", tone: "solidCritical", rail: "critical" },
  /** The contract ran out. Amber, never red. */
  Lapsed: { labelKey: "lapsed", tone: "outlineWarning", rail: "warning" },
};

/**
 * One badge for one row.
 *
 * Takes the two fields rather than the whole `WorkerRowDto` so the mobile card,
 * the desktop cell and the tests can all call it without constructing a row.
 */
export function workerStatusPresentation(row: {
  status: string | null;
  onboardingStatus: OnboardingStatus;
}): WorkerStatusPresentation {
  const account = row.status ?? "";
  const override = account && !PASSIVE.has(account) ? ACCOUNT[account] : undefined;

  if (override) {
    return {
      kind: "account",
      labelKey: override.labelKey,
      tone: override.tone,
      rail: override.rail,
      step: null,
      steps: LADDER.length,
      isReviewQueue: false,
    };
  }

  const rung = LADDER.indexOf(row.onboardingStatus);
  return {
    kind: "stage",
    labelKey: stageKey(row.onboardingStatus),
    tone: "stage",
    rail: null,
    // `Rejected` is off the ladder, so `indexOf` is -1 and the sub-line says
    // where it stopped instead of counting a step that does not exist.
    step: rung === -1 ? null : rung + 1,
    steps: LADDER.length,
    isReviewQueue: row.onboardingStatus === "Review",
  };
}

/**
 * `Kyc` → `kyc`. The i18n keys are camelCase, the enum is PascalCase.
 *
 * Exported because three drawings of a worker need it — the desktop cell, the
 * mobile card and the filter's stage picker — and three private copies is how the
 * keys and the enum drift apart.
 */
export function stageKey(status: OnboardingStatus | string): string {
  return status.charAt(0).toLowerCase() + status.slice(1);
}
