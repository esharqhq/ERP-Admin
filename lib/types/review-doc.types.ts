import type { KycDocDto } from "@/lib/types/kyc.types";
import type { WorkerDocumentDto } from "@/lib/types/worker.types";

/** The shape both sides share — owner KYC docs and worker docs now carry the same review fields. */
export interface ReviewDoc {
  id: string;
  type: string | null;
  fileName: string | null;
  /**
   * **A storage key, not a URL** — resolve with `resolveFileUrl` before it reaches
   * an `href`. Owner and Worker both post the presign key and the server echoes it
   * back verbatim; using it raw resolved against this app's own origin and 404'd.
   * Absolute values (pre-migration rows, anything `upload.service` stored) still
   * occur and pass through that helper untouched.
   */
  fileUrl: string | null;
  /** TitleCase on the wire: "Pending" | "Approved" | "Rejected". */
  status: string | null;
  rejectReason: string | null;
  createdAt: string;
}

export function kycDocToReviewDoc(doc: KycDocDto): ReviewDoc {
  return {
    id: doc.id,
    type: doc.type,
    fileName: doc.fileName,
    fileUrl: doc.fileUrl,
    status: doc.status,
    rejectReason: doc.rejectReason,
    createdAt: doc.createdAt,
  };
}

export function workerDocumentToReviewDoc(doc: WorkerDocumentDto): ReviewDoc {
  return {
    id: doc.id,
    type: doc.type,
    fileName: doc.fileName,
    fileUrl: doc.fileUrl,
    status: doc.status,
    rejectReason: doc.rejectReason,
    createdAt: doc.createdAt,
  };
}
