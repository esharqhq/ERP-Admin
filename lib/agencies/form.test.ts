import { describe, expect, it } from "vitest";
import {
  agencyFormFrom,
  buildAgencyCreate,
  buildAgencyUpdate,
  emptyAgencyForm,
  endsAccessNow,
  missingRequired,
  type AgencyFormState,
} from "@/lib/agencies/form";
import type { AgencyDto } from "@/lib/types/agency.types";

const TODAY = Date.parse("2026-09-08T00:00:00.000Z");

function agency(over: Partial<AgencyDto> = {}): AgencyDto {
  return {
    id: "agency-1",
    legalName: "Nordwind Personal GmbH",
    registrationNumber: "HRB-9001",
    licenceNumber: "LIC-77",
    countryId: "country-1",
    country: "Austria",
    cityId: "city-1",
    city: "Vienna",
    contactPersonName: "Rita Vogel",
    contactEmail: "rita@nordwind.example",
    contactPhone: "+4315550101",
    signedOn: "2026-01-01T00:00:00Z",
    validUntil: "2027-01-01T00:00:00Z",
    isActive: true,
    agencyUserId: "user-1",
    loginEmail: "rita@nordwind.example",
    isVerified: true,
    lastLoginAt: "2026-09-01T00:00:00Z",
    lastSeenAt: "2026-09-01T00:00:00Z",
    createdAt: "2026-08-20T09:50:28.7Z",
    standing: "Active",
    ...over,
  };
}

function form(over: Partial<AgencyFormState> = {}): AgencyFormState {
  return { ...agencyFormFrom(agency()), ...over };
}

describe("emptyAgencyForm", () => {
  it("carries all ten fields as empty strings", () => {
    expect(Object.values(emptyAgencyForm()).every((v) => v === "")).toBe(true);
    expect(Object.keys(emptyAgencyForm())).toHaveLength(10);
  });
});

describe("agencyFormFrom", () => {
  it("turns nulls into empty strings so every input is controlled", () => {
    const f = agencyFormFrom(agency({ licenceNumber: null, contactPhone: null }));
    expect(f.licenceNumber).toBe("");
    expect(f.contactPhone).toBe("");
  });

  it("reduces a wire timestamp to the YYYY-MM-DD the date control speaks", () => {
    expect(agencyFormFrom(agency()).signedOn).toBe("2026-01-01");
  });
});

describe("buildAgencyCreate", () => {
  it("sends the six required fields and omits the empty optionals", () => {
    const body = buildAgencyCreate({
      ...emptyAgencyForm(),
      legalName: "Alpha",
      registrationNumber: "HRB-1",
      countryId: "country-1",
      cityId: "city-1",
      contactPersonName: "Rita",
      contactEmail: "rita@alpha.example",
    });
    expect(body).toEqual({
      legalName: "Alpha",
      registrationNumber: "HRB-1",
      countryId: "country-1",
      cityId: "city-1",
      contactPersonName: "Rita",
      contactEmail: "rita@alpha.example",
    });
  });

  it("sends the optionals that were filled in", () => {
    const body = buildAgencyCreate(form());
    expect(body.licenceNumber).toBe("LIC-77");
    expect(body.contactPhone).toBe("+4315550101");
    expect(body.signedOn).toBe("2026-01-01");
    expect(body.validUntil).toBe("2027-01-01");
  });

  it("trims whitespace rather than sending a blank-looking value", () => {
    const body = buildAgencyCreate(form({ legalName: "  Alpha  " }));
    expect(body.legalName).toBe("Alpha");
  });
});

