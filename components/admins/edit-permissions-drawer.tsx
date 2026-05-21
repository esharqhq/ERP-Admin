"use client";

import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PermissionSwitches } from "./permission-switches";
import { useAllRoles } from "@/hooks/use-permissions";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (permissionNames: string[]) => void;
  isPending: boolean;
  adminName: string;
  roleId: string;
}

export function EditPermissionsDrawer({
  open,
  onClose,
  onConfirm,
  isPending,
  adminName,
  roleId,
}: Props) {
  const { data: roles = [] } = useAllRoles();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Mavjud roledan permissionlarni yukla
  useEffect(() => {
    if (!open) return;
    const role = roles.find((r) => r.id === roleId);
    if (role) {
      setSelected(new Set(role.permissions.map((p) => p.name)));
    }
  }, [open, roleId, roles]);

  function handleClose() {
    setSelected(new Set());
    onClose();
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col sm:max-w-lg p-0"
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <SheetTitle>{adminName} — Permissionlar</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="py-4">
            <PermissionSwitches selected={selected} onChange={setSelected} />
          </div>
        </ScrollArea>

        <SheetFooter className="px-6 py-4 border-t border-border">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isPending}
          >
            Bekor qilish
          </Button>
          <Button
            onClick={() => onConfirm(Array.from(selected))}
            disabled={isPending}
          >
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Saqlash
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
