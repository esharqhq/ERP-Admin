import axios from "axios";
import { apiClient } from "@/lib/http/client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

/** Backend: POST /api/files/presign (FileUploadsController) */
export interface PresignFileUploadResponse {
  presignedUploadUrl: string;
  method: string;
  expiresAt: string;
  storageKey: string;
  /** Permanent read URL — store this as the entity's FileUrl. */
  publicUrl: string;
}

function toAbsolute(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `${API_BASE}${url}`;
}

export const uploadService = {
  /** Step 1 — mint a presigned upload URL for a category (e.g. "contracts", "kyc"). */
  presign: async (
    category: string,
    file: File,
  ): Promise<PresignFileUploadResponse> => {
    const { data } = await apiClient.post<PresignFileUploadResponse>(
      "/api/files/presign",
      {
        category,
        fileName: file.name,
        mimeType: file.type || undefined,
        sizeBytes: file.size,
      },
    );
    return data;
  },

  /** Step 2 — upload the bytes directly to storage via the presigned URL. */
  putBytes: async (
    uploadUrl: string,
    file: File,
    method = "PUT",
  ): Promise<void> => {
    await axios.request({
      url: toAbsolute(uploadUrl),
      method: method as "PUT" | "POST",
      data: file,
      headers: { "Content-Type": file.type || "application/octet-stream" },
      // presigned URL carries its own HMAC/signature — never attach the Bearer token
      transformRequest: [(d) => d],
    });
  },

  /**
   * presign + PUT in one call. Returns the permanent public URL to persist as
   * the entity's `FileUrl` (e.g. on a contract create/renew request).
   */
  upload: async (category: string, file: File): Promise<string> => {
    const presigned = await uploadService.presign(category, file);
    await uploadService.putBytes(
      presigned.presignedUploadUrl,
      file,
      presigned.method,
    );
    return presigned.publicUrl;
  },
};
