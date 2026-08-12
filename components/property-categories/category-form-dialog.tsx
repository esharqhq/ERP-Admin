"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isHexColor, normalizeHexColor } from "@/lib/properties/category-color";
import type { PropertyCategoryDto } from "@/lib/types/lookup.types";

export interface CategoryFormValues {
  code: string;
  nameDe: string;
  nameEn: string;
  color: string;
  description: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** Edit mode when a category is passed; create mode when null. */
  category: PropertyCategoryDto | null;
  pending: boolean;
  /** Localized parent-mutation error. */
  error?: string | null;
  onSubmit: (values: CategoryFormValues) => void;
}

/**
 * `icon` is deliberately not collected. The backend stores it as free text, but
 * nothing in this app can turn an arbitrary string into a rendered icon — and a
 * field whose value no screen ever reads is worse than an absent one. Colour is
 * collected because the property table's category badge does resolve and render
 * it.
 */
export function CategoryFormDialog({
  open,
  onClose,
  category,
  pending,
  error,
  onSubmit,
}: Props) {
  const t = useTranslations("propertyCategories");
  const tCommon = useTranslations("common");
  const isEdit = !!category;

  const [code, setCode] = useState(category?.code ?? "");
  const [nameEn, setNameEn] = useState(category?.nameEn ?? "");
  const [nameDe, setNameDe] = useState(category?.nameDe ?? "");
  const [color, setColor] = useState(category?.color ?? "");
  const [description, setDescription] = useState(category?.description ?? "");

  const colorValid = color.trim() === "" || isHexColor(color);

  // Both names are [Required] server-side; code only matters on create, where it
  // is permanent.
  const canSubmit =
    nameEn.trim().length > 0 &&
    nameDe.trim().length > 0 &&
    (isEdit || code.trim().length > 0) &&
    colorValid &&
    !pending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !pending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? t("form.editTitle") : t("form.createTitle")}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">{t("form.code")}</label>
            {isEdit ? (
              <p className="rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-sm">
                {category.code}
              </p>
            ) : (
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder={t("form.codePlaceholder")}
                maxLength={50}
                className="font-mono"
                autoFocus
              />
            )}
            <p className="text-xs text-muted-foreground">
              {isEdit ? t("form.codeImmutable") : t("form.codeHint")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">{t("form.nameEn")}</label>
              <Input
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">{t("form.nameDe")}</label>
              <Input
                value={nameDe}
                onChange={(e) => setNameDe(e.target.value)}
                maxLength={100}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">{t("form.color")}</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                aria-label={t("form.color")}
                value={normalizeHexColor(color) ?? "#64748b"}
                onChange={(e) => setColor(e.target.value)}
                className="size-9 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-1"
              />
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#64748b"
                maxLength={32}
                className="font-mono"
              />
              {color.trim() !== "" && (
                <Button variant="ghost" size="sm" onClick={() => setColor("")}>
                  {tCommon("clear")}
                </Button>
              )}
            </div>
            {!colorValid ? (
              <p className="text-xs text-destructive">{t("form.colorInvalid")}</p>
            ) : (
              <p className="text-xs text-muted-foreground">{t("form.colorHint")}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">{t("form.description")}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder={t("form.descriptionPlaceholder")}
              className="resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            {tCommon("cancel")}
          </Button>
          <Button
            onClick={() =>
              onSubmit({
                code: code.trim(),
                nameEn: nameEn.trim(),
                nameDe: nameDe.trim(),
                color: color.trim(),
                description: description.trim(),
              })
            }
            disabled={!canSubmit}
          >
            {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {isEdit ? tCommon("save") : t("form.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
