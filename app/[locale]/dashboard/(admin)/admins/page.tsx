"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTableCard } from "@/components/ui/data-table-card";
import { Skeleton } from "@/components/ui/skeleton";
import { UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAdmins, useCreateAdmin, useDeactivateAdmin } from "@/hooks/use-admins";
import { useCreateRole } from "@/hooks/use-permissions";
import { AdminRow } from "@/components/admins/admin-row";
import { AdminDrawer } from "@/components/admins/admin-drawer";
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

  function handleCreate(data: {
    fullName: string;
    email: string;
    password: string;
    permissionNames: string[];
  }) {
    setEmailError(undefined);

    createRole(
      {
        code: `custom_${crypto.randomUUID()}`,
        name: data.fullName,
        appliesTo: "ADMIN",
        isDefault: false,
        permissionNames: data.permissionNames,
      },
      {
        onSuccess: (createdRole) => {
          createAdmin(
            {
              fullName: data.fullName,
              email: data.email,
              password: data.password,
              roleCode: createdRole.code ?? "",
            },
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
        },
      },
    );
  }

  function handleDeactivate(id: string, reason?: string) {
    deactivateAdmin({ id, body: { reason } });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
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
            <Button size="sm" className="gap-2" onClick={() => setShowCreate(true)}>
              <UserPlus className="size-4" />
              <span>{t("newAdmin")}</span>
            </Button>
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

      <AdminDrawer
        open={showCreate}
        onClose={() => { setShowCreate(false); setEmailError(undefined); }}
        onConfirm={handleCreate}
        isPending={isPending}
        emailError={emailError}
      />
    </div>
  );
}
