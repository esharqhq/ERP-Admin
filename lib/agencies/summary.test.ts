import { describe, expect, it } from "vitest";
import { agencySummary } from "@/lib/agencies/summary";
import type { AgencyDto } from "@/lib/types/agency.types";

function agency(over: Partial<AgencyDto> = {}): AgencyDto {
  return {
    id: "agency-1",
    legalName: "Nordwind Personal GmbH",
    registrationNumber: "HRB-9001",
    licenceNumber: null,
    countryId: "country-1",
    country: "Austria",
    cityId: "city-1",
    city: "Vienna",
    contactPersonName: "Rita Vogel",
    contactEmail: "rita@nordwind.example",
    contactPhone: null,
    signedOn: "2026-01-01T00:00:00Z",
    validUntil: "2027-01-01T00:00:00Z",
    isActive: true,
    agencyUserId: "user-1",
    loginEmail: "rita@nordwind.example",
    isVerified: true,
    lastLoginAt: null,
    lastSeenAt: null,
    createdAt: "2026-08-20T09:50:28.7Z",
    standing: "Active",
    ...over,
  };
}

describe("agencySummary", () => {
  it("is all zeroes for an empty list", () => {
    expect(agencySummary([])).toEqual({
      total: 0,
      invitationPending: 0,
      awaitingContract: 0,
      expired: 0,
    });
  });

  it("counts each dimension independently", () => {
    const rows = [
      agency({ id: "a" }),
      agency({ id: "b", isVerified: false }),
      agency({
        id: "c",
        standing: "AwaitingContract",
        signedOn: null,
        isActive: false,
      }),
      agency({ id: "d", standing: "Expired", isActive: false }),
    ];
    expect(agencySummary(rows)).toEqual({
      total: 4,
      invitationPending: 1,
      awaitingContract: 1,
      expired: 1,
    });
  });

  /**
   * ⚠ The two axes are independent, and a brand-new partner sits on both the day
   * after an approval. Counting such a row once would make the strip's numbers
   * disagree with the filters the tiles write.
   */
  it("counts a fresh partner in both the invitation and contract tiles", () => {
    const fresh = agency({
      isVerified: false,
      standing: "AwaitingContract",
      signedOn: null,
      isActive: false,
    });
    expect(agencySummary([fresh])).toEqual({
      total: 1,
      invitationPending: 1,
      awaitingContract: 1,
      expired: 0,
    });
  });
});