describe("buildAgencyUpdate", () => {
  /**
   * ⚠ The rule that loses data if got wrong: `licenceNumber` and `contactPhone` are
   * CLEARED when omitted, while the two dates and the two location ids are KEPT.
   * Sending everything is the only shape that behaves the same for all ten.
   */
  it("always carries all ten fields, even the untouched ones", () => {
    const body = buildAgencyUpdate(form());
    for (const key of [
      "legalName",
      "registrationNumber",
      "licenceNumber",
      "countryId",
      "cityId",
      "contactPersonName",
      "contactEmail",
      "contactPhone",
      "signedOn",
      "validUntil",
    ]) {
      expect(body).toHaveProperty(key);
    }
  });

  it("does not ask to clear the dates when both boxes are filled", () => {
    expect(buildAgencyUpdate(form()).clearContractDates).toBe(false);
  });

  /**
   * ⚠ Sending `validUntil: null` means *unchanged*, so the only way to make a
   * contract open-ended is the flag — and it is applied before the dates in the
   * same request, which is what lets one call mean "keep the start, drop the end".
   */
  it("asks to clear and keeps the start when only the end was emptied", () => {
    const body = buildAgencyUpdate(form({ validUntil: "" }));
    expect(body.clearContractDates).toBe(true);
    expect(body.signedOn).toBe("2026-01-01");
    expect(body.validUntil).toBeUndefined();
  });

  it("asks to clear and sends neither date when both were emptied", () => {
    const body = buildAgencyUpdate(form({ signedOn: "", validUntil: "" }));
    expect(body.clearContractDates).toBe(true);
    expect(body.signedOn).toBeUndefined();
    expect(body.validUntil).toBeUndefined();
  });

  it("clears an optional contact field the operator emptied", () => {
    const body = buildAgencyUpdate(form({ licenceNumber: "", contactPhone: "" }));
    expect(body.licenceNumber).toBeUndefined();
    expect(body.contactPhone).toBeUndefined();
  });
});

describe("endsAccessNow", () => {
  it("is true when the new end date is already in the past", () => {
    expect(
      endsAccessNow(form({ validUntil: "2026-09-01" }), agency(), TODAY),
    ).toBe(true);
  });

  it("is true when an active agency's start date is being cleared", () => {
    expect(endsAccessNow(form({ signedOn: "" }), agency(), TODAY)).toBe(true);
  });

  it("is false for a future end date", () => {
    expect(
      endsAccessNow(form({ validUntil: "2027-06-01" }), agency(), TODAY),
    ).toBe(false);
  });

  /**
   * An agency that already cannot log in is not losing access, so the second
   * confirmation would be a false alarm on the most common repair — filling in the
   * contract dates of an `AwaitingContract` partner.
   */
  it("is false when the agency could not log in to begin with", () => {
    const awaiting = agency({
      signedOn: null,
      isActive: false,
      standing: "AwaitingContract",
    });
    expect(
      endsAccessNow(
        { ...agencyFormFrom(awaiting), validUntil: "2026-09-01" },
        awaiting,
        TODAY,
      ),
    ).toBe(false);
  });
});

describe("missingRequired", () => {
  it("is empty for a fully filled form", () => {
    expect(missingRequired(form())).toEqual([]);
  });

  it("names every required field on an empty form, in form order", () => {
    expect(missingRequired(emptyAgencyForm())).toEqual([
      "legalName",
      "registrationNumber",
      "contactPersonName",
      "countryId",
      "cityId",
      "contactEmail",
    ]);
  });

  /**
   * ⚠ Order matters: the submit line reads them out, and an operator scanning
   * the dialog top to bottom should meet them in the order the fields appear —
   * not in whatever order an object's keys happen to enumerate.
   */
  it("keeps form order rather than key order when only some are missing", () => {
    expect(missingRequired(form({ contactEmail: "", legalName: "" }))).toEqual([
      "legalName",
      "contactEmail",
    ]);
  });

  it("treats a whitespace-only value as missing", () => {
    expect(missingRequired(form({ legalName: "   " }))).toEqual(["legalName"]);
  });

  /** The four optional fields never appear, however empty they are. */
  it("never names an optional field", () => {
    const bare = form({
      licenceNumber: "",
      contactPhone: "",
      signedOn: "",
      validUntil: "",
    });
    expect(missingRequired(bare)).toEqual([]);
  });
});
