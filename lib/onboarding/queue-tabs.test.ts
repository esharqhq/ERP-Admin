import { describe, expect, it } from "vitest";
import {
  QUEUE_TABS,
  countByTab,
  inTab,
  statusForTab,
} from "@/lib/onboarding/queue-tabs";
import type { OnboardingStatus } from "@/lib/types/onboarding.types";

const rows = (...statuses: OnboardingStatus[]) =>
  statuses.map((onboardingStatus) => ({ onboardingStatus }));

describe("statusForTab", () => {
  it("maps every tab to its stage, and All to no stage", () => {
    expect(statusForTab("all")).toBeUndefined();
    expect(statusForTab("review")).toBe("Review");
    expect(statusForTab("contract")).toBe("Contract");
  });

  it("is undefined for a tab that does not exist", () => {
    expect(statusForTab("waiting")).toBeUndefined();
  });

  it("names the stages on both sides identically — Approved is one queue", () => {
    // The defect this prevents: "Approved" filtering `Active` on one screen and
    // `Approved` on the other.
    expect(QUEUE_TABS.find((t) => t.key === "approved")?.status).toBe("Approved");
    expect(QUEUE_TABS.find((t) => t.key === "active")?.status).toBe("Active");
  });
});

describe("inTab", () => {
  it("keeps everything on All", () => {
    expect(inTab("Rejected", "all")).toBe(true);
    expect(inTab("Active", "all")).toBe(true);
  });

  it("keeps only the matching stage on a stage tab", () => {
    expect(inTab("Review", "review")).toBe(true);
    expect(inTab("Approved", "review")).toBe(false);
  });

  it("shows everything for an unknown tab rather than nothing", () => {
    // A stale `?tab=` in a shared link must degrade to the full list, not to an
    // empty table that reads as "nobody has submitted".
    expect(inTab("Review", "nonsense")).toBe(true);
  });
});

describe("countByTab", () => {
  it("counts each stage and totals them under All", () => {
    const counts = countByTab(
      rows("Review", "Review", "Approved", "Rejected", "Active", "Contract"),
    );
    expect(counts).toMatchObject({
      all: 6,
      review: 2,
      approved: 1,
      contract: 1,
      active: 1,
      rejected: 1,
    });
  });

  it("gives every tab a zero rather than leaving it absent", () => {
    // A tab with no key at all would render no count; a `0` is a real statement
    // that the queue is clear, and that is what an admin wants to see.
    const counts = countByTab([]);
    for (const { key } of QUEUE_TABS) expect(counts[key]).toBe(0);
  });

  it("does not count a stage that has no tab", () => {
    // `Kyc` has no tab — they have not submitted anything, so they are not in a
    // review queue. It still counts towards All, which is the whole list.
    const counts = countByTab(rows("Kyc", "Kyc", "Review"));
    expect(counts.all).toBe(3);
    expect(counts.review).toBe(1);
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(3 + 1);
  });
});
