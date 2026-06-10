// components/admins/admin-edit-dialog.tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Upload } from "lucide-react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUpload } from "@/hooks/use-upload";
import type { AdminDetailDto, UpdateAdminRequest } from "@/lib/types/admin-user.types";

interface Props {
  open: boolean;
  onClose: () => void;
  admin: AdminDetailDto;
  pending: boolean;
  error?: string | null;
  onSubmit: (body: UpdateAdminRequest) => void;
}

export function AdminEditDialog({ open, onClose, admin, pending, error, onSubmit }: Props) {
  const t = useTranslations("admins");
  const tCommon = useTranslations("common");

  const [fullName, setFullName] = useState(admin.fullName);
  const [email, setEmail] = useState(admin.email);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(admin.profilePictureUrl);

  const upload = useUpload("avatars");
  const [uploadFailed, setUploadFailed] = useState(false);

  const submitting = pending || upload.isPending;
  const canSubmit = fullName.trim().length > 0 && email.trim().length > 0 && !submitting;

  async function handleFile(file: File) {
    setUploadFailed(false);
    try {
      const url = await upload.mutateAsync(file);
      setAvatarUrl(url);
    } catch {
      setUploadFailed(true);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const body: UpdateAdminRequest = {};
    if (fullName.trim() !== admin.fullName) body.fullName = fullName.trim();
    if (email.trim().toLowerCase() !== admin.email) body.email = email.trim();
    if (avatarUrl !== admin.profilePictureUrl) body.profilePictureUrl = avatarUrl;
    onSubmit(body);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !submitting && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("edit.title")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="size-16 ring-1 ring-border">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName} />}
              <AvatarFallback className="bg-muted text-sm font-semibold">
                {fullName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-input px-3 py-2 text-sm text-muted-foreground hover:bg-accent/40">
              {upload.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              <span>{t("edit.changeAvatar")}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </label>
          </div>
          {uploadFailed ? (
            <p className="text-xs text-destructive">{t("edit.uploadFailed")}</p>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-fullName">{t("form.fullName")}</Label>
            <Input
              id="edit-fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-email">{t("form.email")}</Label>
            <Input
              id="edit-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              {tCommon("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
