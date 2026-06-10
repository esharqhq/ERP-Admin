"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Can } from "@/components/auth/can";
import { ConfirmDialog } from "@/components/tasks/confirm-dialog";
import { ProfessionFormDialog } from "@/components/professions/profession-form-dialog";
import {
  useProfessions,
  useCreateProfession,
  useUpdateProfession,
  useDeleteProfession,
} from "@/hooks/use-professions";
import { getApiErrorCode } from "@/lib/http/api-error";
import type { ProfessionDto } from "@/lib/types/profession.types";

const FORM_ERRORS = new Set(["code_exists"]);
const DELETE_ERRORS = new Set(["profession_in_use"]);

type FormState = { mode: "create" } | { mode: "edit"; row: ProfessionDto } | null;

export default function ProfessionsPage() {
  const t = useTranslations("professions");
  const tCommon = useTranslations("common");

  const { data: professions = [], isLoading, isError } = useProfessions();
  const create = useCreateProfession();
  const update = useUpdateProfession();
  const del = useDeleteProfession();

  const [form, setForm] = useState<FormState>(null);
  const [toDelete, setToDelete] = useState<ProfessionDto | null>(null);

  const formMut = form?.mode === "edit" ? update : create;
  const formError =
    form && formMut.isError
      ? (() => {
          const code = getApiErrorCode(formMut.error);
          return code && FORM_ERRORS.has(code)
            ? t(`errors.${code}`)
            : t("errors.generic");
        })()
      : null;

  const deleteError = del.isError
    ? (() => {
        const code = getApiErrorCode(del.error);
        return code && DELETE_ERRORS.has(code)
          ? t(`errors.${code}`)
          : t("errors.deleteGeneric");
      })()
    : null;

  const closeForm = () => {
    setForm(null);
    create.reset();
    update.reset();
  };

  const closeDelete = () => {
    setToDelete(null);
    del.reset();
  };

  function handleSubmit(values: { code: string; name: string; description: string }) {
    if (form?.mode === "edit") {
      update.mutate(
        { id: form.row.id, body: { name: values.name, description: values.description } },
        { onSuccess: closeForm },
      );
    } else {
      create.mutate(
        {
          code: values.code,
          name: values.name,
          description: values.description || null,
        },
        { onSuccess: closeForm },
      );
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Can permission="profession:create">
          <Button onClick={() => setForm({ mode: "create" })}>
            <Plus className="mr-2 size-4" />
            {t("new")}
          </Button>
        </Can>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <p className="text-xs text-muted-foreground">
            {isLoading
              ? tCommon("loading")
              : tCommon("resultsFound", { count: professions.length })}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.code")}</TableHead>
                <TableHead>{t("columns.name")}</TableHead>
                <TableHead>{t("columns.description")}</TableHead>
                <TableHead className="text-right">{tCommon("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={4}>
                      <Skeleton className="h-8 w-full rounded-md" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-10 text-center text-sm text-destructive"
                  >
                    {tCommon("error")}
                  </TableCell>
                </TableRow>
              ) : professions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    {t("empty")}
                  </TableCell>
                </TableRow>
              ) : (
                professions.map((p) => (
                  <TableRow key={p.id} className="hover:bg-accent/40">
                    <TableCell className="py-3 font-mono text-sm">{p.code}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell
                      className="max-w-[360px] truncate text-sm text-muted-foreground"
                      title={p.description ?? ""}
                    >
                      {p.description || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <Can permission="profession:update">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title={tCommon("edit")}
                            className="text-muted-foreground"
                            onClick={() => setForm({ mode: "edit", row: p })}
                          >
                            <Pencil className="size-4" />
                          </Button>
                        </Can>
                        <Can permission="profession:delete">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title={tCommon("delete")}
                            className="text-destructive"
                            onClick={() => setToDelete(p)}
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
        <ProfessionFormDialog
          open
          profession={form.mode === "edit" ? form.row : null}
          pending={formMut.isPending}
          error={formError}
          onClose={closeForm}
          onSubmit={handleSubmit}
        />
      )}

      {toDelete && (
        <ConfirmDialog
          open
          title={t("delete.title")}
          description={t("delete.confirm", { name: toDelete.name })}
          confirmLabel={tCommon("delete")}
          destructive
          isPending={del.isPending}
          error={deleteError}
          onClose={closeDelete}
          onConfirm={() => del.mutate(toDelete.id, { onSuccess: closeDelete })}
        />
      )}
    </div>
  );
}
