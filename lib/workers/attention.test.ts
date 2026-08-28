import { describe, expect, it } from "vitest";
import {
  deriveWorkerAttention,
  type WorkerAttentionCopy,
  type WorkerAttentionInput,
} from "@/lib/workers/attention";
import type { WorkerShift } from "@/hooks/use-worker-shifts";
import type { SubjectCover } from "@/lib/onboarding/subject-row";
import type { OnboardingStatus } from "@/lib/types/onboarding.types";
import type { WorkerDetailDto, WorkerDocumentDto } from "@/lib/types/worker.types";

const TODAY = Date.parse("2026-08-25T00:00:00.000Z");

/**
 * Every message renders as `key:{args}` so a case can assert which one fired and
 * with what — including the composition the ICU form used to get wrong.
 */
const COPY = new Proxy({} as WorkerAttentionCopy, {
  get:
    (_t, key: string) =>
    (args?: Record<string, unknown>) =>
      args ? `${key}:${JSON.stringify(args)}` : key,
});

function worker(over: Partial<WorkerDetailDto> = {}): WorkerDetailDto {
  return {
    id: "worker-1",
    fullName: "Sardor Aliyev",
    email: "s.aliyev@mail.de",
    phoneNumber: "+49 176 2244 018",
    employeeType: "FullTime",
    age: 31,
    address: "Berlin-Mitte",
    gender: "Male",
    experience: 3,
    onboardingStatus: "Active",
    onboardingRejectReason: null,
    onboardingReviewedAt: null,
    isVerified: true,
    rating: 4.8,
    profilePictureUrl: null,
    professions: null,
    documents: null,
    identity: {
      firstName: "Sardor",
      lastName: "Aliyev",
      passportNumber: "AA4182276",
      passportExpiry: null,
      licenseExpiry: null,
    },
    ...over,
  };
}

function papers(over: { licence?: string | null; passport?: string | null }) {
  return worker({
    identity: {
      firstName: "Sardor",
      lastName: "Aliyev",
      passportNumber: "AA4182276",
      passportExpiry: over.passport ?? null,
      licenseExpiry: over.licence ?? null,
    },
  });
}

function doc(over: Partial<WorkerDocumentDto> = {}): WorkerDocumentDto {
  return {
    id: "d",
    type: "Passport",
    fileName: "passport.pdf",
    fileUrl: "passport.pdf",
    status: "Pending",
    rejectReason: null,
    reviewedAt: null,
    reviewedByAdminId: null,
    createdAt: "2026-08-19T09:00:00.000Z",
    ...over,
  };
}

function shift(state: WorkerShift["state"], propertyName = "Torstraße 88"): WorkerShift {
  return {
    taskId: `t-${state}-${propertyName}`,
    propertyId: "p",
    propertyName,
    scheduledDate: "2026-08-25",
    scheduledAt: "2026-08-25T14:00:00",
    status: "Pending",
    state,
    checkinAt: null,
    checkoutAt: null,
    lateBy: null,
  };
}

function cover(over: Partial<SubjectCover> = {}): SubjectCover {
  return { from: "2026-01-01", to: "2026-12-31", phase: "InForce", ...over };
}

function derive(
  over: {
    worker?: WorkerDetailDto;
    documents?: Partial<WorkerAttentionInput["documents"]>;
    contract?: Partial<WorkerAttentionInput["contract"]>;
    week?: Partial<WorkerAttentionInput["week"]>;
  } = {},
) {
  return deriveWorkerAttention({
    worker: over.worker ?? worker(),
    documents: { docs: [], canRead: true, isPending: false, ...over.documents },
    contract: {
      cover: cover(),
      canRead: true,
      isPending: false,
      error: null,
      ...over.contract,
    },
    week: {
      shifts: [],
      canRead: true,
      isPending: false,
      isError: false,
      ...over.week,
    },
    today: TODAY,
    copy: COPY,
  });
}

