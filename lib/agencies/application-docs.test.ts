import { describe, expect, it } from "vitest";
import {
  applicationDocToReviewDoc,
  MAX_DOC_BYTES,
  MAX_DOCS,
  MIME_ALLOWLIST,
  preflightDocument,
} from "@/lib/agencies/application-docs";
import { resolveFileUrl } from "@/lib/http/files";
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
    previewUrl: "http://localhost:5156/files/agency-applications/a.pdf?exp=1&sig=2",
    ...over,
  };
}

/** A `File` stand-in — jsdom is not loaded for lib tests. */
function file(size: number, type: string) {
  return { name: "scan.pdf", size, type } as File;
}

describe("applicationDocToReviewDoc", () => {
  it("carries the fields the viewer reads", () => {
    const r = applicationDocToReviewDoc(doc());
    expect(r.id).toBe("doc-1");
    expect(r.fileName).toBe("handelsregister.pdf");
    expect(r.type).toBe("RegistrationCertificate");
    expect(r.createdAt).toBe("2026-08-23T09:51:11.2Z");
  });

  /**
   * ⚠ There is **no per-document verdict** on an agency application — one
   * decision and one reason, on the application as a whole. The viewer never
   * reads these two, and leaving them null is what keeps it from inventing one.
   */
  it("leaves the per-document verdict fields null", () => {
    const r = applicationDocToReviewDoc(doc());
    expect(r.status).toBeNull();
    expect(r.rejectReason).toBeNull();
  });

  /**
   * ⚠ `previewUrl` is already an **absolute signed URL**, unlike a KYC row's
   * storage key. `resolveFileUrl` must pass it through untouched — concatenating
   * an origin onto it is the defect that reported every owner passport as missing.
   */
  it("maps previewUrl onto fileUrl so resolveFileUrl passes it through", () => {
    const r = applicationDocToReviewDoc(doc());
    expect(r.fileUrl).toBe(doc().previewUrl);
    expect(resolveFileUrl(r.fileUrl)).toBe(doc().previewUrl);
  });

  it("survives a null previewUrl, which is what confirm returns", () => {
    expect(applicationDocToReviewDoc(doc({ previewUrl: null })).fileUrl).toBeNull();
  });
});

describe("preflightDocument", () => {
  it("accepts each allowed mime at a sane size", () => {
    for (const mime of MIME_ALLOWLIST) {
      expect(preflightDocument(file(1024, mime), 0)).toEqual({ ok: true });
    }
  });

  it("refuses a mime outside the allowlist", () => {
    expect(preflightDocument(file(1024, "image/gif"), 0)).toEqual({
      ok: false,
      reason: "mime",
    });
  });

  it("accepts a file exactly at the cap and refuses one byte over", () => {
    expect(preflightDocument(file(MAX_DOC_BYTES, "application/pdf"), 0)).toEqual({
      ok: true,
    });
    expect(
      preflightDocument(file(MAX_DOC_BYTES + 1, "application/pdf"), 0),
    ).toEqual({ ok: false, reason: "size" });
  });

  it("accepts the tenth document and refuses the eleventh", () => {
    expect(preflightDocument(file(1024, "application/pdf"), MAX_DOCS - 1)).toEqual({
      ok: true,
    });
    expect(preflightDocument(file(1024, "application/pdf"), MAX_DOCS)).toEqual({
      ok: false,
      reason: "count",
    });
  });

  /**
   * The mime check runs before the size, matching the server's own rule order —
   * so a file that is both the wrong type and too large is reported as the wrong
   * type, which is the fact the operator can act on.
   */
  it("reports the mime before the size when both are wrong", () => {
    expect(preflightDocument(file(MAX_DOC_BYTES + 1, "image/gif"), 0)).toEqual({
      ok: false,
      reason: "mime",
    });
  });

  /**
   * ⚠ The count outranks both file checks, and deliberately: it is a fact about
   * the **application**, not about this file, so an eleventh document is refused
   * whatever it contains.
   */
  it("reports the count before anything about the file", () => {
    expect(
      preflightDocument(file(MAX_DOC_BYTES + 1, "image/gif"), MAX_DOCS),
    ).toEqual({ ok: false, reason: "count" });
  });
});
