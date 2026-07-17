"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DataTableCard } from "@/components/ui/data-table-card";
import { Skeleton } from "@/components/ui/skeleton";
import { KeyRound, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAdmins, useCreateAdmin, useDeactivateAdmin } from "@/hooks/use-admins";
import { useCreateRole } from "@/hooks/use-permissions";
import { AdminRow } from "@/components/admins/admin-row";
import {
  AdminForm,
  type AdminFormResult,
  type AdminIdentityCreate,
} from "@/components/admins/admin-form";
import { Can } from "@/components/auth/can";
import { useAuthStore } from "@/store/auth.store";

export default function AdminsPage() {
  const t = useTranslations("admins");
  const [showCreate, setShowCreate] = useState(false);
  const [emailError, setEmailError] = useState<string | undefined>();

  const { data: admins = [], isLoading } = useAdmins();
  const { mutate: createAdmin, isPending: isCreatingAdmin } = useCreateAdmin();
  const { mutate: createRole, isPending: isCreatingRole } = useCreateRole();
  const { mutate: deactivateAdmin, isPending: isDeactivating } = useDeactivateAdmin();

  const currentAdminId = useAuthStore((s) => s.adminMe?.id);
  const isPending = isCreatingRole || isCreatingAdmin;

  function finishCreateAdmin(identity: AdminIdentityCreate, roleCode: string) {
    createAdmin(
      { ...identity, roleCode },
      {
        onSuccess: () => setShowCreate(false),
        onError: (err: unknown) => {
          const error = err as { response?: { data?: { error?: string } } };
          if (error?.response?.data?.error === "admin_email_exists") {
            setEmailError(t("errors.emailTaken"));
          }
        },
      },
    );
  }

  function handleCreate(result: AdminFormResult) {
    setEmailError(undefined);
    // In create mode AdminForm never emits "identity-only" and identity is
    // always the full create shape.
    const identity = result.identity as AdminIdentityCreate;

    if (result.kind === "shared") {
      finishCreateAdmin(identity, result.roleCode);
      return;
    }
    if (result.kind === "custom") {
      // Custom override: mint a per-admin custom_<uuid> role, then create the admin on it.
      createRole(
        {
          code: `custom_${crypto.randomUUID()}`,
          name: identity.fullName,
          appliesTo: "ADMIN",
          isDefault: false,
          permissionNames: result.permissionNames,
        },
        {
          onSuccess: (createdRole) => finishCreateAdmin(identity, createdRole.code ?? ""),
        },
      );
    }
  }

  function handleDeactivate(id: string, reason?: string) {
    deactivateAdmin({ id, body: { reason } });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <Can permission="system:permission:read">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            nativeButton={false}
            render={<Link href="/dashboard/settings/admins/presets" />}
          >
            <KeyRound className="size-4" />
            <span>{t("managePresets")}</span>
          </Button>
        </Can>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2 rounded-xl border border-border p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <DataTableCard
          title={t("title")}
          count={admins.length}
          columns={[
            { label: t("columns.admin") },
            { label: t("columns.role") },
            { label: t("columns.actions"), className: "text-right" },
          ]}
          data={admins}
          action={
            <Can permission="admin:create">
              <Button size="sm" className="gap-2" onClick={() => setShowCreate(true)}>
                <UserPlus className="size-4" />
                <span>{t("newAdmin")}</span>
              </Button>
            </Can>
          }
          renderRow={(admin) => (
            <AdminRow
              key={admin.id}
              admin={admin}
              isSelf={admin.id === currentAdminId}
              onDeactivate={handleDeactivate}
              isDeactivating={isDeactivating}
            />
          )}
        />
      )}

      {showCreate && (
        <AdminForm
          mode="create"
          open
          isPending={isPending}
          emailError={emailError}
          onClose={() => { setShowCreate(false); setEmailError(undefined); }}
          onSubmit={handleCreate}
        />
      )}
    </div>
  );
}