describe("deriveWorkerAttention", () => {
  it("always reports four sources, whatever they say", () => {
    // The strip's count is honest only if a quiet source still occupies a slot.
    expect(derive().sources).toHaveLength(4);
  });

  it("is pending while any gate is still unresolved", () => {
    expect(derive({ documents: { canRead: null } }).isPending).toBe(true);
    expect(derive({ week: { canRead: null } }).isPending).toBe(true);
    expect(derive({ contract: { canRead: null } }).isPending).toBe(true);
    expect(derive().isPending).toBe(false);
  });

  describe("papers", () => {
    it("says nothing when no expiry is on file — absent is not expired", () => {
      expect(derive().sources[0].state).toBe("clear");
    });

    it("says nothing about a licence that is comfortably in date", () => {
      expect(derive({ worker: papers({ licence: "2027-06-01" }) }).sources[0].state).toBe(
        "clear",
      );
    });

    it("is red inside the warn window, not amber — a lapse unfills every shift", () => {
      const [source] = derive({ worker: papers({ licence: "2026-09-03" }) }).sources;
      expect(source).toMatchObject({
        state: "flag",
        tone: "critical",
        blocking: false,
        title: 'papersTitle:{"document":"licence","days":9}',
      });
    });

    it("blocks once the paper has actually lapsed", () => {
      const [source] = derive({ worker: papers({ licence: "2026-08-20" }) }).sources;
      expect(source).toMatchObject({
        state: "flag",
        blocking: true,
        title: 'papersLapsedTitle:{"document":"licence","days":5}',
      });
    });

    it("reports whichever paper runs out first", () => {
      const [source] = derive({
        worker: papers({ licence: "2026-09-20", passport: "2026-09-01" }),
      }).sources;
      expect(source).toMatchObject({
        title: 'papersTitle:{"document":"passport","days":7}',
      });
    });
  });

  describe("documents", () => {
    it("reports a refused read as unknown, never as none", () => {
      const [, docs] = derive({ documents: { canRead: false } }).sources;
      expect(docs).toMatchObject({ state: "unknown", id: "docs" });
    });

    it("counts only undecided documents, and states the longest wait", () => {
      const [, docs] = derive({
        documents: {
          docs: [
            doc({ id: "old", createdAt: "2026-08-19T09:00:00.000Z" }),
            doc({ id: "new", createdAt: "2026-08-24T09:00:00.000Z" }),
            doc({ id: "approved", status: "Approved" }),
            doc({ id: "rejected", status: "Rejected" }),
          ],
        },
      }).sources;

      expect(docs).toMatchObject({
        state: "flag",
        tone: "warning",
        title: 'docsTitle:{"count":2}',
        detail: 'docsDetail:{"days":6}',
      });
    });

    it("sends the verb to the card on this page, not to another route", () => {
      const [, docs] = derive({ documents: { docs: [doc()] } }).sources;
      expect(docs).toMatchObject({ action: { href: "#worker-documents" } });
    });
  });

  describe("contract cover", () => {
    it("reports a refused or failed read as unknown", () => {
      expect(derive({ contract: { canRead: false } }).sources[2].state).toBe("unknown");
      expect(derive({ contract: { error: new Error("boom") } }).sources[2].state).toBe(
        "unknown",
      );
    });

    it("stays quiet about a worker whose turn it is not yet", () => {
      // No contract at Kyc / Review / Rejected is the normal shape, not a finding.
      for (const status of ["Kyc", "Review", "Rejected"] as OnboardingStatus[]) {
        const { sources } = derive({
          worker: worker({ onboardingStatus: status }),
          contract: { cover: null },
        });
        expect(sources[2].state).toBe("clear");
      }
    });

    it("flags a decided worker who still has no contract", () => {
      // Approval alone does not make a worker assignable.
      const [, , contract] = derive({
        worker: worker({ onboardingStatus: "Approved" }),
        contract: { cover: null },
      }).sources;
      expect(contract).toMatchObject({ state: "flag", title: "coverNoneTitle" });
    });

    it("blocks on a period that has ended and warns on one about to", () => {
      const [, , expired] = derive({
        contract: { cover: cover({ phase: "Expired", to: "2026-08-01" }) },
      }).sources;
      expect(expired).toMatchObject({ tone: "critical", blocking: true });

      const [, , ending] = derive({
        contract: { cover: cover({ to: "2026-09-10" }) },
      }).sources;
      expect(ending).toMatchObject({
        tone: "warning",
        title: 'coverEndingTitle:{"days":16}',
      });

      expect(derive().sources[2].state).toBe("clear");
    });
  });

  describe("the week", () => {
    it("reports an unreadable week as unknown", () => {
      expect(derive({ week: { canRead: false } }).sources[3].state).toBe("unknown");
      expect(derive({ week: { isError: true } }).sources[3].state).toBe("unknown");
    });

    it("says nothing about a week nobody was late in", () => {
      const { sources } = derive({
        week: { shifts: [shift("onTime"), shift("scheduled")] },
      });
      expect(sources[3].state).toBe("clear");
    });

    it("names only the half that happened — no dangling separator", () => {
      // The bug this replaced: one message with three ICU blocks rendered
      // "1 missed shift, " whenever the other count was zero.
      const [, , , lateOnly] = derive({
        week: { shifts: [shift("late"), shift("late")] },
      }).sources;
      expect(lateOnly).toMatchObject({
        tone: "warning",
        title: 'weekLate:{"count":2}',
      });

      const [, , , missedOnly] = derive({ week: { shifts: [shift("missed")] } }).sources;
      expect(missedOnly).toMatchObject({
        tone: "critical",
        title: 'weekMissed:{"count":1}',
      });
    });

    it("joins the two halves when both happened, missed first", () => {
      const [, , , both] = derive({
        week: { shifts: [shift("late"), shift("missed")] },
      }).sources;
      expect(both).toMatchObject({
        title: 'weekMissed:{"count":1}, weekLate:{"count":1}',
      });
    });

    it("names a site rather than leaving the detail bare", () => {
      const [, , , source] = derive({
        week: { shifts: [shift("late", "Kastanienallee 12")] },
      }).sources;
      expect(source).toMatchObject({
        detail: 'weekDetail:{"where":"Kastanienallee 12"}',
      });
    });
  });

  it("orders the chips critical-first once summarised", () => {
    // The derivation lists papers → docs → cover → week; the strip re-sorts by
    // tone, and only the tone ordering is guaranteed.
    const { sources } = derive({
      worker: papers({ licence: "2026-08-20" }),
      documents: { docs: [doc()] },
    });
    expect(sources.map((s) => s.state)).toEqual(["flag", "flag", "clear", "clear"]);
  });
});
