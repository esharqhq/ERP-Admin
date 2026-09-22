import { ONBOARDING_STATUSES } from "@/lib/types/onboarding.types";

/**
 * One status badge for one account row — owner **or** worker.
 *
 * The two tables answered this question differently until now: workers drew a
 * two-line chip off this logic while owners drew a one-line badge off
 * `onboardingStatusPresentation`, so the same `Active` account looked like two
 * different things depending on which table you were standing in. One function,
 * one reading.
 *
 * ⚠ **`onboardingStatus` is typed `string`, not `OnboardingStatus`.** The Default
 * Owner (walk-in) carries no onboarding record and reports `"NotApplicable"` — a
 * seventh value the stored state machine's enum does not have and must never
 * gain (F-02b·6 §4.1). Typing it as the union would make an exhaustive `switch`
 * look safe while that row fell straight through it.
 */
export type AccountStatusTone =
  | "stage"
  | "solidCritical"
  | "outlineWarning";

/** The row-level accent this status paints, or `null` for the quiet majority. */
export type AccountStatusRail = "critical" | "warning" | null;

export interface AccountStatusPresentation {
  /** Which axis won the column. Drives whether the sub-line is a step or a reason. */
  kind: "stage" | "account";
  /** Key under `<ns>.stage.*` (kind `stage`) or `<ns>.account.*` (kind `account`). */
  labelKey: string;
  tone: AccountStatusTone;
  rail: AccountStatusRail;
  /**
   * 1-based position in the onboarding machine, for the `step n / 5` sub-line.
   * `null` whenever the account state took the column, because a step number
   * under the word `Blocked` would describe the wrong axis — and `null` for a
   * value that is not on the ladder at all.
   *
   * ⚠ It is `n / 5` and not `n / 6` on purpose: `Rejected` is a **branch off** the
   * machine, not a rung of it, so it has no step.
   */
  step: number | null;
  /** Total rungs, so the copy never hard-codes a number the enum can move. */
  steps: number;
  /**
   * The review queue tints its rows — it is the one stage an admin acts on from
   * a list, and §01 draws those rows on a warm ground.
   */
  isReviewQueue: boolean;
}

/** `Rejected` is a branch, not a rung — the ladder is the other five. */
const LADDER: readonly string[] = ONBOARDING_STATUSES.filter(
  (s) => s !== "Rejected",
);

/**
 * The two account states that do **not** take the column over.
 *
 * `Active` is obvious. `Pending` is the interesting one: a pending account is
 * exactly a subject mid-onboarding, so their stage is the more informative word
 * and showing `Pending` instead would replace a specific answer with a vague one.
 */
const PASSIVE = new Set(["Active", "Pending"]);

const ACCOUNT: Record<
  string,
  { labelKey: string; tone: AccountStatusTone; rail: AccountStatusRail }
> = {
  /**
   * Soft-deleted. Outranks everything, and is absent from either table unless
   * `?status=Deleted` is set explicitly — so seeing one means somebody asked.
   */
  Deleted: { labelKey: "deleted", tone: "solidCritical", rail: "critical" },
  /**
   * An admin sanction. Outranks `Active`: a blocked worker with live cover reads
   * this. ⚠ Worker-only — the owner table has no administrative block and
   * `?status=Blocked` there is a `400`. Harmless here: an owner row never
   * carries the word.
   */
  Blocked: { labelKey: "blocked", tone: "solidCritical", rail: "critical" },
  /** The contract ran out. Amber, never red. */
  Lapsed: { labelKey: "lapsed", tone: "outlineWarning", rail: "warning" },
};

export function accountStatusPresentation(row: {
  status: string | null;
  onboardingStatus: string;
}): AccountStatusPresentation {
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
    // `Rejected` is off the ladder and so is the walk-in owner's
    // `NotApplicable`, so `indexOf` is -1 and the sub-line says where it stopped
    // instead of counting a step that does not exist.
    step: rung === -1 ? null : rung + 1,
    steps: LADDER.length,
    isReviewQueue: row.onboardingStatus === "Review",
  };
}

/**
 * `Kyc` → `kyc`. The i18n keys are camelCase, the enum is PascalCase.
 *
 * Exported because several drawings of a subject need it — the desktop cells,
 * the mobile cards and the filter pickers — and private copies are how the keys
 * and the enum drift apart.
 */
export function stageKey(status: string): string {
  return status.charAt(0).toLowerCase() + status.slice(1);
}
