import { describe, expect, it } from "vitest";
import {
  auditDetails,
  normalizeAction,
  parseAuditMetadata,
} from "@/lib/audit/metadata";

const TASK = "11111111-2222-3333-4444-555555555555";
const WORKER = "99999999-8888-7777-6666-555555555555";
const GROUP = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const SOURCE = "ffffffff-0000-1111-2222-333333333333";

/** A 113 row as `TaskService.AdminAssignAsync` writes it — both flags always present. */
function assigned(overrides: Record<string, unknown> = {}) {
  return {
    taskId: TASK,
    workerId: WORKER,
    scheduledDate: "2026-09-26",
    overrodeAvailability: false,
    overrodeLocation: false,
    ...overrides,
  };
}

describe("parseAuditMetadata", () => {
  it("returns null for null, empty and malformed JSON", () => {
    expect(parseAuditMetadata(null)).toBeNull();
    expect(parseAuditMetadata("")).toBeNull();
    expect(parseAuditMetadata("{not json")).toBeNull();
  });

  it("returns null for JSON that is not a plain object", () => {
    expect(parseAuditMetadata('"a string"')).toBeNull();
    expect(parseAuditMetadata("42")).toBeNull();
    expect(parseAuditMetadata("null")).toBeNull();
    expect(parseAuditMetadata("[1,2]")).toBeNull();
  });

  it("parses an object, including the `{}` a writer with no metadata leaves", () => {
    expect(parseAuditMetadata("{}")).toEqual({});
    expect(parseAuditMetadata('{"taskId":"x"}')).toEqual({ taskId: "x" });
  });
});

describe("normalizeAction", () => {
  it("makes the wire member name and the message key compare equal", () => {
    expect(normalizeAction("WorkerTaskAssigned")).toBe(
      normalizeAction("WORKER_TASK_ASSIGNED"),
    );
  });
});

describe("auditDetails — WorkerTaskAssigned (113)", () => {
  it("shows the day and a link to it, and no override chip when both flags are false", () => {
    expect(auditDetails("WorkerTaskAssigned", assigned())).toEqual([
      { kind: "date", key: "scheduledDate", value: "2026-09-26" },
      { kind: "link", key: "task", href: `/dashboard/tasks/day/${TASK}` },
    ]);
  });

  it("folds both overrides into ONE fact (one badge per row)", () => {
    const facts = auditDetails(
      "WorkerTaskAssigned",
      assigned({ overrodeAvailability: true, overrodeLocation: true }),
    );
    expect(facts.filter((f) => f.kind === "overrides")).toEqual([
      { kind: "overrides", keys: ["availability", "location"] },
    ]);
  });

  it("names only the override that happened", () => {
    expect(
      auditDetails("WorkerTaskAssigned", assigned({ overrodeLocation: true })),
    ).toContainEqual({ kind: "overrides", keys: ["location"] });
    expect(
      auditDetails("WorkerTaskAssigned", assigned({ overrodeAvailability: true })),
    ).toContainEqual({ kind: "overrides", keys: ["availability"] });
  });

  it("reads a flag only when it is exactly `true`", () => {
    const facts = auditDetails(
      "WorkerTaskAssigned",
      assigned({ overrodeAvailability: "true", overrodeLocation: 1 }),
    );
    expect(facts.some((f) => f.kind === "overrides")).toBe(false);
  });

  it("tolerates a row written before ·9b, with no overrodeLocation key", () => {
    const meta: Record<string, unknown> = assigned({ overrodeAvailability: true });
    delete meta.overrodeLocation;
    expect(auditDetails("WorkerTaskAssigned", meta)).toContainEqual({
      kind: "overrides",
      keys: ["availability"],
    });
  });

  it("matches the action case-insensitively, in either spelling", () => {
    const meta = assigned({ overrodeLocation: true });
    const wire = auditDetails("WorkerTaskAssigned", meta);
    expect(auditDetails("WORKER_TASK_ASSIGNED", meta)).toEqual(wire);
    expect(auditDetails("workertaskassigned", meta)).toEqual(wire);
  });

  it("drops a scheduledDate that is not a YYYY-MM-DD day", () => {
    const facts = auditDetails(
      "WorkerTaskAssigned",
      assigned({ scheduledDate: "2026-09-26T00:00:00Z" }),
    );
    expect(facts.some((f) => f.kind === "date")).toBe(false);
  });

  it("escapes the id it builds a link from", () => {
    expect(
      auditDetails("WorkerTaskAssigned", assigned({ taskId: "a/b?c" })),
    ).toContainEqual({ kind: "link", key: "task", href: "/dashboard/tasks/day/a%2Fb%3Fc" });
  });
});

describe("auditDetails — TaskGroupCreatedByAdmin (65)", () => {
  const created = {
    taskGroupId: GROUP,
    propertyId: "p",
    ownerUserId: "o",
    clonedFromTaskGroupId: null,
  };

  it("links the new order and nothing else on an ordinary create (clone key is null)", () => {
    expect(auditDetails("TaskGroupCreatedByAdmin", created)).toEqual([
      { kind: "link", key: "taskGroup", href: `/dashboard/tasks/${GROUP}` },
    ]);
  });

  it("links the source order on a clone", () => {
    expect(
      auditDetails("TaskGroupCreatedByAdmin", {
        ...created,
        clonedFromTaskGroupId: SOURCE,
      }),
    ).toEqual([
      { kind: "link", key: "taskGroup", href: `/dashboard/tasks/${GROUP}` },
      { kind: "link", key: "clonedFrom", href: `/dashboard/tasks/${SOURCE}` },
    ]);
  });

  it("ignores a blank or non-string clone source", () => {
    for (const v of ["", "  ", 5, {}]) {
      expect(
        auditDetails("TaskGroupCreatedByAdmin", { ...created, clonedFromTaskGroupId: v }),
      ).toHaveLength(1);
    }
  });
});

describe("auditDetails — anything else", () => {
  it("returns nothing for an action it does not know", () => {
    expect(auditDetails("RolePermissionAdded", { permission: "x" })).toEqual([]);
  });

  it("returns nothing when there is no metadata", () => {
    expect(auditDetails("WorkerTaskAssigned", null)).toEqual([]);
    expect(auditDetails("TaskGroupCreatedByAdmin", {})).toEqual([]);
  });
});
