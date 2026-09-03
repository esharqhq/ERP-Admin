import { describe, expect, it } from "vitest";
import {
  firstToRead,
  groupDocuments,
  groupOf,
  requiredSet,
  verdictCounts,
  viewerKind,
} from "@/lib/onboarding/doc-set";
import type { KycDocDto } from "@/lib/types/kyc.types";

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
    createdAt: "2026-08-24T09:00:00.000Z",
    ...over,
  };
}

describe("groupOf", () => {
  it("puts all three identity documents together", () => {
    // Not a passport rule — an EU resident may hold only an ID card.
    for (const type of ["Passport", "IdCard", "ResidencePermit"]) {
      expect(groupOf(type)).toBe("identity");
    }
  });

  it("puts all three company documents together", () => {
    for (const type of ["CompanyRegistration", "BusinessLicense", "TaxCertificate"]) {
      expect(groupOf(type)).toBe("company");
    }
  });

  it("puts an unknown or absent type in Other rather than dropping it", () => {
    expect(groupOf("Other")).toBe("other");
    expect(groupOf("SomethingNew")).toBe("other");
    expect(groupOf(null)).toBe("other");
  });
});

describe("groupDocuments", () => {
  it("orders identity, then company, then other", () => {
    const groups = groupDocuments([
      doc({ id: "1", type: "TaxCertificate" }),
      doc({ id: "2", type: "Other" }),
      doc({ id: "3", type: "Passport" }),
    ]);
    expect(groups.map((g) => g.group)).toEqual(["identity", "company", "other"]);
  });

  it("drops an empty group rather than heading nothing", () => {
    // A natural person has no company section at all — the shape of the account,
    // not a gap in it.
    const groups = groupDocuments([doc({ type: "Passport" })]);
    expect(groups).toHaveLength(1);
    expect(groups[0].docs).toHaveLength(1);
  });

  it("keeps every document", () => {
    const docs = [
      doc({ id: "1", type: "Passport" }),
      doc({ id: "2", type: "CompanyRegistration" }),
      doc({ id: "3", type: null }),
    ];
    expect(groupDocuments(docs).flatMap((g) => g.docs)).toHaveLength(3);
  });
});

describe("requiredSet", () => {
  it("wants an identity document, and any of the three will do", () => {
    for (const type of ["Passport", "IdCard", "ResidencePermit"]) {
      expect(requiredSet([doc({ type })], false).complete).toBe(true);
    }
  });

  it("is incomplete with no identity document at all", () => {
    expect(requiredSet([doc({ type: "TaxCertificate" })], false)).toEqual({
      complete: false,
      missing: ["identity"],
    });
  });

  it("asks a company for its registration specifically", () => {
    // The backend's own rule: the register is wanted as a *file*, the licence as
    // a *typed number*, so only one of them is a document.
    const withLicence = [doc({ type: "Passport" }), doc({ type: "BusinessLicense" })];
    expect(requiredSet(withLicence, true)).toEqual({
      complete: false,
      missing: ["companyRegistration"],
    });
    expect(
      requiredSet([...withLicence, doc({ type: "CompanyRegistration" })], true).complete,
    ).toBe(true);
  });

  it("asks a natural person for nothing but identity", () => {
    expect(requiredSet([doc({ type: "Passport" })], false).complete).toBe(true);
  });

  it("reports both gaps at once on an empty bundle", () => {
    expect(requiredSet([], true).missing).toEqual(["identity", "companyRegistration"]);
  });
});

describe("verdictCounts", () => {
  it("counts each verdict and the total", () => {
    expect(
      verdictCounts([
        doc({ status: "Approved" }),
        doc({ status: "Pending" }),
        doc({ status: "Pending" }),
        doc({ status: "Rejected" }),
      ]),
    ).toEqual({ approved: 1, pending: 2, rejected: 1, total: 4 });
  });

  it("counts an unknown status as pending, never as approved", () => {
    expect(verdictCounts([doc({ status: null })]).pending).toBe(1);
  });
});

describe("firstToRead", () => {
  it("opens on a rejected file — somebody has to see why", () => {
    const rejected = doc({ id: "bad", status: "Rejected" });
    expect(firstToRead([doc({ id: "ok", status: "Approved" }), rejected])?.id).toBe("bad");
  });

  it("otherwise opens on the oldest undecided file", () => {
    const chosen = firstToRead([
      doc({ id: "new", status: "Pending", createdAt: "2026-08-25T00:00:00Z" }),
      doc({ id: "old", status: "Pending", createdAt: "2026-08-20T00:00:00Z" }),
      doc({ id: "done", status: "Approved", createdAt: "2026-08-01T00:00:00Z" }),
    ]);
    expect(chosen?.id).toBe("old");
  });

  it("falls back to the first file when everything is decided", () => {
    // An all-approved bundle still opens on something rather than an empty pane.
    expect(
      firstToRead([
        doc({ id: "a", status: "Approved" }),
        doc({ id: "b", status: "Approved" }),
      ])?.id,
    ).toBe("a");
  });

  it("is null only when there is nothing to read", () => {
    expect(firstToRead([])).toBeNull();
  });
});

describe("viewerKind", () => {
  it("recognises a pdf and the common image types", () => {
    expect(viewerKind("scan.pdf", null)).toBe("pdf");
    for (const ext of ["png", "jpg", "jpeg", "webp", "gif", "avif"]) {
      expect(viewerKind(`scan.${ext}`, null)).toBe("image");
    }
  });

  it("ignores case and falls back to the storage key when there is no name", () => {
    expect(viewerKind("SCAN.PDF", null)).toBe("pdf");
    expect(viewerKind(null, "kyc/2026/abc.JPEG")).toBe("image");
  });

  it("calls anything else unsupported rather than guessing", () => {
    // An unsupported type still gets Open original and the full verdict row —
    // the decision is never blocked by the preview.
    expect(viewerKind("scan.docx", null)).toBe("unsupported");
    expect(viewerKind("noextension", null)).toBe("unsupported");
    expect(viewerKind(null, null)).toBe("unsupported");
  });
});
