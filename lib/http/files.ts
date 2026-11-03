/**
 * Turning a stored `fileUrl` into something a browser can actually fetch.
 *
 * **`fileUrl` is not a URL.** Every client posts the presign *storage key* and the
 * server stores it back verbatim — `Owner/src/components/profile/KycDocumentSection.tsx:95`
 * and `Worker/src/api/hooks/useUploadWorkerDoc.ts:33` both send `storageKey`, and
 * `KycService.cs:461` does `FileUrl = d.FileUrl` with no transformation. So a value
 * off the wire looks like `kyc/2026/08/03/a.jpg`, and handing that straight to an
 * `<img src>` resolves it against *this* app's origin — which is how the document
 * viewer came to report every owner passport as "missing from storage".
 *
 * Absolute values still occur and must survive untouched: rows written before the
 * presign migration hold one, and so does every contract source uploaded from this
 * app (`uploadService.upload` returns the backend's absolute `publicUrl`).
 *
 * The route is `FilesController` at `[Route("files")]`, and KYC/worker/property
 * media are deliberately **not** in its `SignedReadPrefixes` — they serve to anyone
 * holding the URL, with no token and no signature. A plain `<img>` is all that is
 * needed. Only `contracts/` and the agency-application prefix are signed, and those
 * arrive as absolute signed URLs that take the passthrough arm above.
 */

/**
 * Same origin the API client uses. The backend's own `Storage:Local:PublicBaseUrl`
 * is `{origin}/files`, so the `/files` segment is added here rather than expected
 * in the env var — one variable, not two that can disagree.
 */
export const FILES_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export function resolveFileUrl(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;

  /*
    A leading slash is what separates the two relative producers, and the split
    has to be exact in both directions.

    `StorageKey.IsSafe` rejects any key beginning with `/`, so a value that has
    one came from `GetPublicUrl` against a relative `PublicBaseUrl` — a *path*,
    whose `files/` segment is the route and must not be repeated. A value without
    one is a storage key, and is used verbatim: `StorageKey.New` builds
    `{category}/{yyyy/MM/dd}/{guid}-{name}` from a caller-supplied category that
    `FileUploadsController.IsSafeCategory` shape-checks but does **not** restrict
    to a list — so `files/…` is a legal key, and stripping that segment
    unconditionally would quietly mangle it into a 404.
  */
  const key = raw.startsWith("/")
    ? raw.replace(/^\/+/, "").replace(/^files\//i, "")
    : raw;
  return `${FILES_BASE}/files/${key}`;
}

/**
 * The extension of a file URL or name, lower-cased, read past a query or
 * fragment (a signed URL carries one). Empty when the last segment has none.
 */
export function extensionOf(value: string): string {
  const path = value.split(/[?#]/)[0].toLowerCase();
  const dot = path.lastIndexOf(".");
  return dot > path.lastIndexOf("/") ? path.slice(dot + 1) : "";
}

/**
 * Types a browser shows inertly (PDF viewer, raster image, media player, plain
 * text) or downloads (office files, archives). Nothing here can run script as a
 * page. `svg`, `html` and `xml` are left out on purpose: each is a document that
 * runs script when opened directly.
 */
const OPENABLE = new Set([
  "pdf",
  "png", "jpg", "jpeg", "webp", "gif", "avif", "bmp", "heic", "heif",
  "mp4", "mov", "webm", "m4v",
  "mp3", "m4a", "aac", "ogg", "oga", "opus", "wav",
  "txt", "csv",
  "doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods", "odp", "rtf",
  "zip",
]);

/**
 * The URL, when it is safe to open in a new tab; otherwise null, and the
 * caller shows the file without a link.
 *
 * `/files` takes the Content-Type from the key's extension and serves it
 * inline, with no `nosniff` and no `Content-Security-Policy: sandbox`
 * (BACKEND-ASKS, 2026-10-08). Workers and owners upload these files, so an
 * `.html` or `.svg` key opened from the panel would run as a page on the API
 * origin. The check reads the URL's own extension, because that is what the
 * server reads; a display name ending in `.pdf` proves nothing.
 */
export function openableFileUrl(url: string | null | undefined): string | null {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  return OPENABLE.has(extensionOf(url)) ? url : null;
}
