import { describe, expect, it } from "vitest";
import { agencyLinkTurn } from "@/lib/workers/agency-link";
import type { WorkerAgencyLinkDto } from "@/lib/types/agency.types";

function link(over: Partial<WorkerAgencyLinkDto> = {}): WorkerAgencyLinkDto {
  return {
    id: "link-1",
    agencyId: "agency-1",
    agencyLegalName: "Nordwind Personal GmbH",
    status: "Proposed",
    setByUserType: "WORKER",
    reason: null,
    disputeNote: null,
    resolutionReason: null,
    resolvedAt: null,
    createdAt: "2026-08-20T12:52:29.388872Z",
    ...over,
  };
}

/**
 * The mirror rule, from `f-05-c-worker-agency-link.md` §2: *whoever did not assert
 * the link is the one who has to agree to it.* `status` alone cannot answer whose
 * turn it is — two rows both reading `Proposed` mean opposite things.
 */
describe("agencyLinkTurn", () => {
  it("waits on an admin when the worker made the claim", () => {
    expect(agencyLinkTurn(link({ status: "Proposed", setByUserType: "WORKER" }))).toBe(
      "admin",
    );
  });

  it("waits on the worker when an admin attached the link", () => {
    expect(agencyLinkTurn(link({ status: "Proposed", setByUserType: "ADMIN" }))).toBe(
      "worker",
    );
  });

  it("waits on an admin for a dispute the worker filed", () => {
    expect(
      agencyLinkTurn(link({ status: "Disputed", setByUserType: "ADMIN" })),
    ).toBe("admin");
  });

  it("waits on an admin for a dispute whatever side asserted the link", () => {
    expect(
      agencyLinkTurn(link({ status: "Disputed", setByUserType: "WORKER" })),
    ).toBe("admin");
  });

  it("is settled once confirmed", () => {
    expect(agencyLinkTurn(link({ status: "Confirmed" }))).toBe("settled");
  });

  it("is settled once rejected", () => {
    expect(agencyLinkTurn(link({ status: "Rejected" }))).toBe("settled");
  });

  it("is settled when there is no link at all", () => {
    expect(agencyLinkTurn(null)).toBe("settled");
  });

  /**
   * The default branch this function exists for. Claiming an unrecognised state is
   * *waiting on an admin* invents work nobody can do; the card still prints the raw
   * status, so nothing is hidden by calling it settled.
   */
  it("is settled for a status this build does not recognise", () => {
    expect(agencyLinkTurn(link({ status: "Escalated" }))).toBe("settled");
  });

  /**
   * ⚠ `setByUserType` is UPPERCASE on the wire and `status` is TitleCase; the two
   * are never normalised to one another. A lowercase asserter is therefore an
   * unknown value, not a `WORKER` — and treating it as one would put a confirm
   * decision in front of an admin for a link they may have made themselves.
   */
  it("does not fold an unrecognised asserter into a known one", () => {
    expect(
      agencyLinkTurn(link({ status: "Proposed", setByUserType: "worker" })),
    ).toBe("settled");
  });
});
