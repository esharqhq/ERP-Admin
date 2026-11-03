import { describe, expect, it } from "vitest";
import { FILES_BASE, openableFileUrl, resolveFileUrl } from "@/lib/http/files";

/**
 * The regression these pin: every `fileUrl` on the wire was being handed to an
 * `<img src>` / `<a href>` verbatim. Owner and Worker both post the **storage
 * key** (`Owner/src/components/profile/KycDocumentSection.tsx:95`,
 * `Worker/src/api/hooks/useUploadWorkerDoc.ts:33`) and `KycService.cs:461` stores
 * it back unchanged — so a bare key resolved against the *admin panel's* origin
 * and 404'd, which the viewer reported as "missing from storage".
 */
describe("resolveFileUrl", () => {
  it("hangs a storage key off the backend's public files route", () => {
    expect(resolveFileUrl("kyc/2026/08/03/a.jpg")).toBe(
      `${FILES_BASE}/files/kyc/2026/08/03/a.jpg`,
    );
  });

  it("passes an absolute URL through untouched", () => {
    // Rows written before the presign migration, and every contract source the
    // admin uploads here — `uploadService.upload` returns the absolute publicUrl.
    const absolute = "https://api.uyer.app/files/contracts/owner/c1/src.pdf";
    expect(resolveFileUrl(absolute)).toBe(absolute);
    expect(resolveFileUrl("http://localhost:5156/files/kyc/a.jpg")).toBe(
      "http://localhost:5156/files/kyc/a.jpg",
    );
  });

  it("keeps a signed URL's query string intact", () => {
    // `contracts/` is the one prefix served behind an HMAC signature
    // (`FilesController.SignedReadPrefixes`); dropping `?exp=&sig=` would 404.
    const signed =
      "https://api.uyer.app/files/contracts/owner/c1/contract.pdf?exp=1&sig=ab";
    expect(resolveFileUrl(signed)).toBe(signed);
  });

  it("does not repeat the route segment on a rooted path", () => {
    // `GetPublicUrl` against a relative `PublicBaseUrl` emits `/files/{key}`.
    expect(resolveFileUrl("/files/kyc/a.jpg")).toBe(`${FILES_BASE}/files/kyc/a.jpg`);
  });

  it("strips a leading slash rather than doubling it", () => {
    expect(resolveFileUrl("/kyc/a.jpg")).toBe(`${FILES_BASE}/files/kyc/a.jpg`);
  });

  it("leaves a storage key whose category is `files` alone", () => {
    // The counterpart to the case above, and the reason the two are told apart by
    // the leading slash rather than by the segment. `IsSafeCategory` shape-checks
    // the category and does not restrict it to a list, so `files` is a legal one —
    // stripping it here would turn a valid key into a 404.
    expect(resolveFileUrl("files/2026/08/03/abc-a.jpg")).toBe(
      `${FILES_BASE}/files/files/2026/08/03/abc-a.jpg`,
    );
  });

  it("is null for a document that carries no file at all", () => {
    // A KYC row with a null fileUrl is still worth listing — its status is the
    // point — but it must not render as a link to nowhere.
    expect(resolveFileUrl(null)).toBeNull();
    expect(resolveFileUrl("")).toBeNull();
    expect(resolveFileUrl("   ")).toBeNull();
  });
});

/**
 * `/files` serves the type the key's extension implies, inline, with no
 * `nosniff` and no sandbox (BACKEND-ASKS, 2026-10-08). A link that opens an
 * uploaded `.html` or `.svg` runs it as a page on the API origin, so only types
 * a browser shows inertly or downloads get a link.
 */
describe("openableFileUrl", () => {
  it.each([
    "https://api.uyer.app/files/kyc/2026/08/03/a-passport.pdf",
    "https://api.uyer.app/files/chat/a-photo.JPG",
    "https://api.uyer.app/files/chat/a-note.docx",
    "https://api.uyer.app/files/chat/a-voice.m4a",
    "https://api.uyer.app/files/contracts/c.pdf?exp=1&sig=abc",
  ])("keeps %s", (url) => {
    expect(openableFileUrl(url)).toBe(url);
  });

  it.each([
    "https://api.uyer.app/files/chat/a-page.html",
    "https://api.uyer.app/files/chat/a-page.HTM",
    "https://api.uyer.app/files/chat/a-logo.svg",
    "https://api.uyer.app/files/chat/a-feed.xml",
    "https://api.uyer.app/files/chat/a-page.xhtml",
    "https://api.uyer.app/files/chat/no-extension",
    // the display name is not what the server reads; the key is
    "https://api.uyer.app/files/chat/a.pdf.html",
    "https://api.uyer.app/files/chat/a.html?name=x.pdf",
  ])("refuses %s", (url) => {
    expect(openableFileUrl(url)).toBeNull();
  });

  it("refuses a non-http scheme", () => {
    expect(openableFileUrl("javascript:alert(1)//.pdf")).toBeNull();
    expect(openableFileUrl("data:text/html;base64,PGI+.pdf")).toBeNull();
  });

  it("passes null through", () => {
    expect(openableFileUrl(null)).toBeNull();
  });
});
