import { describe, expect, it } from "vitest";
import { AxiosError } from "axios";
import {
  DECIDE_REFETCH,
  complaintState,
  decideErrorKind,
} from "@/lib/complaints/decision";
import type { TaskComplaintDto } from "@/lib/types/task.types";

function axiosErr(status: number, data: unknown): AxiosError {
  const e = new AxiosError("boom");
  // @ts-expect-error minimal shape is all the parser reads
  e.response = { status, data };
  return e;
}

function complaint(decision: string): TaskComplaintDto {
  return {
    id: "c-1", taskId: "t-1", raisedByOwnerUserId: "o-1", reason: "Dirty",
    raisedAt: "2026-09-23T10:00:00Z", decision, decidedByAdminId: null,
    decidedAt: null, decisionNote: null, supportTicketId: null, photos: [],
  };
}

describe("complaintState", () => {
  it("is open while the decision is Open", () => {
    expect(complaintState(complaint("Open"))).toBe("open");
  });

  it("is decided for either side", () => {
    expect(complaintState(complaint("SidedWithOwner"))).toBe("decided");
    expect(complaintState(complaint("SidedWithWorker"))).toBe("decided");
  });

  it("treats an unknown decision word as decided, never as open", () => {
    // Offering the decide buttons on a state we do not know would invite a 409.
    expect(complaintState(complaint("Withdrawn"))).toBe("decided");
  });

  it("is none with no complaint", () => {
    expect(complaintState(null)).toBe("none");
    expect(complaintState(undefined)).toBe("none");
  });
});

describe("decideErrorKind — by error string, never by status", () => {
  it("reads complaint_already_decided", () => {
    expect(decideErrorKind(axiosErr(409, { error: "complaint_already_decided" }))).toBe("alreadyDecided");
  });

  it("reads invalid_task_status as closed elsewhere", () => {
    expect(decideErrorKind(axiosErr(409, { error: "invalid_task_status" }))).toBe("closedElsewhere");
  });

  it("reads both not-found codes", () => {
    expect(decideErrorKind(axiosErr(404, { error: "complaint_not_found" }))).toBe("notFound");
    expect(decideErrorKind(axiosErr(404, { error: "task_not_found" }))).toBe("notFound");
  });

  it("reads invalid_decision and a problem-details body as invalid", () => {
    expect(decideErrorKind(axiosErr(400, { error: "invalid_decision" }))).toBe("invalid");
    expect(
      decideErrorKind(axiosErr(400, { title: "x", status: 400, errors: { Note: ["Too long."] } })),
    ).toBe("invalid");
  });

  it("reads an empty-bodied 403 as forbidden", () => {
    expect(decideErrorKind(axiosErr(403, ""))).toBe("forbidden");
  });

  it("falls back to generic", () => {
    expect(decideErrorKind(axiosErr(500, { error: "something_new" }))).toBe("generic");
    expect(decideErrorKind(new Error("network"))).toBe("generic");
  });

  it("marks the two world-moved kinds for a refetch", () => {
    expect([...DECIDE_REFETCH].sort()).toEqual(["alreadyDecided", "closedElsewhere"]);
  });
});
