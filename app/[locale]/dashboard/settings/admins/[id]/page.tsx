"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, BadgeCheck, Pencil, ShieldCheck, UserX } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminForm, type AdminFormResult } from "@/components/admins/admin-form";
import { AdminAccessSection } from "@/components/admins/admin-access-section";
import { DeactivateConfirm } from "@/components/admins/deactivate-confirm";
import {
  useAdmin, useUpdateAdmin, useAssignAdminRole, useDeactivateAdmin,
} from "@/hooks/use-admins";
import {
  useAllRoles, useCreateRole, useUpdateRole, useDeleteRole,
} from "@/hooks/use-permissions";
import { useCurrentPermissions } from "@/hooks/use-current-permissions";
import { getApiErrorCode } from "@/lib/http/api-error";
import { useAuthStore } from "@/store/auth.store";
import { isCustomRoleCode, type UpdateAdminRequest } from "@/lib/types/admin-user.types";

const ACCESS_ERRORS = new Set([
  "invalid_admin_role",
  "admin_not_found",
  "role_code_exists",
  "system_role_immutable",
  "role_not_found",
]);

export default function AdminDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = useTranslations("admins");
  const tCommon = useTranslations("common");
  const { id } = use(params);
  const router = useRouter();

  const { data: admin, isLoading, isError } = useAdmin(id);
  const update = useUpdateAdmin(id);
  const assign = useAssignAdminRole(id);
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const removeRole = useDeleteRole();
  const deactivate = useDeactivateAdmin();

  const currentAdminId = useAuthStore((s) => s.adminMe?.id);
  const isSelf = currentAdminId === id;

  const { permissions } = useCurrentPermissions();
  const has = (p: string) => permissions === null || permissions.has(p);
  // The unified form covers identity (admin:update) AND access (system:role:assign);
  // either permission is enough to open it — the form gates its sections itself.
  const canOpenEdit = has("admin:update") || has("system:role:assign");

  const [showEdit, setShowEdit] = useState(false);
  const [showDeactivate, setShowDeactivate] = useState(false);

  // Effective grants of this admin's role (custom or shared) for the inline
  // read-only Access section. The roles list needs system:permission:read —
  // the section is gated on the same code below.
  const { data: allRoles = [] } = useAllRoles();

  const formPending =
    update.isPending || assign.isPending || createRole.isPending || updateRole.isPending;

  const emailError =
    getApiErrorCode(update.error) === "admin_email_exists"
      ? t("errors.emailTaken")
      : undefined;

  const formError = (() => {
    if (!(update.isError || assign.isError || createRole.isError || updateRole.isError)) {
      return null;
    }
    const code =
      getApiErrorCode(assign.error) ??
      getApiErrorCode(createRole.error) ??
      getApiErrorCode(updateRole.error);
    if (code && ACCESS_ERRORS.has(code)) return t(`assign.errors.${code}`);
    if (emailError) return null; // surfaced inline at the email field instead
    return t("assign.errors.generic");
  })();

  function resetFormMutations() {
    update.reset();
    assign.reset();
    createRole.reset();
    updateRole.reset();
  }

  async function handleFormSubmit(result: AdminFormResult) {
    if (!admin) return;
    resetFormMutations();
    const oldRole = admin.role;

    try {
      // Access first, then identity (spec: no rollback; on failure the form
      // stays open and already-applied steps remain applied).
      if (result.kind === "shared") {
        if (result.roleCode !== oldRole?.code) {
          await assign.mutateAsync({ roleCode: result.roleCode });
          // Best-effort cleanup: the old per-admin custom role is orphaned now.
          if (oldRole && isCustomRoleCode(oldRole.code)) {
            removeRole.mutate(oldRole.id);
          }
        }
      } else if (result.kind === "custom") {
        if (oldRole && isCustomRoleCode(oldRole.code)) {
          // Already this admin's own override (1:1) — edit it in place.
          await updateRole.mutateAsync({
            roleId: oldRole.id,
            body: { permissionNames: result.permissionNames },
          });
        } else {
          // Detach: mint a fresh custom_<uuid> role, then assign it, so the
          // shared preset and its other holders are untouched.
          const role = await createRole.mutateAsync({
            code: `custom_${crypto.randomUUID()}`,
            name: admin.fullName,
            appliesTo: "ADMIN",
            isDefault: false,
            permissionNames: result.permissionNames,
          });
          await assign.mutateAsync({ roleCode: role.code });
        }
      }

      const body = result.identity as UpdateAdminRequest;
      if (Object.keys(body).length > 0) {
        await update.mutateAsync(body);
      }
      setShowEdit(false);
    } catch {
      // Errors surface via the mutations' error state; the form stays open.
    }
  }

  function roleLabel(code: string | null | undefined, name: string | undefined): string {
    if (code === "SUPER_ADMIN") return t("roles.superAdmin");
    if (code === "MODERATOR") return t("roles.moderator");
    if (isCustomRoleCode(code)) return t("roles.custom");
    return name ?? t("roles.subAdmin");
  }

  const BackLink = (
    <Button variant="ghost" size="sm" nativeButton={false} className="gap-1.5" render={<Link href="/dashboard/settings/admins" />}>
      <ArrowLeft className="size-4" />
      {tCommon("back")}
    </Button>
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        {BackLink}
        <Skeleton className="h-44 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !admin) {
    return (
      <div className="flex flex-col gap-6">
        {BackLink}
        <p className="text-sm text-destructive">{tCommon("notFound")}</p>
      </div>
    );
  }

  const roleCode = admin.role?.code ?? null;
  const rolePermissions =
    allRoles.find((r) => r.id === admin.role?.id)?.permissions ?? [];

  return (
    <div className="flex flex-col gap-6">
      {BackLink}

      <Card>
        <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="size-20 ring-1 ring-border">
              {admin.profilePictureUrl && (
                <AvatarImage src={admin.profilePictureUrl} alt={admin.fullName} />
              )}
              <AvatarFallback className="bg-muted text-lg font-semibold">
                {admin.fullName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <h1 className="font-heading text-2xl font-bold tracking-tight">{admin.fullName}</h1>
                {admin.isVerified && (
                  <BadgeCheck className="size-5 text-primary" aria-label={t("verified")} />
                )}
              </div>
              <span className="text-sm text-muted-foreground">{admin.email}</span>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge variant={roleCode === "SUPER_ADMIN" ? "default" : "secondary"} className="gap-1">
                  <ShieldCheck className="size-3" />
                  {roleLabel(roleCode, admin.role?.name)}
                </Badge>
                <span className="text-[11px] text-muted-foreground">
                  {t("detail.created", { date: new Date(admin.createdAt).toLocaleDateString() })}
                </span>
                {admin.updatedAt && (
                  <span className="text-[11px] text-muted-foreground">
                    {t("detail.updated", { date: new Date(admin.updatedAt).toLocaleDateString() })}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {canOpenEdit && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowEdit(true)}>
                <Pencil className="size-4" />
                {tCommon("edit")}
              </Button>
            )}
            {has("admin:deactivate") && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-destructive hover:text-destructive"
                disabled={isSelf}
                title={isSelf ? t("deactivate.cannotSelf") : undefined}
                onClick={() => setShowDeactivate(true)}
              >
                <UserX className="size-4" />
                {t("deactivate.confirm")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {has("system:permission:read") && (
        <AdminAccessSection
          presetLabel={roleLabel(roleCode, admin.role?.name)}
          permissionNames={rolePermissions}
        />
      )}

      {showEdit && (
        <AdminForm
          mode="edit"
          open
          admin={admin}
          isPending={formPending}
          error={formError}
          emailError={emailError}
          onClose={() => {
            setShowEdit(false);
            resetFormMutations();
          }}
          onSubmit={handleFormSubmit}
        />
      )}

      <DeactivateConfirm
        open={showDeactivate}
        onClose={() => setShowDeactivate(false)}
        onConfirm={(reason) =>
          deactivate.mutate(
            { id: admin.id, body: { reason } },
            { onSuccess: () => router.push("/dashboard/settings/admins") },
          )
        }
        isPending={deactivate.isPending}
        adminName={admin.fullName}
      />
    </div>
  );
}
