import { describe, expect, it } from "vitest";
import {
  deriveOwnerAttention,
  type OwnerAttentionCopy,
} from "@/lib/owners/attention";
import type { KycDocDto } from "@/lib/types/kyc.types";
import type { SubjectCover } from "@/lib/onboarding/subject-row";
import type {
  TaskGroupDto,
  TaskItemDto,
  TaskWorkerDto,
} from "@/lib/types/task.types";

const TODAY = Date.parse("2026-08-25T00:00:00.000Z");
const TODAY_KEY = "2026-08-25";

/** Every message renders as `key(args)` so a test can assert which one fired. */
const COPY = new Proxy({} as OwnerAttentionCopy, {
  get: (_t, key: string) => (args?: Record<string, unknown>) =>
    args ? `${key}:${JSON.stringify(args)}` : key,
});

function worker(over: Partial<TaskWorkerDto> = {}): TaskWorkerDto {
  return {
    id: "tw",
    taskId: "t",
    workerId: "w",
    workerName: "Sardor",
    outcome: "Assigned",
    starRating: null,
    assignedAt: "2026-08-20T09:00:00",
    checkinAt: null,
    submittedAt: null,
    checkoutAt: null,
    checkinLat: null,
    checkinLng: null,
    ...over,
  };
}

function task(over: Partial<TaskItemDto> = {}): TaskItemDto {
  return {
    id: "t",
    groupId: "g",
    propertyId: "p",
    propertyName: "Torstraße 88",
    scheduledDate: TODAY_KEY,
    scheduledAt: `${TODAY_KEY}T17:00:00`,
    deadline: null,
    status: "Pending",
    requiredWorkerCount: 1,
    startedAt: null,
    completedAt: null,
    workers: [],
    ...over,
  };
}

function group(tasks: TaskItemDto[], status = "Pending"): TaskGroupDto {
  return {
    id: "g",
    propertyId: "p",
    ownerId: "o",
    title: "Treppenhaus",
    defaultStartTime: "17:00:00",
    defaultDeadline: null,
    instructions: null,
    status,
    ratingFloor: 0,
    allowNewWorkers: true,
    eligibleProfessionIds: [],
    dates: [],
    tasks,
    createdAt: "2026-08-01T00:00:00",
  };
}

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
    createdAt: "2026-08-21T09:00:00.000Z",
    ...over,
  };
}

function cover(over: Partial<SubjectCover> = {}): SubjectCover {
  return { from: "2025-10-01", to: "2026-09-28", phase: "InForce", ...over };
}

function derive(
  over: {
    groups?: TaskGroupDto[];
    kyc?: Partial<Parameters<typeof deriveOwnerAttention>[0]["kyc"]>;
    contract?: Partial<Parameters<typeof deriveOwnerAttention>[0]["contract"]>;
    todayKey?: string;
  } = {},
) {
  return deriveOwnerAttention({
    groups: over.groups ?? [],
    groupsPending: false,
    kyc: {
      read: "visible",
      ownerProfileId: "profile-1",
      documents: [],
      isPending: false,
      ...over.kyc,
    },
    contract: {
      cover: null,
      canRead: true,
      isPending: false,
      error: null,
      ...over.contract,
    },
    today: TODAY,
    todayKey: over.todayKey ?? TODAY_KEY,
    copy: COPY,
  });
}

