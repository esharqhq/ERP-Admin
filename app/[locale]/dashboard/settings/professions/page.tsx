"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { EyeOff, Pencil, Plus, RotateCcw } from "lucide-react";
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
import {
  ProfessionFormDialog,
  type ProfessionFormValues,
} from "@/components/professions/profession-form-dialog";
import {
  useProfessions,
  useCreateProfession,
  useUpdateProfession,
  useDeactivateProfession,
  useReactivateProfession,
} from "@/hooks/use-professions";
import { getApiErrorCode } from "@/lib/http/api-error";
import {
  PROTECTED_PROFESSION_CODE,
  professionLabel,
  type ProfessionDto,
} from "@/lib/types/profession.types";
import { cn } from "@/lib/utils";

const FORM_ERRORS = new Set(["code_exists"]);

/**
 * ⚠ **There is no delete.** `DELETE /api/professions/{id}` returns `405` and the
 * old `profession_in_use` refusal is gone with it — FND-1 replaced erasure with
 * `PUT { isActive: false }`, and reactivation is lossless. The one refusal left is
 * `profession_protected`: `GENERAL` is the skill every worker is registered with
 * and it cannot be deactivated.
 */
const DEACTIVATE_ERRORS = new Set(["profession_protected"]);

type FormState = { mode: "create" } | { mode: "edit"; row: ProfessionDto } | null;

export default function ProfessionsPage() {
  const t = useTranslations("professions");
  const tCommon = useTranslations("common");

  const locale = useLocale();
  /*
    `includeInactive` — this is the management screen, and it is the only place a
    deactivated profession may be seen (and reactivated). The parameter is honoured
    only for a caller holding `profession:update`; for anyone else the server
    silently returns the active list, which is the safe direction.
  */
  const { data: professions = [], isLoading, isError } = useProfessions(true);
  const create = useCreateProfession();
  const update = useUpdateProfession();
  const deactivate = useDeactivateProfession();
  const reactivate = useReactivateProfession();

  const [form, setForm] = useState<FormState>(null);
  const [toDeactivate, setToDeactivate] = useState<ProfessionDto | null>(null);

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

  const deactivateError = deactivate.isError
    ? (() => {
        const code = getApiErrorCode(deactivate.error);
        return code && DEACTIVATE_ERRORS.has(code)
          ? t(`errors.${code}`)
          : t("errors.deleteGeneric");
      })()
    : null;

  const closeForm = () => {
    setForm(null);
    create.reset();
    update.reset();
  };

  const closeDeactivate = () => {
    setToDeactivate(null);
    deactivate.reset();
  };

  function handleSubmit(values: ProfessionFormValues) {
    if (form?.mode === "edit") {
      update.mutate(
        {
          id: form.row.id,
          body: {
            nameDe: values.nameDe,
            nameEn: values.nameEn,
            description: values.description,
          },
        },
        { onSuccess: closeForm },
      );
    } else {
      create.mutate(
        {
          code: values.code,
          nameDe: values.nameDe,
          nameEn: values.nameEn,
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
                  <TableRow
                    key={p.id}
                    // Deactivated rows stay legible but recede — they are history
                    // an admin can undo, not rows to hunt for.
                    className={cn("hover:bg-accent/40", !p.isActive && "opacity-55")}
                  >
                    <TableCell className="py-3 font-mono text-sm">{p.code}</TableCell>
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2">
                        {/* ⚠ `nameEn`, never `name` — the rename FND-1 made, which
                            renders `undefined` if it is missed. */}
                        {professionLabel(p, locale)}
                        {!p.isActive && (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {t("inactive")}
                          </span>
                        )}
                      </span>
                    </TableCell>
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
                        {/*
                          ⚠ Gated on `profession:update`, not the retired
                          `profession:delete` (140003) — deactivation is a `PUT`.
                          `GENERAL` has no control at all: the server refuses it,
                          so offering the button would be an affordance that 400s.
                        */}
                        <Can permission="profession:update">
                          {p.code === PROTECTED_PROFESSION_CODE ? null : p.isActive ? (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title={t("deactivate.action")}
                              className="text-destructive"
                              onClick={() => setToDeactivate(p)}
                            >
                              <EyeOff className="size-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title={t("reactivate.action")}
                              className="text-muted-foreground"
                              disabled={reactivate.isPending}
                              onClick={() => reactivate.mutate(p.id)}
                            >
                              <RotateCcw className="size-4" />
                            </Button>
                          )}
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

      {toDeactivate && (
        <ConfirmDialog
          open
          title={t("deactivate.title")}
          // Says what actually happens: hidden from pickers, kept on the workers
          // who already hold it, and reversible.
          description={t("deactivate.confirm", {
            name: professionLabel(toDeactivate, locale),
          })}
          confirmLabel={t("deactivate.action")}
          destructive
          isPending={deactivate.isPending}
          error={deactivateError}
          onClose={closeDeactivate}
          onConfirm={() =>
            deactivate.mutate(toDeactivate.id, { onSuccess: closeDeactivate })
          }
        />
      )}
    </div>
  );
}
