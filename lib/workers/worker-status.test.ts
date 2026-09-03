import { describe, expect, it } from "vitest";
import { ONBOARDING_STATUSES } from "@/lib/types/onboarding.types";
import { workerStatusPresentation } from "@/lib/workers/worker-status";

describe("workerStatusPresentation", () => {
  it("shows the stage while the account is Active", () => {
    expect(
      workerStatusPresentation({ status: "Active", onboardingStatus: "Contract" }),
    ).toMatchObject({
      kind: "stage",
      labelKey: "contract",
      tone: "stage",
      rail: null,
      step: 4,
      steps: 5,
    });
  });

  /*
    A pending account is a worker mid-onboarding, so their stage is the more
    informative word — `Pending` is deliberately NOT an override.
  */
  it("shows the stage while the account is Pending", () => {
    expect(
      workerStatusPresentation({ status: "Pending", onboardingStatus: "Review" }),
    ).toMatchObject({ kind: "stage", labelKey: "review", step: 2 });
  });

  it("marks the review queue so the row can be tinted", () => {
    expect(
      workerStatusPresentation({ status: "Pending", onboardingStatus: "Review" })
        .isReviewQueue,
    ).toBe(true);
    expect(
      workerStatusPresentation({ status: "Active", onboardingStatus: "Active" })
        .isReviewQueue,
    ).toBe(false);
  });

  /* Blocked outranks Active — the contradiction §04 says must stay visible. */
  it("lets Blocked take the column over from a live stage", () => {
    expect(
      workerStatusPresentation({ status: "Blocked", onboardingStatus: "Active" }),
    ).toMatchObject({
      kind: "account",
      labelKey: "blocked",
      tone: "solidCritical",
      rail: "critical",
      step: null,
    });
  });

  it("outranks everything with Deleted", () => {
    expect(
      workerStatusPresentation({ status: "Deleted", onboardingStatus: "Active" }),
    ).toMatchObject({ kind: "account", labelKey: "deleted", tone: "solidCritical" });
  });

  /* Amber, never red: the calendar moved, nobody misbehaved. */
  it("draws Lapsed outlined and warning-toned", () => {
    expect(
      workerStatusPresentation({ status: "Lapsed", onboardingStatus: "Active" }),
    ).toMatchObject({
      kind: "account",
      labelKey: "lapsed",
      tone: "outlineWarning",
      rail: "warning",
    });
  });

  /* `Rejected` is a branch off the machine, not a rung of it. */
  it("gives Rejected no step number", () => {
    expect(
      workerStatusPresentation({ status: "Pending", onboardingStatus: "Rejected" }),
    ).toMatchObject({ kind: "stage", labelKey: "rejected", step: null, steps: 5 });
  });

  it("numbers the ladder from the enum, so a new stage cannot desync it", () => {
    const steps = ONBOARDING_STATUSES.filter((s) => s !== "Rejected").map((s) =>
      workerStatusPresentation({ status: "Active", onboardingStatus: s }),
    );
    expect(steps.map((s) => s.step)).toEqual([1, 2, 3, 4, 5]);
    expect(new Set(steps.map((s) => s.steps))).toEqual(new Set([5]));
  });

  it("treats a missing status as no override rather than throwing", () => {
    expect(
      workerStatusPresentation({ status: null, onboardingStatus: "Kyc" }),
    ).toMatchObject({ kind: "stage", labelKey: "kyc", step: 1 });
  });
});
