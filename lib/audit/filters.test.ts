import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import de from "@/messages/de.json";
import {
  AUDIT_FILTER_ACTIONS,
  AUDIT_LABELLED_ACTIONS,
  AUDIT_ROW_CAP,
  buildAuditQuery,
  hasAuditFilter,
  isCapped,
  toActionMember,
} from "@/lib/audit/filters";

/**
 * `AuditAction`'s member names as the backend declares them
 * (`AdminController.cs:242-268` binds `action` to this enum by name). Frozen here
 * so a typo in the offered list fails a test instead of a live `400`.
 */
const MEMBERS = new Set([
  "AdminCreated", "AdminModified", "AdminDeactivated", "AdminRoleChanged",
  "KycApproved", "KycRejected", "OwnerKycResetToPending", "OnboardingRevertedToKyc",
  "OnboardingExpiryWarned", "OwnerKycDocApproved", "OwnerKycDocRejected",
  "WorkerApproved", "WorkerRejected", "WorkerDeactivated", "WorkerDocApproved",
  "WorkerDocRejected", "OwnerDeactivated", "WorkerDocApprovedRemoved",
  "OwnerProfileModified", "WorkerProfileModified", "WorkerAvailabilityModified",
  "PropertyDeactivatedByAdmin", "PropertyRestored", "PropertyDocsApproved",
  "PropertyDocsRejected", "PropertyDocsResetToPending", "PropertyCreatedByAdmin",
  "RolePermissionAdded", "RolePermissionRemoved", "RoleDeleted",
  "WorkerContractForceDeactivated", "OwnerContractForceDeactivated", "ContractSent",
  "ContractSigned", "ContractRecalled", "ContractRejected", "WorkerTaskRated",
  "WorkerTaskOutcomeOverridden", "WorkerTaskUnassigned", "TaskCancelled",
  "TaskGroupCancelled", "TaskGroupCreatedByAdmin", "WorkerLeaveRequestApproved",
  "WorkerLeaveRequestRejected", "PropertyCategoryCreated", "PropertyCategoryUpdated",
  "CountryCreated", "CountryUpdated", "CityCreated", "CityUpdated",
  "ProfessionCreated", "ProfessionUpdated", "OwnerTableExported", "WorkerTableExported",
  "AgencyCreated", "AgencyDeleted", "AgencyLinkAttached", "AgencyLinkConfirmed",
  "AgencyLinkRejected", "AgencyApplicationApproved", "AgencyApplicationRejected",
  "AgencyApplicationInfoRequested", "AgencyUpdated", "WorkerProfessionRequestApproved",
  "WorkerProfessionRequestRejected", "WorkerProfessionRequestInfoRequested",
  "WorkerProfessionRevoked", "WorkerBlocked", "WorkerUnblocked", "BroadcastCreated",
  "BroadcastUpdated", "BroadcastCancelled", "BroadcastAudienceResolved",
  "WorkerRestored", "OwnerRestored", "WorkerTaskAssigned", "TaskSupervisorReassigned",
  "TaskSupervisorOverridden", "TaskSupervisorHandoverNominated",
  "TaskSupervisorHandoverAccepted", "TaskAutoCancelled", "TaskAutoAccepted",
  "TaskForceClosed", "TaskComplaintDecided", "TaskComplaintEscalated",
]);

/** The local calendar parts and clock of an ISO instant — TZ-independent to assert on. */
function local(iso: string) {
  const d = new Date(iso);
  return {
    day: [d.getFullYear(), d.getMonth() + 1, d.getDate()],
    time: [d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()],
  };
}

describe("toActionMember", () => {
  it("turns the UPPER_SNAKE message key into the C# member name", () => {
    expect(toActionMember("KYC_APPROVED")).toBe("KycApproved");
    expect(toActionMember("OWNER_KYC_RESET_TO_PENDING")).toBe("OwnerKycResetToPending");
    expect(toActionMember("WORKER_TASK_ASSIGNED")).toBe("WorkerTaskAssigned");
    expect(toActionMember("TASK_GROUP_CREATED_BY_ADMIN")).toBe("TaskGroupCreatedByAdmin");
  });

  it("handles a single word", () => {
    expect(toActionMember("CREATED")).toBe("Created");
  });
});

