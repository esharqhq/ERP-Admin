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
import { MoreHorizontal, ShieldCheck, UserX } from "lucide-react";
import { ChangeRoleModal } from "./change-role-modal";
import { DeactivateConfirm } from "./deactivate-confirm";
import type { AdminSummaryDto, AdminRoleCode } from "@/lib/types/admin-user.types";

interface Props {
  admin: AdminSummaryDto;
  isSelf: boolean;
  onChangeRole: (id: string, roleCode: AdminRoleCode) => void;
  onDeactivate: (id: string, reason?: string) => void;
  isChangingRole: boolean;
  isDeactivating: boolean;
}

const roleBadgeVariant: Record<AdminRoleCode, "default" | "secondary"> = {
  SUPER_ADMIN: "default",
  MODERATOR: "secondary",
};

const roleLabel: Record<AdminRoleCode, string> = {
  SUPER_ADMIN: "Super Admin",
  MODERATOR: "Moderator",
};

export function AdminRow({
  admin,
  isSelf,
  onChangeRole,
  onDeactivate,
  isChangingRole,
  isDeactivating,
}: Props) {
  const [showChangeRole, setShowChangeRole] = useState(false);
  const [showDeactivate, setShowDeactivate] = useState(false);

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
                <span className="ml-1.5 text-[10px] text-muted-foreground">(siz)</span>
              )}
            </span>
            <span className="text-[11px] text-muted-foreground">{admin.email}</span>
          </div>
        </div>
      </TableCell>

      <TableCell>
        <Badge variant={roleBadgeVariant[admin.roleCode]}>
          {roleLabel[admin.roleCode]}
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
            <DropdownMenuItem onClick={() => setShowChangeRole(true)}>
              <ShieldCheck className="mr-2 size-4" />
              Rolni o&apos;zgartirish
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setShowDeactivate(true)}
              disabled={isSelf}
              className="text-destructive focus:text-destructive"
            >
              <UserX className="mr-2 size-4" />
              Deactivate
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>

      <ChangeRoleModal
        open={showChangeRole}
        onClose={() => setShowChangeRole(false)}
        onConfirm={(roleCode) => {
          onChangeRole(admin.id, roleCode);
          setShowChangeRole(false);
        }}
        isPending={isChangingRole}
        adminName={admin.fullName}
        currentRole={admin.roleCode}
      />
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
    </TableRow>
  );
}
