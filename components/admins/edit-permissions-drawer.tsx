"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
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
  const [syncedKey, setSyncedKey] = useState<string>("");

  const currentKey = open ? `${roleId}-${roles.length}` : "";
  if (currentKey !== syncedKey) {
    setSyncedKey(currentKey);
    if (open) {
      const role = roles.find((r) => r.id === roleId);
      setSelected(new Set(role?.permissions ?? []));
    }
  }

  function handleClose() {
    setSelected(new Set());
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="flex max-h-[90vh] w-full sm:max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle>{adminName} — Permissionlar</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6">
          <div className="py-4">
            <PermissionSwitches selected={selected} onChange={setSelected} />
          </div>
        </div>

        <DialogFooter className="mx-0 mb-0 shrink-0 rounded-none px-6 py-4 border-t border-border">
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
