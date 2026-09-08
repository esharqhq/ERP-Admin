import { describe, expect, it } from "vitest";
import {
  canReview,
  docSummary,
  isTerminal,
  statusTone,
} from "@/lib/agencies/application-status";
import type { AgencyApplicationDocumentDto } from "@/lib/types/agency.types";

function doc(
  over: Partial<AgencyApplicationDocumentDto> = {},
): AgencyApplicationDocumentDto {
  return {
    id: "doc-1",
    type: "RegistrationCertificate",
    fileName: "handelsregister.pdf",
    mimeType: "application/pdf",
    sizeBytes: 214823,
    createdAt: "2026-08-23T09:51:11.2Z",
    previewUrl: "http://localhost:5156/files/x.pdf?exp=1&sig=2",
    ...over,
  };
}

describe("statusTone", () => {
  it("marks the work queue as pending work", () => {
    expect(statusTone("Pending")).toBe("warning");
  });

  it("marks a returned application as informational", () => {
    expect(statusTone("InfoRequested")).toBe("info");
  });

  it("marks an approval as success", () => {
    expect(statusTone("Approved")).toBe("success");
  });

  /**
   * ⚠ Neutral, not danger. A rejection is a completed decision, not a fault —
   * `danger` on a terminal row would make the archive read as a queue of problems.
   */
  it("marks a rejection as a completed decision, not a fault", () => {
    expect(statusTone("Rejected")).toBe("neutral");
  });

  it("falls back to neutral for a status this build does not recognise", () => {
    expect(statusTone("Escalated")).toBe("neutral");
  });
});

describe("isTerminal", () => {
  it("is true for the two terminal states", () => {
    expect(isTerminal("Approved")).toBe(true);
    expect(isTerminal("Rejected")).toBe(true);
  });

  it("is false while the application is open", () => {
    expect(isTerminal("Pending")).toBe(false);
    expect(isTerminal("InfoRequested")).toBe(false);
  });

  /**
   * ⚠ The inverse of `statusTone`'s default, deliberately. A state this build has
   * not met might still be actionable, and calling it terminal would hide the
   * verbs and strand the row — while offering them costs nothing, because the
   * server refuses what it must with `application_already_reviewed`.
   */
  it("does NOT treat an unrecognised status as terminal", () => {
    expect(isTerminal("Escalated")).toBe(false);
  });
});

describe("canReview", () => {
  it("is true on an open application for an admin who can manage", () => {
    expect(canReview("Pending", true)).toBe(true);
    expect(canReview("InfoRequested", true)).toBe(true);
  });

  /** A MODERATOR reads the queue and writes nothing. */
  it("is false without the manage grant, whatever the status", () => {
    expect(canReview("Pending", false)).toBe(false);
    expect(canReview("InfoRequested", false)).toBe(false);
  });

  it("is false once a decision has been made", () => {
    expect(canReview("Approved", true)).toBe(false);
    expect(canReview("Rejected", true)).toBe(false);
  });
});

describe("docSummary", () => {
  it("reports both required papers missing for no documents", () => {
    expect(docSummary(null)).toEqual({
      total: 0,
      hasRegistration: false,
      hasLicence: false,
      missing: ["RegistrationCertificate", "Licence"],
    });
  });

  it("reports the complete set", () => {
    const result = docSummary([doc(), doc({ id: "d2", type: "Licence" })]);
    expect(result).toEqual({
      total: 2,
      hasRegistration: true,
      hasLicence: true,
      missing: [],
    });
  });

  it("names only the paper that is absent", () => {
    expect(docSummary([doc()]).missing).toEqual(["Licence"]);
  });

  /** ⚠ `Other` counts toward the total and toward neither required type. */
  it("does not let an Other document satisfy a required type", () => {
    const result = docSummary([doc({ type: "Other" })]);
    expect(result.total).toBe(1);
    expect(result.missing).toEqual(["RegistrationCertificate", "Licence"]);
  });
});
