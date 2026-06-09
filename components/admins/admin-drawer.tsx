// components/admins/admin-drawer.tsx
"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { PermissionCatalogGrid } from "@/components/permissions/permission-catalog-grid";
import { useAllRoles } from "@/hooks/use-permissions";
import { isCustomRoleCode } from "@/lib/types/admin-user.types";

export type AdminCreateMode = "shared" | "custom";

export interface AdminFormData {
  fullName: string;
  email: string;
  password: string;
  mode: AdminCreateMode;
  /** shared mode: the chosen role code. */
  roleCode?: string;
  /** custom mode: permissions for a new custom-override role. */
  permissionNames?: string[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: AdminFormData) => void;
  isPending: boolean;
  emailError?: string;
}

export function AdminDrawer({ open, onClose, onConfirm, isPending, emailError }: Props) {
  const t = useTranslations("admins");
  const tCommon = useTranslations("common");
  const { data: roles = [] } = useAllRoles();

  const sharedRoles = roles.filter(
    (r) => r.appliesTo === "Admin" && !isCustomRoleCode(r.code),
  );

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<AdminCreateMode>("shared");
  const [roleCode, setRoleCode] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function reset() {
    setFullName("");
    setEmail("");
    setPassword("");
    setMode("shared");
    setRoleCode("");
    setSelected(new Set());
  }

  function handleClose() {
    reset();
    onClose();
  }

  const canSubmit =
    fullName.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 8 &&
    !isPending &&
    (mode === "shared" ? !!roleCode : selected.size > 0);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onConfirm(
      mode === "shared"
        ? { fullName, email, password, mode, roleCode }
        : { fullName, email, password, mode, permissionNames: Array.from(selected) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !isPending && handleClose()}>
      <DialogContent className="flex max-h-[90vh] w-full sm:max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle>{t("createTitle")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6">
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="drawer-fullName">{t("form.fullName")}</Label>
                <Input
                  id="drawer-fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder={t("form.fullNamePlaceholder")}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="drawer-email">{t("form.email")}</Label>
                <Input
                  id="drawer-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder={t("form.emailPlaceholder")}
                />
                {emailError && <p className="text-xs text-destructive">{emailError}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="drawer-password">{t("form.password")}</Label>
                <Input
                  id="drawer-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder={t("form.passwordPlaceholder")}
                />
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Label>{t("form.accessMode")}</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMode("shared")}
                    className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                      mode === "shared"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-accent/40"
                    }`}
                  >
                    <span className="block font-medium">{t("form.modeShared")}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {t("form.modeSharedHint")}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("custom")}
                    className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                      mode === "custom"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-accent/40"
                    }`}
                  >
                    <span className="block font-medium">{t("form.modeCustom")}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {t("form.modeCustomHint")}
                    </span>
                  </button>
                </div>
              </div>

              {mode === "shared" ? (
                <div className="flex flex-col gap-1.5">
                  <Label>{t("form.role")}</Label>
                  <Select value={roleCode} onValueChange={(v) => setRoleCode(v ?? "")}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("form.selectRole")} />
                    </SelectTrigger>
                    <SelectContent>
                      {sharedRoles.map((r) => (
                        <SelectItem key={r.id} value={r.code}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium">{t("form.permissions")}</p>
                  <PermissionCatalogGrid selected={selected} onChange={setSelected} />
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mx-0 mb-0 shrink-0 rounded-none px-6 py-4 border-t border-border">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t("form.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
