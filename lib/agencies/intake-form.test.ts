import { describe, expect, it } from "vitest";
import {
  buildAdminIntake,
  emptyIntakeForm,
  missingIntakeRequired,
  REQUIRED_INTAKE_FIELDS,
  type IntakeFormState,
} from "@/lib/agencies/intake-form";

function form(over: Partial<IntakeFormState> = {}): IntakeFormState {
  return {
    ...emptyIntakeForm(),
    legalName: "Nordwind Personal GmbH",
    registrationNumber: "HRB-9001",
    countryId: "01a01dba-b3cc-7057-836b-256a736e2c98",
    cityId: "01a01dba-b44d-7573-9f1b-e9d32ec2e0f9",
    contactPersonName: "Rita Vogel",
    contactEmail: "rita@nordwind.example",
    ...over,
  };
}

describe("buildAdminIntake", () => {
  it("sends the six required fields, trimmed", () => {
    expect(
      buildAdminIntake(form({ legalName: "  Nordwind  ", contactEmail: " r@x.de " })),
    ).toEqual({
      legalName: "Nordwind",
      registrationNumber: "HRB-9001",
      countryId: "01a01dba-b3cc-7057-836b-256a736e2c98",
      cityId: "01a01dba-b44d-7573-9f1b-e9d32ec2e0f9",
      contactPersonName: "Rita Vogel",
      contactEmail: "r@x.de",
    });
  });

  /**
   * ⚠ **The test that matters.** Form state is strings and `Number("")` is `0`,
   * which sits *inside* the guide's valid `0–100000` range — so a naive
   * `Number(form.expectedWorkerCount)` is accepted by the server and the row then
   * says the agency expects **zero** workers. An unanswered question and an
   * answer of nought are not the same fact.
   */
  it("omits an unanswered worker count rather than sending zero", () => {
    const body = buildAdminIntake(form({ expectedWorkerCount: "" }));
    expect("expectedWorkerCount" in body).toBe(false);
  });

  it("sends a real zero, which is a different answer", () => {
    expect(buildAdminIntake(form({ expectedWorkerCount: "0" })).expectedWorkerCount).toBe(0);
  });

  it("sends a count as a number, never as a string", () => {
    expect(buildAdminIntake(form({ expectedWorkerCount: "40" })).expectedWorkerCount).toBe(40);
  });

  /** Whitespace is not an answer either — `base()` trims, so this must too. */
  it("omits the three optional strings when they hold only whitespace", () => {
    const body = buildAdminIntake(
      form({ licenceNumber: "  ", contactPhone: "\t", message: "\n " }),
    );
    expect("licenceNumber" in body).toBe(false);
    expect("contactPhone" in body).toBe(false);
    expect("message" in body).toBe(false);
  });

  it("sends the optional strings when they hold something", () => {
    const body = buildAdminIntake(
      form({ licenceNumber: " LIC-77 ", contactPhone: "+4315550101", message: " Vienna " }),
    );
    expect(body.licenceNumber).toBe("LIC-77");
    expect(body.contactPhone).toBe("+4315550101");
    expect(body.message).toBe("Vienna");
  });

  /**
   * ⚠ `termsVersion` and `termsAccepted` are the public form's, not this door's:
   * the agency accepted the terms on paper, so the row records the current
   * version and the admin's id server-side. Sending them is not merely useless —
   * it would claim a consent this screen never collected.
   */
  it("never sends the two terms fields", () => {
    const body: Record<string, unknown> = { ...buildAdminIntake(form()) };
    expect("termsVersion" in body).toBe(false);
    expect("termsAccepted" in body).toBe(false);
  });

  /** A non-numeric count cannot become `NaN` in a JSON body. */
  it("omits a count that is not a number", () => {
    expect("expectedWorkerCount" in buildAdminIntake(form({ expectedWorkerCount: "abc" }))).toBe(
      false,
    );
  });
});

describe("missingIntakeRequired", () => {
  it("finds nothing on a filled form", () => {
    expect(missingIntakeRequired(form())).toEqual([]);
  });

  it("counts whitespace as empty, matching what is sent", () => {
    expect(missingIntakeRequired(form({ legalName: "   " }))).toEqual(["legalName"]);
  });

  /**
   * ⚠ **Form order, not `Object.keys` order.** The submit button reads this list
   * out, and an operator scanning the dialog top to bottom must meet the fields
   * in the order the controls appear.
   */
  it("reports in the order the form draws them", () => {
    expect(missingIntakeRequired(emptyIntakeForm())).toEqual([
      ...REQUIRED_INTAKE_FIELDS,
    ]);
    expect(REQUIRED_INTAKE_FIELDS[2]).toBe("contactPersonName");
  });

  it("ignores the four optional fields", () => {
    expect(
      missingIntakeRequired(
        form({ licenceNumber: "", contactPhone: "", expectedWorkerCount: "", message: "" }),
      ),
    ).toEqual([]);
  });
});
