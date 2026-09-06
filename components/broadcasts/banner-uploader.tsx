"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ImageIcon, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadService } from "@/lib/services/upload.service";

// Source of truth: assets/Uyer Admin Broadcasts.dc.html §06, the "Banner
// image" card — 236px preview slot, Replace/Remove, and the copy about the
// presign flow ("the form holds the storage key, not the file").
//
// Composes uploadService.presign()+putBytes() directly rather than the
// one-shot uploadService.upload() helper: `upload()` returns only the public
// URL, but CreateBroadcastRequest.imageStorageKey needs the storage key too,
// and the 236px slot needs the URL for its own preview. Both steps already
// take a `category` param, so nothing in upload.service.ts or
// broadcast.service.ts needed to change for this.

export interface BannerUploaderValue {
  storageKey: string | null;
  previewUrl: string | null;
}

export interface BannerUploaderProps {
  value: BannerUploaderValue;
  onChange: (next: BannerUploaderValue) => void;
  /**
   * Edit mode only: the current banner's public URL
   * (`BroadcastDetailDto.imageUrl`) when nothing has been re-uploaded this
   * session yet. `BroadcastDetailDto` never returns a storage key to
   * round-trip — only the derived public URL — so there is no way to resend
   * "the same banner" on a PUT that doesn't touch it. Flagged inline instead
   * of pretending it will be kept; see the warning copy below.
   */
  existingImageUrl?: string | null;
}

export function BannerUploader({ value, onChange, existingImageUrl }: BannerUploaderProps) {
  const t = useTranslations("broadcasts.compose.banner");
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayUrl = value.previewUrl ?? (value.storageKey === null && !uploading ? existingImageUrl ?? null : null);
  const showingUnconfirmedExisting = !value.previewUrl && !!existingImageUrl;

  const handlePick = () => inputRef.current?.click();

  const handleFile = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const presigned = await uploadService.presign("broadcasts", file);
      await uploadService.putBytes(presigned.presignedUploadUrl, file, presigned.method);
      onChange({ storageKey: presigned.storageKey, previewUrl: presigned.publicUrl });
    } catch {
      setError(t("uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setError(null);
    onChange({ storageKey: null, previewUrl: null });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {t("label")}
        </span>
        <span className="flex h-5 items-center rounded-md bg-muted px-2 text-[11px] font-semibold text-muted-foreground">
          {t("optional")}
        </span>
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground">{t("platformNote")}</span>
      </div>

      <div className="flex gap-3.5">
        <div className="relative flex h-[236px] w-[236px] flex-none items-center justify-center overflow-hidden rounded-xl bg-[repeating-linear-gradient(135deg,var(--muted)_0_8px,transparent_8px_16px)] ring-1 ring-inset ring-border">
          {displayUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- dynamic uploaded banner, no next/image remote-domain config in this repo (see conversation-thread.tsx precedent)
            <img src={displayUrl} alt="" className="size-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-muted-foreground/60">
              <ImageIcon className="size-6" />
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70">
              <Loader2 className="size-5 animate-spin text-foreground" />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2.5">
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handlePick} disabled={uploading}>
              <Upload className="size-3.5" />
              {displayUrl ? t("replace") : t("upload")}
            </Button>
            {displayUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                disabled={uploading}
                className="text-destructive hover:text-destructive"
              >
                <X className="size-3.5" />
                {t("remove")}
              </Button>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void handleFile(file);
            }}
          />
          <p className="text-xs leading-relaxed text-muted-foreground text-pretty">{t("presignNote")}</p>
          {showingUnconfirmedExisting && (
            <p className="text-xs leading-relaxed text-status-pending text-pretty">
              {t("existingWillBeRemoved")}
            </p>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      </div>
    </div>
  );
}
