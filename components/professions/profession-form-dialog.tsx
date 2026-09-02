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
import type { ProfessionDto } from "@/lib/types/profession.types";

export interface ProfessionFormValues {
  code: string;
  nameDe: string;
  nameEn: string;
  description: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** Edit mode when a profession is passed; create mode when null. */
  profession: ProfessionDto | null;
  pending: boolean;
  /** Localized parent-mutation error. */
  error?: string | null;
  /** create: code editable; edit: code immutable (ignored). */
  onSubmit: (values: ProfessionFormValues) => void;
}

/**
 * ⚠ **Two name fields, not one.** FND-1 made this a lookup with German *and*
 * English labels, and both are **required** on create — a missing one is ASP.NET
 * model validation, which comes back as problem-details rather than the usual
 * `{error, detail}` this app's error reader understands. Sending one name for both
 * would put an English string on every German screen.
 */
export function ProfessionFormDialog({
  open,
  onClose,
  profession,
  pending,
  error,
  onSubmit,
}: Props) {
  const t = useTranslations("professions");
  const tCommon = useTranslations("common");
  const isEdit = !!profession;

  const [code, setCode] = useState(profession?.code ?? "");
  const [nameDe, setNameDe] = useState(profession?.nameDe ?? "");
  const [nameEn, setNameEn] = useState(profession?.nameEn ?? "");
  const [description, setDescription] = useState(profession?.description ?? "");

  const canSubmit =
    nameDe.trim().length > 0 &&
    nameEn.trim().length > 0 &&
    (isEdit || code.trim().length > 0) &&
    !pending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !pending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("form.editTitle") : t("form.createTitle")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">{t("form.code")}</label>
            {isEdit ? (
              <p className="rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-sm">
                {profession.code}
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
            {isEdit ? (
              <p className="text-xs text-muted-foreground">{t("form.codeImmutable")}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">{t("form.nameDe")}</label>
              <Input
                value={nameDe}
                onChange={(e) => setNameDe(e.target.value)}
                placeholder={t("form.nameDePlaceholder")}
                maxLength={100}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">{t("form.nameEn")}</label>
              <Input
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder={t("form.nameEnPlaceholder")}
                maxLength={100}
              />
            </div>
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
                nameDe: nameDe.trim(),
                nameEn: nameEn.trim(),
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
