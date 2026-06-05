"use client";

import { useState } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, KeyRound, UserX } from "lucide-react";
import { DeactivateConfirm } from "./deactivate-confirm";
import { EditPermissionsDrawer } from "./edit-permissions-drawer";
import { useUpdateRolePermissions } from "@/hooks/use-permissions";
import { useTranslations } from "next-intl";
import type { AdminSummaryDto } from "@/lib/types/admin-user.types";

interface Props {
  admin: AdminSummaryDto;
  isSelf: boolean;
  onDeactivate: (id: string, reason?: string) => void;
  isDeactivating: boolean;
}

export function AdminRow({ admin, isSelf, onDeactivate, isDeactivating }: Props) {
  const t = useTranslations("admins");
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);

  const { mutate: updatePermissions, isPending: isUpdating } = useUpdateRolePermissions();

  const isSystemAdmin = admin.roleCode === "SUPER_ADMIN";

  function getRoleLabel(roleCode: string): string {
    if (roleCode === "SUPER_ADMIN") return t("roles.superAdmin");
    if (roleCode === "MODERATOR") return t("roles.moderator");
    return t("roles.subAdmin");
  }

  function getRoleBadgeVariant(roleCode: string): "default" | "secondary" | "outline" {
    if (roleCode === "SUPER_ADMIN") return "default";
    return "secondary";
  }

  return (
    <TableRow className="hover:bg-accent/40">
      <TableCell className="py-3">
        <div className="flex items-center gap-3">
          <Avatar className="size-9 ring-1 ring-border">
            {admin.profilePictureUrl && (
              <AvatarImage src={admin.profilePictureUrl} alt={admin.fullName} />
            )}
            <AvatarFallback className="bg-muted text-[11px] font-semibold">
              {admin.fullName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-sm font-medium">
              {admin.fullName}
              {isSelf && (
                <span className="ml-1.5 text-[10px] text-muted-foreground">{t("deactivate.you")}</span>
              )}
            </span>
            <span className="text-[11px] text-muted-foreground">{admin.email}</span>
          </div>
        </div>
      </TableCell>

      <TableCell>
        <Badge variant={getRoleBadgeVariant(admin.roleCode)}>
          {getRoleLabel(admin.roleCode)}
        </Badge>
      </TableCell>

      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon" className="size-8" />}
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => setShowPermissions(true)}
              disabled={isSystemAdmin}
            >
              <KeyRound className="mr-2 size-4" />
              {t("form.permissions")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setShowDeactivate(true)}
              disabled={isSelf}
              className="text-destructive focus:text-destructive"
            >
              <UserX className="mr-2 size-4" />
              {t("deactivate.confirm")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>

      <DeactivateConfirm
        open={showDeactivate}
        onClose={() => setShowDeactivate(false)}
        onConfirm={(reason) => {
          onDeactivate(admin.id, reason);
          setShowDeactivate(false);
        }}
        isPending={isDeactivating}
        adminName={admin.fullName}
      />

      <EditPermissionsDrawer
        open={showPermissions}
        onClose={() => setShowPermissions(false)}
        onConfirm={(permissionNames) => {
          updatePermissions(
            { roleId: admin.roleId, body: { permissionNames } },
            { onSuccess: () => setShowPermissions(false) },
          );
        }}
        isPending={isUpdating}
        adminName={admin.fullName}
        roleId={admin.roleId}
      />
    </TableRow>
  );
}
