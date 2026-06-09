// components/admins/role-assign-dialog.tsx
"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PermissionCatalogGrid } from "@/components/permissions/permission-catalog-grid";
import { useAllRoles, useCreateRole, useUpdateRole } from "@/hooks/use-permissions";
import { useAssignAdminRole } from "@/hooks/use-admins";
import { getApiErrorCode } from "@/lib/http/api-error";
import { isCustomRoleCode, type RoleSummaryDto } from "@/lib/types/admin-user.types";

type Mode = "shared" | "custom";

interface Props {
  open: boolean;
  onClose: () => void;
  adminId: string;
  adminName: string;
  currentRole: RoleSummaryDto | null;
}

const ASSIGN_ERRORS = new Set(["invalid_admin_role", "admin_not_found"]);
const ROLE_ERRORS = new Set(["role_code_exists", "system_role_immutable", "role_not_found"]);

export function RoleAssignDialog({ open, onClose, adminId, adminName, currentRole }: Props) {
  const t = useTranslations("admins");
  const tCommon = useTranslations("common");

  const { data: roles = [] } = useAllRoles();
  const assign = useAssignAdminRole(adminId);
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();

  const sharedRoles = useMemo(
    () => roles.filter((r) => r.appliesTo === "Admin" && !isCustomRoleCode(r.code)),
    [roles],
  );

  const currentIsCustom = isCustomRoleCode(currentRole?.code);
  const currentFullRole = useMemo(
    () => roles.find((r) => r.id === currentRole?.id) ?? null,
    [roles, currentRole?.id],
  );

  const [mode, setMode] = useState<Mode>(currentIsCustom ? "custom" : "shared");
  const [roleCode, setRoleCode] = useState("");
  const [selected, setSelected] = useState<Set<string>>(
    new Set(currentIsCustom ? currentFullRole?.permissions ?? [] : []),
  );

  // The roles list may still be loading when this dialog mounts, so the custom
  // grid can't be prefilled from the initializer alone. Sync once the current
  // (custom-override) role resolves — prevents accidentally wiping its perms.
  const [prefilled, setPrefilled] = useState(false);
  if (!prefilled && currentIsCustom && currentFullRole) {
    setPrefilled(true);
    setSelected(new Set(currentFullRole.permissions));
  }

  const pending = assign.isPending || createRole.isPending || updateRole.isPending;

  const error =
    assign.isError || createRole.isError || updateRole.isError
      ? (() => {
          const code =
            getApiErrorCode(assign.error) ??
            getApiErrorCode(createRole.error) ??
            getApiErrorCode(updateRole.error);
          if (code && (ASSIGN_ERRORS.has(code) || ROLE_ERRORS.has(code))) {
            return t(`assign.errors.${code}`);
          }
          return t("assign.errors.generic");
        })()
      : null;

  const canSubmit =
    !pending && (mode === "shared" ? !!roleCode : selected.size > 0);

  function resetMutations() {
    assign.reset();
    createRole.reset();
    updateRole.reset();
  }

  function handleClose() {
    resetMutations();
    onClose();
  }

  function handleSubmit() {
    if (!canSubmit) return;
    resetMutations();

    if (mode === "shared") {
      assign.mutate({ roleCode }, { onSuccess: handleClose });
      return;
    }

    // Custom override path.
    if (currentIsCustom && currentRole) {
      // The current role is this admin's own override (1:1) — edit it in place.
      updateRole.mutate(
        { roleId: currentRole.id, body: { permissionNames: Array.from(selected) } },
        { onSuccess: handleClose },
      );
      return;
    }

    // Mint a fresh custom_<uuid> role, then assign it.
    createRole.mutate(
      {
        code: `custom_${crypto.randomUUID()}`,
        name: adminName,
        appliesTo: "ADMIN",
        isDefault: false,
        permissionNames: Array.from(selected),
      },
      {
        onSuccess: (role) =>
          assign.mutate({ roleCode: role.code }, { onSuccess: handleClose }),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !pending && handleClose()}>
      <DialogContent className="flex max-h-[90vh] w-full sm:max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle>{t("assign.title")}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6">
          <div className="flex flex-col gap-4 py-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("shared")}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  mode === "shared" ? "border-primary bg-primary/5" : "border-border hover:bg-accent/40"
                }`}
              >
                <span className="block font-medium">{t("assign.modeShared")}</span>
                <span className="block text-[11px] text-muted-foreground">
                  {t("assign.modeSharedHint")}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setMode("custom")}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  mode === "custom" ? "border-primary bg-primary/5" : "border-border hover:bg-accent/40"
                }`}
              >
                <span className="block font-medium">{t("assign.modeCustom")}</span>
                <span className="block text-[11px] text-muted-foreground">
                  {currentIsCustom ? t("assign.modeCustomEditHint") : t("assign.modeCustomHint")}
                </span>
              </button>
            </div>

            {mode === "shared" ? (
              <div className="flex flex-col gap-1.5">
                <Label>{t("assign.roleLabel")}</Label>
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
                <PermissionCatalogGrid selected={selected} onChange={setSelected} disabled={pending} />
              </div>
            )}

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
        </div>

        <DialogFooter className="mx-0 mb-0 shrink-0 rounded-none px-6 py-4 border-t border-border">
          <Button variant="outline" onClick={handleClose} disabled={pending}>
            {tCommon("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t("assign.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