describe("the offered actions", () => {
  it("each converts to a member the backend enum actually has", () => {
    for (const action of AUDIT_FILTER_ACTIONS) {
      expect(MEMBERS, action).toContain(toActionMember(action));
    }
  });

  it("does not offer the property-docs verdicts, whose admin routes were deleted", () => {
    expect(AUDIT_FILTER_ACTIONS).not.toContain("PROPERTY_DOCS_APPROVED");
    expect(AUDIT_FILTER_ACTIONS).not.toContain("PROPERTY_DOCS_REJECTED");
  });

  it("still labels them, because old rows carrying them stay in the history", () => {
    expect(AUDIT_LABELLED_ACTIONS).toContain("PROPERTY_DOCS_APPROVED");
    expect(AUDIT_LABELLED_ACTIONS).toContain("PROPERTY_DOCS_REJECTED");
  });

  it("has a label in both languages for every labelled action", () => {
    for (const action of AUDIT_LABELLED_ACTIONS) {
      expect(en.audit.actions, action).toHaveProperty(action);
      expect(de.audit.actions, action).toHaveProperty(action);
    }
  });
});

describe("buildAuditQuery", () => {
  it("sends nothing when no filter is set", () => {
    expect(buildAuditQuery({ action: "all", from: "", to: "" })).toEqual({});
    expect(buildAuditQuery({ action: "", from: "", to: "" })).toEqual({});
  });

  it("sends the action as its member name, never the message key", () => {
    expect(buildAuditQuery({ action: "KYC_APPROVED", from: "", to: "" })).toEqual({
      action: "KycApproved",
    });
  });

  it("sends the start of the first local day and the last millisecond of the last", () => {
    const q = buildAuditQuery({ action: "all", from: "2026-09-01", to: "2026-09-26" });
    expect(Object.keys(q).sort()).toEqual(["fromUtc", "toUtc"]);
    expect(local(q.fromUtc!)).toEqual({ day: [2026, 9, 1], time: [0, 0, 0, 0] });
    expect(local(q.toUtc!)).toEqual({ day: [2026, 9, 26], time: [23, 59, 59, 999] });
    // Instants, so the server compares them against `CreatedAt` (UTC) directly.
    expect(q.fromUtc).toMatch(/Z$/);
    expect(q.toUtc).toMatch(/Z$/);
  });

  it("sends an open bound on its own", () => {
    const from = buildAuditQuery({ action: "all", from: "2026-02-28", to: "" });
    expect(Object.keys(from)).toEqual(["fromUtc"]);
    expect(local(from.fromUtc!).day).toEqual([2026, 2, 28]);

    const to = buildAuditQuery({ action: "all", from: "", to: "2026-12-31" });
    expect(Object.keys(to)).toEqual(["toUtc"]);
    expect(local(to.toUtc!)).toEqual({ day: [2026, 12, 31], time: [23, 59, 59, 999] });
  });

  it("combines the action and the range", () => {
    const q = buildAuditQuery({
      action: "WORKER_TASK_ASSIGNED",
      from: "2026-09-20",
      to: "2026-09-20",
    });
    expect(q.action).toBe("WorkerTaskAssigned");
    expect(local(q.fromUtc!).day).toEqual([2026, 9, 20]);
    expect(local(q.toUtc!).day).toEqual([2026, 9, 20]);
  });

  it("ignores a malformed day rather than sending an Invalid Date", () => {
    expect(buildAuditQuery({ action: "all", from: "2026-9-1", to: "nope" })).toEqual({});
  });
});

describe("hasAuditFilter", () => {
  it("is false only when neither the action nor a bound is set", () => {
    expect(hasAuditFilter({ action: "all", from: "", to: "" })).toBe(false);
    expect(hasAuditFilter({ action: "", from: "", to: "" })).toBe(false);
    expect(hasAuditFilter({ action: "KYC_APPROVED", from: "", to: "" })).toBe(true);
    expect(hasAuditFilter({ action: "all", from: "2026-09-01", to: "" })).toBe(true);
    expect(hasAuditFilter({ action: "all", from: "", to: "2026-09-01" })).toBe(true);
  });
});

describe("isCapped", () => {
  const rows = (n: number) => Array.from({ length: n }, (_, i) => i);

  it("is the server's 200-row ceiling", () => {
    expect(AUDIT_ROW_CAP).toBe(200);
  });

  it("is true once the response fills the cap — older rows may exist", () => {
    expect(isCapped(rows(200))).toBe(true);
    expect(isCapped(rows(201))).toBe(true);
  });

  it("is false below it — that is everything there is", () => {
    expect(isCapped(rows(199))).toBe(false);
    expect(isCapped([])).toBe(false);
  });
});
