// components/admins/admin-drawer.tsx
"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("admins");
  const tCommon = useTranslations("common");
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
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="flex max-h-[90vh] w-full sm:max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle>{t("createTitle")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6">
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="drawer-fullName">{t("form.fullName")}</Label>
                <Input
                  id="drawer-fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="Alex Miller"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="drawer-email">{t("form.email")}</Label>
                <Input
                  id="drawer-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="alex@erp.com"
                />
                {emailError && (
                  <p className="text-xs text-destructive">{emailError}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="drawer-password">{t("form.password")}</Label>
                <Input
                  id="drawer-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder={t("form.passwordPlaceholder")}
                />
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <p className="text-sm font-medium">{t("form.permissions")}</p>
                <PermissionSwitches selected={selected} onChange={setSelected} />
              </div>
            </div>
          </div>

          <DialogFooter className="mx-0 mb-0 shrink-0 rounded-none px-6 py-4 border-t border-border">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
