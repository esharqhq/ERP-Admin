// components/admins/admin-form.tsx
"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Loader2, Upload } from "lucide-react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { PermissionCatalogGrid } from "@/components/permissions/permission-catalog-grid";
import { PresetCard } from "@/components/admins/preset-card";
import { useAllRoles } from "@/hooks/use-permissions";
import { useCurrentPermissions } from "@/hooks/use-current-permissions";
import { useUpload } from "@/hooks/use-upload";
import {
  isCustomRoleCode,
  type AdminDetailDto,
  type RoleDto,
  type UpdateAdminRequest,
} from "@/lib/types/admin-user.types";

export interface AdminIdentityCreate {
  fullName: string;
  email: string;
  password: string;
}

export type AdminFormResult =
  | { kind: "identity-only"; identity: UpdateAdminRequest }
  | { kind: "shared"; identity: UpdateAdminRequest | AdminIdentityCreate; roleCode: string }
  | { kind: "custom"; identity: UpdateAdminRequest | AdminIdentityCreate; permissionNames: string[] };

interface Props {
  mode: "create" | "edit";
  open: boolean;
  admin?: AdminDetailDto;
  isPending: boolean;
  error?: string | null;
  emailError?: string;
  onClose: () => void;
  onSubmit: (result: AdminFormResult) => void;
}

/** Sentinel preset-card code for the hand-pick ("Custom") card. */
const CUSTOM = "__custom__";

/**
 * Preset-first admin create/edit form. Identity on top, access-preset cards
 * next, the full permission grid collapsed below — the common path
 * (pick a preset → Save) needs no scrolling. Replaces AdminDrawer,
 * AdminEditDialog and RoleAssignDialog.
 */
