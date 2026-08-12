"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Pencil, Plus, PowerOff, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  CategoryFormDialog,
  type CategoryFormValues,
} from "@/components/property-categories/category-form-dialog";
import {
  usePropertyCategories,
  useCreatePropertyCategory,
  useUpdatePropertyCategory,
} from "@/hooks/use-lookups";
import { getApiErrorCode } from "@/lib/http/api-error";
import { normalizeHexColor } from "@/lib/properties/category-color";
import { categoryName } from "@/lib/properties/table-rows";
import type { PropertyCategoryDto } from "@/lib/types/lookup.types";

const FORM_ERRORS = new Set(["code_exists"]);

type FormState = { mode: "create" } | { mode: "edit"; row: PropertyCategoryDto } | null;

export default function PropertyCategoriesPage() {
  const t = useTranslations("propertyCategories");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  // Inactive rows included on purpose: this is the only screen that can
  // reactivate one, and it cannot offer that for a row it never sees. The flag
  // is honored only for holders of `property_category:update` — which is this
  // page's own gate, so the two agree.
  const { data: categories = [], isLoading, isError } = usePropertyCategories(true);
  const create = useCreatePropertyCategory();
  const update = useUpdatePropertyCategory();

  const [form, setForm] = useState<FormState>(null);
  const [toToggle, setToToggle] = useState<PropertyCategoryDto | null>(null);

  const formMut = form?.mode === "edit" ? update : create;
  const formError =
    form && formMut.isError
      ? (() => {
          const code = getApiErrorCode(formMut.error);
          return code && FORM_ERRORS.has(code) ? t(`errors.${code}`) : t("errors.generic");
        })()
      : null;

  const toggleError = toToggle && update.isError ? t("errors.toggleGeneric") : null;

  const closeForm = () => {
    setForm(null);
    create.reset();
    update.reset();
  };

  const closeToggle = () => {
    setToToggle(null);
    update.reset();
  };

  // Empty strings become null: the backend reads null as "leave unchanged" on
  // update, and as "no value" on create — either way, never as a blank string.
  const orNull = (v: string) => (v.trim() === "" ? null : v.trim());

  function handleSubmit(values: CategoryFormValues) {
    if (form?.mode === "edit") {
      update.mutate(
        {
          id: form.row.id,
          body: {
            nameEn: values.nameEn,
            nameDe: values.nameDe,
            color: orNull(values.color),
            description: orNull(values.description),
          },
        },
        { onSuccess: closeForm },
      );
    } else {
      create.mutate(
        {
          code: values.code,
          nameEn: values.nameEn,
          nameDe: values.nameDe,
          // Not collected by the form — see the note in CategoryFormDialog.
          icon: null,
          color: orNull(values.color),
          description: orNull(values.description),
        },
        { onSuccess: closeForm },
      );
    }
  }

  const activeCount = categories.filter((c) => c.isActive).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Can permission="property_category:create">
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
              : t("counts", { active: activeCount, total: categories.length })}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.code")}</TableHead>
                <TableHead>{t("columns.name")}</TableHead>
                <TableHead>{t("columns.description")}</TableHead>
                <TableHead>{t("columns.state")}</TableHead>
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
              ) : categories.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    {t("empty")}
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((c) => {
                  const dot = normalizeHexColor(c.color);
                  return (
                    <TableRow
                      key={c.id}
                      className={c.isActive ? "hover:bg-accent/40" : "opacity-60 hover:bg-accent/40"}
                    >
                      <TableCell className="py-3 font-mono text-sm">{c.code}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            aria-hidden
                            className="size-2.5 shrink-0 rounded-full ring-1 ring-inset ring-black/10"
                            style={{ backgroundColor: dot ?? "var(--muted-foreground)" }}
                          />
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium leading-tight">
                              {categoryName(c, locale)}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {c.nameEn} · {c.nameDe}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell
                        className="max-w-[280px] truncate text-sm text-muted-foreground"
                        title={c.description ?? ""}
                      >
                        {c.description || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={c.isActive ? "default" : "outline"} className="font-normal">
                          {c.isActive ? t("state.active") : t("state.inactive")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <Can permission="property_category:update">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title={tCommon("edit")}
                              className="text-muted-foreground"
                              onClick={() => setForm({ mode: "edit", row: c })}
                            >
                              <Pencil className="size-4" />
                            </Button>
                          </Can>
                          {/* Deactivate, never delete: the resource has no DELETE
                              route, precisely so properties already pointing at a
                              category keep resolving. */}
                          <Can permission="property_category:update">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title={c.isActive ? t("deactivate.action") : t("activate.action")}
                              className={c.isActive ? "text-destructive" : "text-emerald-600"}
                              onClick={() => setToToggle(c)}
                            >
                              {c.isActive ? (
                                <PowerOff className="size-4" />
                              ) : (
                                <Power className="size-4" />
                              )}
                            </Button>
                          </Can>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {form && (
        <CategoryFormDialog
          open
          category={form.mode === "edit" ? form.row : null}
          pending={formMut.isPending}
          error={formError}
          onClose={closeForm}
          onSubmit={handleSubmit}
        />
      )}

      {toToggle && (
        <ConfirmDialog
          open
          title={toToggle.isActive ? t("deactivate.title") : t("activate.title")}
          description={
            toToggle.isActive
              ? t("deactivate.confirm", { name: categoryName(toToggle, locale) })
              : t("activate.confirm", { name: categoryName(toToggle, locale) })
          }
          confirmLabel={toToggle.isActive ? t("deactivate.action") : t("activate.action")}
          destructive={toToggle.isActive}
          isPending={update.isPending}
          error={toggleError}
          onClose={closeToggle}
          onConfirm={() =>
            update.mutate(
              { id: toToggle.id, body: { isActive: !toToggle.isActive } },
              { onSuccess: closeToggle },
            )
          }
        />
      )}
    </div>
  );
}
