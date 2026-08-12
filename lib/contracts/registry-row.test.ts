import { describe, expect, it } from "vitest";
import {
  canRenew,
  canTerminate,
  isAwaitingSignature,
  ownerRegistryRow,
  workerRegistryRow,
} from "@/lib/contracts/registry-row";
import type {
  AdminOwnerContractDto,
  AdminWorkerContractDto,
} from "@/lib/types/contract.types";

const ownerDto = {
  id: "c1",
  ownerProfileId: "p1",
  ownerUserId: "u1",
  ownerFullName: "Hans Müller",
  // Deliberately different from the display name — the guide's own example, and
  // the whole reason both are carried.
  ownerLegalName: "Johannes Müller-Bauer",
  ownerEmail: "hans@example.de",
  eligibleFrom: "2026-01-01T00:00:00Z",
  eligibleTo: "2026-12-31T00:00:00Z",
  fileName: "src.pdf",
  fileUrl: "contract-sources/src.pdf",
  // Deliberately contradicts `phase`: this is the hourly-lag window the task exists for.
  isActive: false,
  phase: "InForce",
  status: "Signed",
  sentAt: "2025-12-01T00:00:00Z",
  signedAt: "2025-12-02T00:00:00Z",
  renewalStartsAt: null,
  createdAt: "2025-11-30T00:00:00Z",
} as unknown as AdminOwnerContractDto;

describe("ownerRegistryRow", () => {
  it("carries ownerUserId as partyId and ownerProfileId separately", () => {
    const row = ownerRegistryRow(ownerDto);
    expect(row.partyId).toBe("u1");
    expect(row.partyProfileId).toBe("p1");
  });

  it("takes phase from the DTO and never derives it from isActive", () => {
    const row = ownerRegistryRow(ownerDto);
    expect(row.phase).toBe("InForce");
    expect(row).not.toHaveProperty("isActive");
  });

  /**
   * `contract-lifecycle.md` §7.7: the display name and the legal name are two
   * different names and are allowed to differ. The legal one is what the PDF
   * prints, so a row carrying only `ownerFullName` can name a different party
   * than the document it links to.
   */
  it("carries the display name and the legal name separately", () => {
    const row = ownerRegistryRow(ownerDto);
    expect(row.partyName).toBe("Hans Müller");
    expect(row.partyLegalName).toBe("Johannes Müller-Bauer");
  });

  it("leaves a missing legal name null rather than falling back to the display name", () => {
    const row = ownerRegistryRow({
      ...ownerDto,
      ownerLegalName: null,
    } as unknown as AdminOwnerContractDto);
    expect(row.partyLegalName).toBeNull();
    // The fallback the guide explicitly forbids: "Render nothing, not the other name."
    expect(row.partyLegalName).not.toBe("Hans Müller");
  });
});

describe("workerRegistryRow", () => {
  it("uses workerId as partyId and has no profile id", () => {
    const row = workerRegistryRow({
      ...ownerDto,
      workerId: "w1",
      workerFullName: "Anna Schmidt",
      workerLegalName: "Anna-Maria Schmidt-Wagner",
      workerEmail: "anna@example.de",
    } as unknown as AdminWorkerContractDto);
    expect(row.partyId).toBe("w1");
    expect(row.partyProfileId).toBeNull();
  });

  it("carries the worker's legal name separately from the display name", () => {
    const row = workerRegistryRow({
      ...ownerDto,
      workerId: "w1",
      workerFullName: "Anna Schmidt",
      workerLegalName: "Anna-Maria Schmidt-Wagner",
      workerEmail: "anna@example.de",
    } as unknown as AdminWorkerContractDto);
    expect(row.partyName).toBe("Anna Schmidt");
    expect(row.partyLegalName).toBe("Anna-Maria Schmidt-Wagner");
  });
});

describe("affordance rules", () => {
  it("allows renew only on cover that exists now or is queued", () => {
    expect(canRenew("InForce")).toBe(true);
    expect(canRenew("Scheduled")).toBe(true);
    // Nothing to extend: re-author instead of renewing.
    expect(canRenew("Expired")).toBe(false);
    expect(canRenew("Lapsed")).toBe(false);
    expect(canRenew("Terminated")).toBe(false);
    // Unsigned: recall and edit the draft, do not renew it.
    expect(canRenew("Draft")).toBe(false);
    expect(canRenew("Sent")).toBe(false);
  });

  it("allows force-deactivate from every phase that has not already ended", () => {
    expect(canTerminate("InForce")).toBe(true);
    expect(canTerminate("Scheduled")).toBe(true);
    // Legal per contracts.md:37 — "so a bad contract can be withdrawn". An admin
    // who authored a wrong draft must be able to retire it, not only recall it.
    expect(canTerminate("Draft")).toBe(true);
    expect(canTerminate("Sent")).toBe(true);
    // Already ended: nothing left to terminate.
    expect(canTerminate("Expired")).toBe(false);
    expect(canTerminate("Lapsed")).toBe(false);
    expect(canTerminate("Terminated")).toBe(false);
  });

  it("flags exactly the sent-and-silent phase", () => {
    expect(isAwaitingSignature("Sent")).toBe(true);
    expect(isAwaitingSignature("Draft")).toBe(false);
    expect(isAwaitingSignature("InForce")).toBe(false);
  });
});
