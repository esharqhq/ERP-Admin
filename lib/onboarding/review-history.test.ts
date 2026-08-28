import { describe, expect, it } from "vitest";
import { buildHistory } from "@/lib/onboarding/review-history";
import type { KycDocDto, KycProfileDto } from "@/lib/types/kyc.types";

function doc(over: Partial<KycDocDto> = {}): KycDocDto {
  return {
    id: "d",
    type: "Passport",
    fileName: "passport.pdf",
    fileUrl: "passport.pdf",
    status: "Pending",
    rejectReason: null,
    reviewedAt: null,
    reviewedByAdminId: null,
    createdAt: "2026-08-24T09:00:00.000Z",
    ...over,
  };
}

function profile(over: Partial<KycProfileDto> = {}): KycProfileDto {
  return {
    ownerProfileId: "p1",
    ownerUserId: "u1",
    onboardingStatus: "Review",
    onboardingRejectReason: null,
    onboardingReviewedAt: null,
    documents: [],
    identity: {
      firstName: "Katrin",
      lastName: "Vogel",
      passportNumber: "C01X00T47",
      passportExpiry: null,
    },
    company: null,
    ...over,
  } as KycProfileDto;
}

describe("buildHistory", () => {
  it("is empty for nothing and for a bundle nobody has touched", () => {
    expect(buildHistory(null)).toEqual([]);
    expect(buildHistory(undefined)).toEqual([]);
    expect(buildHistory(profile({ documents: [doc(), doc({ id: "b" })] }))).toEqual([]);
  });

  it("records a decided document with its verdict", () => {
    const entries = buildHistory(
      profile({
        documents: [
          doc({
            id: "a",
            type: "Passport",
            status: "Approved",
            reviewedAt: "2026-08-26T09:12:00.000Z",
          }),
        ],
      }),
    );
    expect(entries).toEqual([
      {
        id: "a",
        kind: "docApproved",
        at: "2026-08-26T09:12:00.000Z",
        docType: "Passport",
        reason: null,
      },
    ]);
  });

  it("carries the reason on a rejection and drops it on an approval", () => {
    const entries = buildHistory(
      profile({
        documents: [
          doc({
            id: "bad",
            type: "BusinessLicense",
            status: "Rejected",
            rejectReason: "Scan cuts off the issue date",
            reviewedAt: "2026-08-26T09:10:00.000Z",
          }),
          doc({
            id: "ok",
            status: "Approved",
            rejectReason: "stale reason left on the row",
            reviewedAt: "2026-08-26T09:12:00.000Z",
          }),
        ],
      }),
    );
    expect(entries.find((e) => e.id === "bad")?.reason).toBe(
      "Scan cuts off the issue date",
    );
    // An approval clears the reject reason server-side; if a stale one is still
    // on the row it is not an event about this verdict.
    expect(entries.find((e) => e.id === "ok")?.reason).toBeNull();
  });

  it("ignores a document that has a status but no review stamp", () => {
    // `status` defaults to Pending and `reviewedAt` is what says a verdict
    // actually happened — a status without one is the default, not an event.
    expect(
      buildHistory(profile({ documents: [doc({ status: "Approved", reviewedAt: null })] })),
    ).toEqual([]);
    expect(
      buildHistory(
        profile({ documents: [doc({ status: "Pending", reviewedAt: "2026-08-26T09:00:00Z" })] }),
      ),
    ).toEqual([]);
  });

  it("records the submission decision, and reads its verdict from the stage", () => {
    const approved = buildHistory(
      profile({
        onboardingStatus: "Approved",
        onboardingReviewedAt: "2026-08-26T09:31:00.000Z",
      }),
    );
    expect(approved[0]).toMatchObject({ kind: "submissionApproved", reason: null });

    const rejected = buildHistory(
      profile({
        onboardingStatus: "Rejected",
        onboardingRejectReason: "Fix the licence scan",
        onboardingReviewedAt: "2026-08-22T09:31:00.000Z",
      }),
    );
    expect(rejected[0]).toMatchObject({
      kind: "submissionRejected",
      reason: "Fix the licence scan",
    });
  });

  it("sorts newest first across both kinds", () => {
    const entries = buildHistory(
      profile({
        onboardingStatus: "Approved",
        onboardingReviewedAt: "2026-08-26T09:31:00.000Z",
        documents: [
          doc({ id: "old", status: "Rejected", reviewedAt: "2026-08-26T09:10:00.000Z" }),
          doc({ id: "mid", status: "Approved", reviewedAt: "2026-08-26T09:28:00.000Z" }),
        ],
      }),
    );
    expect(entries.map((e) => e.id)).toEqual([
      "submission:p1",
      "mid",
      "old",
    ]);
  });

  it("gives the submission entry an id that cannot collide with a document", () => {
    const entries = buildHistory(
      profile({ onboardingReviewedAt: "2026-08-26T09:31:00.000Z" }),
    );
    expect(entries[0].id).toBe("submission:p1");
  });
});
