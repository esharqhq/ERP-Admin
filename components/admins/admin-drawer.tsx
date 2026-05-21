// components/admins/admin-drawer.tsx
"use client";

import { useState } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PermissionSwitches } from "./permission-switches";

interface AdminFormData {
  fullName: string;
  email: string;
  password: string;
  permissionNames: string[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: AdminFormData) => void;
  isPending: boolean;
  emailError?: string;
}

export function AdminDrawer({ open, onClose, onConfirm, isPending, emailError }: Props) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onConfirm({ fullName, email, password, permissionNames: Array.from(selected) });
  }

  function handleClose() {
    setFullName("");
    setEmail("");
    setPassword("");
    setSelected(new Set());
    onClose();
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-lg p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <SheetTitle>Yangi admin yaratish</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <ScrollArea className="flex-1 px-6">
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="drawer-fullName">To&apos;liq ism</Label>
                <Input
                  id="drawer-fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="Ali Karimov"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="drawer-email">Email</Label>
                <Input
                  id="drawer-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="ali@erp.com"
                />
                {emailError && (
                  <p className="text-xs text-destructive">{emailError}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="drawer-password">Parol</Label>
                <Input
                  id="drawer-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Kamida 8 ta belgi"
                />
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <p className="text-sm font-medium">Permissionlar</p>
                <PermissionSwitches selected={selected} onChange={setSelected} />
              </div>
            </div>
          </ScrollArea>

          <SheetFooter className="px-6 py-4 border-t border-border">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Yaratish
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
