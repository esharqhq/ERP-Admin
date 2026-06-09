"use client";

import { useState } from "react";
import Link from "next/link";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, UserX } from "lucide-react";
import { DeactivateConfirm } from "./deactivate-confirm";
import { Can } from "@/components/auth/can";
import { useTranslations } from "next-intl";
import { isCustomRoleCode, type AdminSummaryDto } from "@/lib/types/admin-user.types";

interface Props {
  admin: AdminSummaryDto;
  isSelf: boolean;
  onDeactivate: (id: string, reason?: string) => void;
  isDeactivating: boolean;
}

export function AdminRow({ admin, isSelf, onDeactivate, isDeactivating }: Props) {
  const t = useTranslations("admins");
  const [showDeactivate, setShowDeactivate] = useState(false);

  const roleCode = admin.role?.code ?? null;

  function roleLabel(): string {
    if (roleCode === "SUPER_ADMIN") return t("roles.superAdmin");
    if (roleCode === "MODERATOR") return t("roles.moderator");
    if (isCustomRoleCode(roleCode)) return t("roles.custom");
    return admin.role?.name ?? t("roles.subAdmin");
  }

  const roleVariant: "default" | "secondary" = roleCode === "SUPER_ADMIN" ? "default" : "secondary";

  return (
    <TableRow className="hover:bg-accent/40">
      <TableCell className="py-3">
        <Link href={`/dashboard/admins/${admin.id}`} className="flex items-center gap-3">
          <Avatar className="size-9 ring-1 ring-border">
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
        </Link>
      </TableCell>

      <TableCell>
        <Badge variant={roleVariant}>{roleLabel()}</Badge>
      </TableCell>

      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon" className="size-8" />}
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem render={<Link href={`/dashboard/admins/${admin.id}`} />}>
              <Eye className="mr-2 size-4" />
              {t("viewDetails")}
            </DropdownMenuItem>
            <Can permission="admin:deactivate">
              <DropdownMenuItem
                onClick={() => setShowDeactivate(true)}
                disabled={isSelf}
                className="text-destructive focus:text-destructive"
              >
                <UserX className="mr-2 size-4" />
                {t("deactivate.confirm")}
              </DropdownMenuItem>
            </Can>
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
    </TableRow>
  );
}
