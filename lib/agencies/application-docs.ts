import type { ReviewDoc } from "@/lib/types/review-doc.types";
import type { AgencyApplicationDocumentDto } from "@/lib/types/agency.types";

/** The server's own allowlist, in the same order its error's `allowed` array uses. */
export const MIME_ALLOWLIST = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const MAX_DOC_BYTES = 10 * 1024 * 1024;
export const MAX_DOCS = 10;

/**
 * An application document, dressed as the shape `FileViewer` reads.
 *
 * The adapter exists rather than a second viewer because `ReviewDoc` already has
 * this precedent (`kycDocToReviewDoc`) and `viewerKind` keys off the file
 * **extension**, so all four allowed mimes resolve without the viewer learning
 * anything about agencies.
 *
 * ⚠ **`status` and `rejectReason` stay null**: there is no per-document verdict
 * on an application — one decision and one reason, on the whole of it. The viewer
 * reads neither field, so null is not a gap.
 *
 * ⚠ **`previewUrl` is already an absolute signed URL**, unlike a KYC row's
 * storage key, so `resolveFileUrl` takes its passthrough arm. Concatenating an
 * origin onto it is the defect that once reported every owner passport as missing
 * from storage.
 */
export function applicationDocToReviewDoc(
  doc: AgencyApplicationDocumentDto,
): ReviewDoc {
  return {
    id: doc.id,
    type: doc.type,
    fileName: doc.fileName,
    fileUrl: doc.previewUrl,
    status: null,
    rejectReason: null,
    createdAt: doc.createdAt,
  };
}

/**
 * The three refusals worth catching before a round trip.
 *
 * ⚠ **This is not the enforcement.** The server re-checks the mime against the
 * file's real leading bytes, measures the **actual stored** size, and counts the
 * rows — a client cannot lie past any of them, and `sizeBytes` in the request is
 * accepted and ignored for the cap. This only spares the operator a wait for a
 * refusal that was knowable locally.
 *
 * **Order.** The count comes first because it is a fact about the *application*
 * rather than about this file: an eleventh document is refused whatever it
 * contains. Between the two file checks, mime beats size — the server's own rule
 * order — so a file that is both the wrong type and too large is reported as the
 * wrong type, which is the fact the operator can act on.
 */
export function preflightDocument(
  file: File,
  existingCount: number,
): { ok: true } | { ok: false; reason: "mime" | "size" | "count" } {
  if (existingCount >= MAX_DOCS) return { ok: false, reason: "count" };
  if (!(MIME_ALLOWLIST as readonly string[]).includes(file.type)) {
    return { ok: false, reason: "mime" };
  }
  if (file.size > MAX_DOC_BYTES) return { ok: false, reason: "size" };
  return { ok: true };
}
