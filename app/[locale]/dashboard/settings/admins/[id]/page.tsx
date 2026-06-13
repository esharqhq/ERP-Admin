"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowLeft, BadgeCheck, Pencil, ShieldCheck, UserX, KeyRound,
} from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Can } from "@/components/auth/can";
import { AdminEditDialog } from "@/components/admins/admin-edit-dialog";
import { RoleAssignDialog } from "@/components/admins/role-assign-dialog";
import { DeactivateConfirm } from "@/components/admins/deactivate-confirm";
import { useAdmin, useUpdateAdmin, useDeactivateAdmin } from "@/hooks/use-admins";
import { getApiErrorCode } from "@/lib/http/api-error";
import { useAuthStore } from "@/store/auth.store";
import { isCustomRoleCode } from "@/lib/types/admin-user.types";

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
  const deactivate = useDeactivateAdmin();

  const currentAdminId = useAuthStore((s) => s.adminMe?.id);
  const isSelf = currentAdminId === id;

  const [showEdit, setShowEdit] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showDeactivate, setShowDeactivate] = useState(false);

  const editError = update.isError
    ? getApiErrorCode(update.error) === "admin_email_exists"
      ? t("errors.emailTaken")
      : t("edit.errors.generic")
    : null;

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
            <Can permission="admin:update">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowEdit(true)}>
                <Pencil className="size-4" />
                {tCommon("edit")}
              </Button>
            </Can>
            <Can permission="system:role:assign">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowAssign(true)}>
                <KeyRound className="size-4" />
                {t("assign.title")}
              </Button>
            </Can>
            <Can permission="admin:deactivate">
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
            </Can>
          </div>
        </CardContent>
      </Card>

      {showEdit && (
        <AdminEditDialog
          open
          admin={admin}
          pending={update.isPending}
          error={editError}
          onClose={() => {
            setShowEdit(false);
            update.reset();
          }}
          onSubmit={(body) =>
            update.mutate(body, {
              onSuccess: () => {
                setShowEdit(false);
                update.reset();
              },
            })
          }
        />
      )}

      {showAssign && (
        <RoleAssignDialog
          open
          adminId={admin.id}
          adminName={admin.fullName}
          currentRole={admin.role}
          onClose={() => setShowAssign(false)}
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
