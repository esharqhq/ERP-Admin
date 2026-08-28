import { describe, expect, it } from "vitest";
import {
  MAX_DOTS,
  subjectSide,
  summariseDetail,
  waitingDays,
  type QueueDetail,
} from "@/lib/onboarding/queue-detail";
import type { KycDocDto, KycProfileDto } from "@/lib/types/kyc.types";

const TODAY = Date.parse("2026-08-27T00:00:00.000Z");

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

describe("summariseDetail", () => {
  it("maps each document to a verdict, in the order returned", () => {
    const detail = summariseDetail(
      profile({
        documents: [
          doc({ id: "a", status: "Approved" }),
          doc({ id: "b", status: "Pending" }),
          doc({ id: "c", status: "Rejected" }),
        ],
      }),
    );
    expect(detail.verdicts).toEqual(["approved", "pending", "rejected"]);
  });

  it("treats an unknown or absent status as pending, never as approved", () => {
    // Failing towards "still to decide" is the safe direction on a review queue.
    const detail = summariseDetail(
      profile({ documents: [doc({ status: null }), doc({ status: "Weird" })] }),
    );
    expect(detail.verdicts).toEqual(["pending", "pending"]);
  });

  it("stops drawing dots past the cap — the count beside them stays exact", () => {
    const documents = Array.from({ length: 20 }, (_, i) =>
      doc({ id: `d${i}`, status: "Approved" }),
    );
    expect(summariseDetail(profile({ documents })).verdicts).toHaveLength(MAX_DOTS);
  });

  it("takes the earliest upload as the submission, not the first in the array", () => {
    // The array's order is not promised to be chronological.
    const detail = summariseDetail(
      profile({
        documents: [
          doc({ id: "late", createdAt: "2026-08-25T10:00:00.000Z" }),
          doc({ id: "early", createdAt: "2026-08-20T10:00:00.000Z" }),
        ],
      }),
    );
    expect(detail.submittedAt).toBe("2026-08-20T10:00:00.000Z");
  });

  it("has no submission date when nothing has been uploaded", () => {
    expect(summariseDetail(profile()).submittedAt).toBeNull();
    expect(summariseDetail(profile({ documents: null })).verdicts).toEqual([]);
  });

  it("keeps a null company null — a natural person is not a gap", () => {
    expect(summariseDetail(profile()).company).toBeNull();
    expect(
      summariseDetail(profile({ company: { name: "  " } as never })).company,
    ).toBeNull();
    expect(
      summariseDetail(profile({ company: { name: "Vogel Immobilien GmbH" } as never }))
        .company,
    ).toBe("Vogel Immobilien GmbH");
  });
});

describe("waitingDays", () => {
  const detail = (submittedAt: string | null): QueueDetail => ({
    company: null,
    verdicts: [],
    submittedAt,
  });

  it("counts whole days since the earliest upload", () => {
    expect(waitingDays("Review", detail("2026-08-24T09:00:00.000Z"), TODAY)).toBe(3);
    expect(waitingDays("Review", detail("2026-08-18T23:59:00.000Z"), TODAY)).toBe(9);
  });

  it("floors both ends, so a row does not flip at the hour it arrived", () => {
    const morning = waitingDays("Review", detail("2026-08-26T01:00:00.000Z"), TODAY);
    const evening = waitingDays("Review", detail("2026-08-26T22:00:00.000Z"), TODAY);
    expect(morning).toBe(1);
    expect(evening).toBe(1);
  });

  it("is null on every stage that is not waiting", () => {
    // A decided submission has not waited no time — it has stopped waiting, and
    // the row is an em dash rather than a zero.
    for (const status of ["Approved", "Rejected", "Contract", "Active", "Kyc"] as const) {
      expect(waitingDays(status, detail("2026-08-20T00:00:00.000Z"), TODAY)).toBeNull();
    }
  });

  it("is null while the clock or the detail is still unknown", () => {
    expect(waitingDays("Review", detail("2026-08-24T09:00:00.000Z"), 0)).toBeNull();
    expect(waitingDays("Review", undefined, TODAY)).toBeNull();
    expect(waitingDays("Review", detail(null), TODAY)).toBeNull();
    expect(waitingDays("Review", detail("not-a-date"), TODAY)).toBeNull();
  });

  it("never goes negative on a clock skew", () => {
    expect(waitingDays("Review", detail("2027-01-01T00:00:00.000Z"), TODAY)).toBe(0);
  });
});

describe("subjectSide", () => {
  it("joins company and email once the detail has landed", () => {
    expect(
      subjectSide(
        { company: "Vogel Immobilien GmbH", verdicts: [], submittedAt: null },
        "k.vogel@vogel-immo.de",
        "Natural person",
      ),
    ).toBe("Vogel Immobilien GmbH · k.vogel@vogel-immo.de");
  });

  it("says Natural person when the detail says there is no company", () => {
    expect(
      subjectSide({ company: null, verdicts: [], submittedAt: null }, "t@gmx.de", "Natural person"),
    ).toBe("Natural person · t@gmx.de");
  });

  it("says nothing about the company while the read is still out", () => {
    // Guessing "Natural person" for a loading row would assert the one fact the
    // request exists to establish.
    expect(subjectSide(undefined, "t@gmx.de", "Natural person")).toBe("t@gmx.de");
    expect(subjectSide(undefined, null, "Natural person")).toBeNull();
  });
});
