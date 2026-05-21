"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTableCard } from "@/components/ui/data-table-card";
import { Skeleton } from "@/components/ui/skeleton";
import { UserPlus } from "lucide-react";
import {
  useAdmins, useCreateAdmin, useDeactivateAdmin, useChangeAdminRole,
} from "@/hooks/use-admins";
import { AdminRow } from "@/components/admins/admin-row";
import { CreateAdminModal } from "@/components/admins/create-admin-modal";
import { useAuthStore } from "@/store/auth.store";
import type { CreateAdminRequest, AdminRoleCode } from "@/lib/types/admin-user.types";

const columns = [
  { label: "Admin" },
  { label: "Rol" },
  { label: "Amallar", className: "text-right" },
];

export default function AdminsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [emailError, setEmailError] = useState<string | undefined>();

  const { data: admins = [], isLoading } = useAdmins();
  const { mutate: createAdmin, isPending: isCreating } = useCreateAdmin();
  const { mutate: deactivateAdmin, isPending: isDeactivating } = useDeactivateAdmin();
  const { mutate: changeRole, isPending: isChangingRole } = useChangeAdminRole();

  const currentAdminId = useAuthStore((s) => s.adminMe?.sub);

  function handleCreate(data: CreateAdminRequest) {
    setEmailError(undefined);
    createAdmin(data, {
      onSuccess: () => setShowCreate(false),
      onError: (err: unknown) => {
        const error = err as { response?: { data?: { error?: string } } };
        if (error?.response?.data?.error === "admin_email_exists") {
          setEmailError("Bu email allaqachon band.");
        }
      },
    });
  }

  function handleDeactivate(id: string, reason?: string) {
    deactivateAdmin({ id, body: { reason } });
  }

  function handleChangeRole(id: string, roleCode: AdminRoleCode) {
    changeRole({ id, body: { roleCode } });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">
          Adminlar
        </h1>
        <p className="text-sm text-muted-foreground">
          Platforma administratorlarini boshqaring.
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
          title="Adminlar"
          count={admins.length}
          columns={columns}
          data={admins}
          action={
            <Button size="sm" className="gap-2" onClick={() => setShowCreate(true)}>
              <UserPlus className="size-4" />
              <span>Yangi admin</span>
            </Button>
          }
          renderRow={(admin) => (
            <AdminRow
              key={admin.id}
              admin={admin}
              isSelf={admin.id === currentAdminId}
              onChangeRole={handleChangeRole}
              onDeactivate={handleDeactivate}
              isChangingRole={isChangingRole}
              isDeactivating={isDeactivating}
            />
          )}
        />
      )}

      <CreateAdminModal
        open={showCreate}
        onClose={() => { setShowCreate(false); setEmailError(undefined); }}
        onConfirm={handleCreate}
        isPending={isCreating}
        emailError={emailError}
      />
    </div>
  );
}
