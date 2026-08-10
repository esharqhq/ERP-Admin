import { describe, expect, it } from "vitest";
import {
  coverPresentation,
  indexCover,
  ownerContractSubjectId,
  withCover,
  type SubjectCover,
  type SubjectRow,
} from "@/lib/onboarding/subject-row";
import type { AdminOwnerContractDto } from "@/lib/types/contract.types";

const DAY = 86_400_000;
/** 2026-08-07T00:00:00Z, as a day-start — the shape `useToday()` produces. */
const TODAY = Date.parse("2026-08-07T00:00:00.000Z");

function cover(from: string, to: string, phase: SubjectCover["phase"]): SubjectCover {
  return { from, to, phase };
}
/** ISO instant `n` days from TODAY, at an awkward hour to prove hours are ignored. */
function iso(days: number, hour = 13): string {
  return new Date(TODAY + days * DAY + hour * 3_600_000).toISOString();
}

describe("coverPresentation — day arithmetic", () => {
  it("reports 0 days until start for a period beginning today", () => {
    const c = coverPresentation(cover(iso(0), iso(30), "InForce"), TODAY);
    expect(c.daysUntilStart).toBe(0);
  });

  it("counts whole days to the end date, ignoring the hour", () => {
    expect(coverPresentation(cover(iso(-10), iso(4), "InForce"), TODAY).daysLeft).toBe(4);
    expect(coverPresentation(cover(iso(-10), iso(23), "InForce"), TODAY).daysLeft).toBe(23);
  });

  it("reports a future start in whole days", () => {
    const c = coverPresentation(cover(iso(14), iso(400), "Scheduled"), TODAY);
    expect(c.daysUntilStart).toBe(14);
  });

  it("returns a negative daysLeft once the end date has passed", () => {
    expect(coverPresentation(cover(iso(-90), iso(-3), "Expired"), TODAY).daysLeft).toBe(-3);
  });
});

describe("coverPresentation — tone", () => {
  it("keeps Terminated muted: ended early is a recorded outcome, not an alarm", () => {
    expect(coverPresentation(cover(iso(-30), iso(10), "Terminated"), TODAY).tone).toBe("muted");
  });

  it("marks a real expiry critical", () => {
    expect(coverPresentation(cover(iso(-90), iso(-1), "Expired"), TODAY).tone).toBe("critical");
    expect(coverPresentation(cover(iso(-90), iso(-1), "Lapsed"), TODAY).tone).toBe("critical");
  });

  it("warns inside 30 days and escalates inside 7", () => {
    expect(coverPresentation(cover(iso(-10), iso(20), "InForce"), TODAY).tone).toBe("warning");
    expect(coverPresentation(cover(iso(-10), iso(5), "InForce"), TODAY).tone).toBe("critical");
    expect(coverPresentation(cover(iso(-10), iso(200), "InForce"), TODAY).tone).toBe("muted");
  });

  it("keeps an unsigned draft or sent contract muted and flagged pending", () => {
    const c = coverPresentation(cover(iso(2), iso(400), "Sent"), TODAY);
    expect(c.tone).toBe("muted");
    expect(c.pending).toBe(true);
  });
});

describe("coverPresentation — annotate", () => {
  it("leaves a quiet in-force row unannotated", () => {
    expect(coverPresentation(cover(iso(-10), iso(200), "InForce"), TODAY).annotate).toBe(false);
  });

  it("annotates a row that does not cover today even though both dates look innocent", () => {
    expect(coverPresentation(cover(iso(14), iso(400), "Scheduled"), TODAY).annotate).toBe(true);
  });
});

describe("indexCover — which contract governs", () => {
  function row(id: string, phase: SubjectCover["phase"], from: number, to: number) {
    return {
      ownerProfileId: id,
      eligibleFrom: iso(from),
      eligibleTo: iso(to),
      phase,
    } as unknown as AdminOwnerContractDto;
  }

  it("prefers the in-force row over a scheduled renewal", () => {
    const map = indexCover(
      [row("a", "Scheduled", 30, 400), row("a", "InForce", -300, 29)],
      ownerContractSubjectId,
    );
    expect(map.get("a")?.phase).toBe("InForce");
  });

  it("breaks a same-phase tie on the later end date", () => {
    const map = indexCover(
      [row("b", "Expired", -800, -400), row("b", "Expired", -300, -20)],
      ownerContractSubjectId,
    );
    expect(map.get("b")?.to).toBe(iso(-20));
  });

  it("still surfaces a subject whose only contract has ended", () => {
    const map = indexCover([row("c", "Expired", -400, -30)], ownerContractSubjectId);
    expect(map.get("c")?.phase).toBe("Expired");
  });
});

describe("withCover", () => {
  const base: SubjectRow = {
    id: "a",
    fullName: "Hans Müller",
    email: "hans@example.de",
    avatarUrl: null,
    onboardingStatus: "Active",
    cover: null,
  };

  it("attaches a cover when one exists and null when none does", () => {
    const map = new Map([["a", cover(iso(-10), iso(20), "InForce")]]);
    const [withIt, without] = withCover([base, { ...base, id: "z" }], map);
    expect(withIt.cover?.phase).toBe("InForce");
    expect(without.cover).toBeNull();
  });
});
