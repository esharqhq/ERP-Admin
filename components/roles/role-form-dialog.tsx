// components/roles/role-form-dialog.tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PermissionCatalogGrid } from "@/components/permissions/permission-catalog-grid";
import type { RoleDto } from "@/lib/types/admin-user.types";

export interface RoleFormValues {
  code: string;
  name: string;
  description: string;
  permissionNames: string[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** Edit mode when a role is passed; create mode when null. */
  role: RoleDto | null;
  pending: boolean;
  error?: string | null;
  onSubmit: (values: RoleFormValues) => void;
}

export function RoleFormDialog({ open, onClose, role, pending, error, onSubmit }: Props) {
  const t = useTranslations("roles");
  const tCommon = useTranslations("common");
  const isEdit = !!role;

  const [code, setCode] = useState(role?.code ?? "");
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [selected, setSelected] = useState<Set<string>>(new Set(role?.permissions ?? []));

  const canSubmit =
    name.trim().length > 0 && (isEdit || code.trim().length > 0) && !pending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      code: code.trim(),
      name: name.trim(),
      description: description.trim(),
      permissionNames: Array.from(selected),
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !pending && onClose()}>
      <DialogContent className="flex max-h-[90vh] w-full sm:max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle>{isEdit ? t("form.editTitle") : t("form.createTitle")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6">
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-1.5">
                <Label>{t("form.code")}</Label>
                {isEdit ? (
                  <p className="rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-sm">
                    {role.code}
                  </p>
                ) : (
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder={t("form.codePlaceholder")}
                    maxLength={50}
                    autoFocus
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  {isEdit ? t("form.codeImmutable") : t("form.codeHint")}
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>{t("form.name")}</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("form.namePlaceholder")}
                  maxLength={100}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>{t("form.description")}</Label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder={t("form.descriptionPlaceholder")}
                  className="resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <Label>{t("form.permissions")}</Label>
                <PermissionCatalogGrid selected={selected} onChange={setSelected} />
              </div>

              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>
          </div>

          <DialogFooter className="mx-0 mb-0 shrink-0 rounded-none px-6 py-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {isEdit ? tCommon("save") : t("form.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
