"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import type { AdminRoleCode } from "@/lib/types/admin-user.types";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (roleCode: AdminRoleCode) => void;
  isPending: boolean;
  adminName: string;
  currentRole: AdminRoleCode;
}

export function ChangeRoleModal({
  open,
  onClose,
  onConfirm,
  isPending,
  adminName,
  currentRole,
}: Props) {
  const [roleCode, setRoleCode] = useState<AdminRoleCode>(currentRole);

  function handleClose() {
    setRoleCode(currentRole);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Rolni o'zgartirish</DialogTitle>
          <DialogDescription>
            <strong>{adminName}</strong> uchun yangi rol tanlang.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Hozirgi rol:</span>
            <Badge variant="secondary">{currentRole}</Badge>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="newRole">Yangi rol</Label>
            <Select
              value={roleCode}
              onValueChange={(v) => setRoleCode(v as AdminRoleCode)}
            >
              <SelectTrigger id="newRole">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MODERATOR">Moderator</SelectItem>
                <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Bekor qilish
          </Button>
          <Button
            onClick={() => onConfirm(roleCode)}
            disabled={isPending || roleCode === currentRole}
          >
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Saqlash
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
