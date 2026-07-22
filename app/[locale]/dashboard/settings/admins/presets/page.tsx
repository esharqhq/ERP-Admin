"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, History, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Can } from "@/components/auth/can";
import { RoleFormDialog, type RoleFormValues } from "@/components/roles/role-form-dialog";
import { RoleHistoryDialog } from "@/components/roles/role-history-dialog";
import { ConfirmDialog } from "@/components/tasks/confirm-dialog";
import {
  useAllRoles,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
} from "@/hooks/use-permissions";
import { getApiErrorCode } from "@/lib/http/api-error";
import { isCustomRoleCode, type RoleDto } from "@/lib/types/admin-user.types";

const CREATE_ERRORS = new Set(["role_code_exists", "invalid_applies_to"]);
const UPDATE_ERRORS = new Set(["system_role_immutable", "role_not_found"]);
const DELETE_ERRORS = new Set([
  "system_role_immutable",
  "role_in_use",
  "role_not_found",
]);

type FormState = { mode: "create" } | { mode: "edit"; role: RoleDto } | null;

export default function PresetsPage() {
  const t = useTranslations("roles");
  const tCommon = useTranslations("common");

  const { data: roles = [], isLoading, isError } = useAllRoles();
  const create = useCreateRole();
  const update = useUpdateRole();
  const remove = useDeleteRole();

  const [form, setForm] = useState<FormState>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoleDto | null>(null);
  const [historyTarget, setHistoryTarget] = useState<RoleDto | null>(null);

  const deleteError =
    deleteTarget && remove.isError
      ? (() => {
          const code = getApiErrorCode(remove.error);
          return code && DELETE_ERRORS.has(code)
            ? t(`errors.${code}`)
            : t("errors.generic");
        })()
      : null;

  const closeDelete = () => {
    setDeleteTarget(null);
    remove.reset();
  };

  // Shared + system presets only. Per-admin custom_* overrides are an
  // implementation detail of admin customization and never listed here.
  const presets = useMemo(
    () =>
      roles.filter((r) => r.appliesTo === "Admin" && !isCustomRoleCode(r.code)),
    [roles],
  );

  const formMut = form?.mode === "edit" ? update : create;
  const formError =
    form && formMut.isError
      ? (() => {
          const code = getApiErrorCode(formMut.error);
          const known = form.mode === "edit" ? UPDATE_ERRORS : CREATE_ERRORS;
          return code && known.has(code) ? t(`errors.${code}`) : t("errors.generic");
        })()
      : null;

  const closeForm = () => {
    setForm(null);
    create.reset();
    update.reset();
  };

  function handleSubmit(values: RoleFormValues) {
    if (form?.mode === "edit") {
      update.mutate(
        {
          roleId: form.role.id,
          body: {
            name: values.name,
            description: values.description,
            permissionNames: values.permissionNames,
          },
        },
        { onSuccess: closeForm },
      );
    } else {
      create.mutate(
        {
          code: values.code,
          name: values.name,
          description: values.description || null,
          appliesTo: "ADMIN",
          isDefault: false,
          permissionNames: values.permissionNames,
        },
        { onSuccess: closeForm },
      );
    }
  }

  function typeBadge(role: RoleDto) {
    if (role.isSystem) return <Badge variant="default">{t("type.system")}</Badge>;
    return <Badge variant="secondary">{t("type.shared")}</Badge>;
  }

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" size="sm" nativeButton={false} className="gap-1.5 self-start" render={<Link href="/dashboard/settings/admins" />}>
        <ArrowLeft className="size-4" />
        {t("backToAdmins")}
      </Button>

      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Can permission="system:role:create">
          <Button onClick={() => setForm({ mode: "create" })}>
            <Plus className="mr-2 size-4" />
            {t("new")}
          </Button>
        </Can>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
          <p className="text-xs text-muted-foreground">
            {isLoading ? tCommon("loading") : tCommon("resultsFound", { count: presets.length })}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.name")}</TableHead>
                <TableHead>{t("columns.code")}</TableHead>
                <TableHead>{t("columns.type")}</TableHead>
                <TableHead>{t("columns.permissions")}</TableHead>
                <TableHead className="text-right">{tCommon("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-8 w-full rounded-md" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-destructive">
                    {tCommon("error")}
                  </TableCell>
                </TableRow>
              ) : presets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    {t("empty")}
                  </TableCell>
                </TableRow>
              ) : (
                presets.map((role) => (
                  <TableRow key={role.id} className="hover:bg-accent/40">
                    <TableCell className="py-3 font-medium">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="size-4 text-muted-foreground" />
                        <span>{role.name}</span>
                      </div>
                      {role.description ? (
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">
                          {role.description}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{role.code}</TableCell>
                    <TableCell>{typeBadge(role)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t("permCount", { count: role.permissions.length })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <Can permission="system:audit:read">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title={t("history.action")}
                            className="text-muted-foreground"
                            onClick={() => setHistoryTarget(role)}
                          >
                            <History className="size-4" />
                          </Button>
                        </Can>
                        <Can permission="system:role:update">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title={role.isSystem ? t("systemImmutable") : tCommon("edit")}
                            className="text-muted-foreground"
                            disabled={role.isSystem}
                            onClick={() => setForm({ mode: "edit", role })}
                          >
                            <Pencil className="size-4" />
                          </Button>
                        </Can>
                        <Can permission="system:role:delete">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title={role.isSystem ? t("systemImmutable") : t("delete.action")}
                            className="text-destructive"
                            disabled={role.isSystem}
                            onClick={() => setDeleteTarget(role)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </Can>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {form && (
        <RoleFormDialog
          open
          role={form.mode === "edit" ? form.role : null}
          pending={formMut.isPending}
          error={formError}
          onClose={closeForm}
          onSubmit={handleSubmit}
        />
      )}

      {historyTarget && (
        <RoleHistoryDialog
          open
          role={historyTarget}
          onClose={() => setHistoryTarget(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          open
          onClose={closeDelete}
          onConfirm={() => remove.mutate(deleteTarget.id, { onSuccess: closeDelete })}
          isPending={remove.isPending}
          title={t("delete.title")}
          description={t("delete.description", { name: deleteTarget.name })}
          confirmLabel={t("delete.action")}
          destructive
          error={deleteError}
        />
      )}
    </div>
  );
}