describe("deriveOwnerAttention", () => {
  it("always reports three sources, whatever they say", () => {
    // The strip's count is honest only if a quiet source still occupies a slot.
    expect(derive().sources).toHaveLength(3);
  });

  it("flags an unstaffed shift inside the horizon", () => {
    const { sources } = derive({ groups: [group([task()])] });
    const [unstaffed] = sources;

    expect(unstaffed.state).toBe("flag");
    expect(unstaffed).toMatchObject({ tone: "critical", blocking: true });
  });

  it("does not flag a shift that already has the workers it needs", () => {
    const staffed = task({ requiredWorkerCount: 1, workers: [worker()] });
    expect(derive({ groups: [group([staffed])] }).sources[0].state).toBe(
      "clear",
    );
  });

  it("counts a worker who was removed as a missing body", () => {
    const vacated = task({
      requiredWorkerCount: 1,
      workers: [worker({ outcome: "Removed" })],
    });
    expect(derive({ groups: [group([vacated])] }).sources[0].state).toBe(
      "flag",
    );
  });

  it("ignores shifts in the past — nobody can be assigned to them now", () => {
    const past = task({
      scheduledDate: "2026-08-24",
      scheduledAt: "2026-08-24T17:00:00",
    });
    expect(derive({ groups: [group([past])] }).sources[0].state).toBe("clear");
  });

  it("ignores shifts beyond the week ahead", () => {
    const far = task({
      scheduledDate: "2026-09-20",
      scheduledAt: "2026-09-20T17:00:00",
    });
    expect(derive({ groups: [group([far])] }).sources[0].state).toBe("clear");
  });

  it("ignores tasks in a cancelled group", () => {
    expect(
      derive({ groups: [group([task()], "Cancelled")] }).sources[0].state,
    ).toBe("clear");
  });

  it("says nothing about staffing before the clock is known", () => {
    expect(
      derive({ groups: [group([task()])], todayKey: "" }).sources[0].state,
    ).toBe("clear");
  });

  it("reports refused documents as unknown, never as none", () => {
    const [, docs] = derive({ kyc: { read: "forbidden" } }).sources;
    expect(docs.state).toBe("unknown");
  });

  it("treats a missing profile as a fact about the owner, not a refusal", () => {
    // They never started KYC. Nothing is waiting on an admin.
    const [, docs] = derive({
      kyc: { read: "absent", ownerProfileId: null },
    }).sources;
    expect(docs.state).toBe("clear");
  });

  it("flags pending documents with how long the oldest has waited", () => {
    const [, docs] = derive({
      kyc: {
        documents: [
          doc({ id: "old", createdAt: "2026-08-21T09:00:00.000Z" }),
          doc({ id: "new", createdAt: "2026-08-24T09:00:00.000Z" }),
          doc({ id: "done", status: "Approved" }),
        ],
      },
    }).sources;

    expect(docs).toMatchObject({
      state: "flag",
      title: 'docsTitle:{"count":2}',
      detail: 'docsDetail:{"days":4}',
    });
  });

  it("points the document verb at this owner's review workspace", () => {
    const [, docs] = derive({ kyc: { documents: [doc()] } }).sources;
    expect(docs).toMatchObject({
      action: { href: "/dashboard/owner-documents/profile-1" },
    });
  });

  it("reports a refused contract read as unknown", () => {
    const [, , contract] = derive({ contract: { canRead: false } }).sources;
    expect(contract.state).toBe("unknown");
  });

  it("reports a failed contract read as unknown too", () => {
    const [, , contract] = derive({
      contract: { error: new Error("boom") },
    }).sources;
    expect(contract.state).toBe("unknown");
  });

  it("stays quiet about an owner who has no contract at all", () => {
    // The band's contract cell states it in words; the strip is for what is
    // waiting, and a pre-contract owner is not waiting on anybody.
    const [, , contract] = derive({ contract: { cover: null } }).sources;
    expect(contract.state).toBe("clear");
  });

  it("blocks on an expired period and warns on one about to end", () => {
    const [, , expired] = derive({
      contract: { cover: cover({ phase: "Expired", to: "2026-08-01" }) },
    }).sources;
    expect(expired).toMatchObject({
      state: "flag",
      tone: "critical",
      blocking: true,
    });

    const [, , ending] = derive({
      contract: { cover: cover({ to: "2026-09-10" }) },
    }).sources;
    expect(ending).toMatchObject({ state: "flag", tone: "warning" });

    const [, , healthy] = derive({
      contract: { cover: cover({ to: "2027-09-10" }) },
    }).sources;
    expect(healthy.state).toBe("clear");
  });
});
