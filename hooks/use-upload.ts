"use client";

import { useMutation } from "@tanstack/react-query";
import { uploadService } from "@/lib/services/upload.service";

/**
 * Upload a single file under a storage `category` and resolve to the permanent
 * public URL (to store as an entity FileUrl). Used by contracts and any admin
 * file upload via the presign → PUT flow.
 */
export function useUpload(category: string) {
  return useMutation({
    mutationFn: (file: File) => uploadService.upload(category, file),
  });
}