export function AdminForm({
  mode, open, admin, isPending, error, emailError, onClose, onSubmit,
}: Props) {
  const t = useTranslations("admins");
  const tCommon = useTranslations("common");

  const { permissions } = useCurrentPermissions();
  const has = (p: string) => permissions?.has(p) ?? false;
  // Edit mode: without system:role:assign the form is identity-only.
  const showAccess = mode === "create" || has("system:role:assign");
  const showIdentity = mode === "create" || has("admin:update");

  const { data: roles = [], isError: rolesError } = useAllRoles();
  const presets = useMemo(
    () => roles.filter((r) => r.appliesTo === "Admin" && !isCustomRoleCode(r.code)),
    [roles],
  );

  const currentCode = admin?.role?.code ?? null;
  const currentIsCustom = isCustomRoleCode(currentCode);
  const currentFullRole = useMemo(
    () => roles.find((r) => r.id === admin?.role?.id) ?? null,
    [roles, admin?.role?.id],
  );

  const [fullName, setFullName] = useState(admin?.fullName ?? "");
  const [email, setEmail] = useState(admin?.email ?? "");
  const [password, setPassword] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(admin?.profilePictureUrl ?? null);

  // Selected preset card: a shared role code, CUSTOM, or "" (nothing yet).
  const [selectedCode, setSelectedCode] = useState<string>(
    currentIsCustom ? CUSTOM : currentCode ?? "",
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [gridOpen, setGridOpen] = useState(false);
  // True once the grid diverges from the selected shared preset's exact set.
  const [customized, setCustomized] = useState(false);

  // The roles list may still be loading on mount, so seed the grid once the
  // admin's current role resolves — prevents wiping its perms (same pattern
  // as the old RoleAssignDialog).
  const [prefilled, setPrefilled] = useState(false);
  if (!prefilled && mode === "edit" && currentFullRole) {
    setPrefilled(true);
    setSelected(new Set(currentFullRole.permissions));
  }

  const upload = useUpload("avatars");
  const [uploadFailed, setUploadFailed] = useState(false);

  function selectPreset(role: RoleDto) {
    setSelectedCode(role.code);
    setSelected(new Set(role.permissions));
    setCustomized(false);
  }

  function selectCustom() {
    setSelectedCode(CUSTOM);
    setGridOpen(true);
  }

  function handleGridChange(next: Set<string>) {
    setSelected(next);
    if (selectedCode !== CUSTOM) {
      const preset = presets.find((p) => p.code === selectedCode);
      const same =
        !!preset &&
        preset.permissions.length === next.size &&
        preset.permissions.every((p) => next.has(p));
      setCustomized(!same);
    }
  }

  async function handleFile(file: File) {
    setUploadFailed(false);
    try {
      const url = await upload.mutateAsync(file);
      setAvatarUrl(url);
    } catch {
      setUploadFailed(true);
    }
  }

  const isCustomResult = selectedCode === CUSTOM || customized;

  // Edit: did access actually change from the admin's current role?
  const permsChangedFromCurrent =
    !currentFullRole ||
    currentFullRole.permissions.length !== selected.size ||
    !currentFullRole.permissions.every((p) => selected.has(p));
  const accessChanged =
    mode === "create" ||
    (showAccess &&
      (isCustomResult
        ? !currentIsCustom || permsChangedFromCurrent
        : selectedCode !== currentCode));

  const showDetachNote =
    mode === "edit" && showAccess && !currentIsCustom && !!currentCode && isCustomResult;

  const submitting = isPending || upload.isPending;
  const accessValid = !showAccess
    ? true
    : isCustomResult
      ? selected.size > 0
      : !!selectedCode;
  const canSubmit =
    (!showIdentity || (fullName.trim().length > 0 && email.trim().length > 0)) &&
    (mode === "edit" || password.length >= 8) &&
    accessValid &&
    !submitting;

  function identityBody(): UpdateAdminRequest {
    const body: UpdateAdminRequest = {};
    if (admin && showIdentity) {
      if (fullName.trim() !== admin.fullName) body.fullName = fullName.trim();
      if (email.trim().toLowerCase() !== admin.email) body.email = email.trim();
      if (avatarUrl !== admin.profilePictureUrl) body.profilePictureUrl = avatarUrl;
    }
    return body;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    if (mode === "create") {
      const identity: AdminIdentityCreate = {
        fullName: fullName.trim(),
        email: email.trim(),
        password,
      };
      onSubmit(
        isCustomResult
          ? { kind: "custom", identity, permissionNames: Array.from(selected) }
          : { kind: "shared", identity, roleCode: selectedCode },
      );
      return;
    }

    const identity = identityBody();
    if (!accessChanged) {
      onSubmit({ kind: "identity-only", identity });
    } else if (isCustomResult) {
      onSubmit({ kind: "custom", identity, permissionNames: Array.from(selected) });
    } else {
      onSubmit({ kind: "shared", identity, roleCode: selectedCode });
    }
  }

  const currentPresetName =
    presets.find((p) => p.code === currentCode)?.name ?? admin?.role?.name ?? "";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !submitting && onClose()}>
      <DialogContent className="flex max-h-[90vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b border-border px-6 pt-6 pb-4">
          <DialogTitle>
            {mode === "create" ? t("createTitle") : t("edit.title")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6">
            <div className="flex flex-col gap-5 py-4">
              {showIdentity && (
                <section className="flex flex-col gap-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    {t("form.identitySection")}
                  </p>

                  {mode === "edit" && admin && (
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
                  )}
                  {uploadFailed ? (
                    <p className="text-xs text-destructive">{t("edit.uploadFailed")}</p>
                  ) : null}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="af-fullName">{t("form.fullName")}</Label>
                      <Input
                        id="af-fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        placeholder={t("form.fullNamePlaceholder")}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="af-email">{t("form.email")}</Label>
                      <Input
                        id="af-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder={t("form.emailPlaceholder")}
                      />
                      {emailError && <p className="text-xs text-destructive">{emailError}</p>}
                    </div>
                  </div>

                  {mode === "create" && (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="af-password">{t("form.password")}</Label>
                      <Input
                        id="af-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                        placeholder={t("form.passwordPlaceholder")}
                      />
                    </div>
                  )}
                </section>
              )}

              {showAccess && (
                <section className="flex flex-col gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    {t("form.accessSection")}
                  </p>

                  {rolesError ? (
                    <p className="text-sm text-destructive">{t("form.presetsError")}</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {presets.map((p) => (
                        <PresetCard
                          key={p.id}
                          title={p.name}
                          description={p.description}
                          permCount={p.permissions.length}
                          selected={selectedCode === p.code && !customized}
                          recommended={p.isDefault}
                          system={p.isSystem}
                          disabled={submitting}
                          onSelect={() => selectPreset(p)}
                        />
                      ))}
                      <PresetCard
                        custom
                        title={t("form.customCard")}
                        description={t("form.customCardHint")}
                        selected={isCustomResult}
                        disabled={submitting}
                        onSelect={selectCustom}
                      />
                    </div>
                  )}

                  {!selectedCode && !isCustomResult && !rolesError && (
                    <p className="text-xs text-muted-foreground">{t("form.noPreset")}</p>
                  )}

                  <button
                    type="button"
                    onClick={() => setGridOpen((v) => !v)}
                    className="flex items-center gap-1.5 self-start text-sm font-medium text-muted-foreground hover:text-foreground"
                  >
                    <ChevronDown className={cn("size-4 transition-transform", gridOpen && "rotate-180")} />
                    {t("form.customizeToggle", { count: selected.size })}
                  </button>

                  {gridOpen && (
                    <PermissionCatalogGrid
                      selected={selected}
                      onChange={handleGridChange}
                      disabled={submitting}
                    />
                  )}

                  {showDetachNote && (
                    <p className="rounded-lg border border-border bg-accent/40 px-3 py-2 text-xs text-muted-foreground">
                      {t("form.detachNote", { name: admin?.fullName ?? "", preset: currentPresetName })}
                    </p>
                  )}
                </section>
              )}

              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>
          </div>

          <DialogFooter className="mx-0 mb-0 shrink-0 rounded-none border-t border-border px-6 py-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              {mode === "create" ? t("form.create") : tCommon("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
