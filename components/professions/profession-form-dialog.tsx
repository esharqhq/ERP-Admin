"use client";

import { useState, type ReactNode } from "react";
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
import { Label } from "@/components/ui/label";
import {
  finalizeProfessionCode,
  normalizeProfessionCode,
} from "@/lib/professions/code";
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

/** Mirrors the `Field` in `components/agencies/agency-form-fields.tsx`. */
function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>
        {label}
        {required ? (
          <span aria-hidden className="text-destructive">
            *
          </span>
        ) : null}
      </Label>
      {children}
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/**
 * ⚠ **The code is a one-way door, and this is the only screen that can warn about
 * it.** `code` is absent from `UpdateProfessionDto` entirely — no route anywhere
 * changes it once the row exists. The warning used to render in *edit* mode only,
 * which is the one moment it cannot help; it belongs here, before the choice.
 *
 * ⚠ **The server rewrites what is typed:** `dto.Code.Trim().ToUpperInvariant()`
 * (`ProfessionService.cs:55`). Left alone, the field showed `window cleaning` while
 * the table then showed `WINDOW CLEANING` — an input lying about its own value. It
 * now normalises as you type, which also guards the UPPER_SNAKE convention the
 * guide names but the server does **not** enforce: nothing server-side rejects a
 * space, so a code with one in it would be permanent.
 *
 * ⚠ **Two name fields, not one.** FND-1 made this a lookup with German *and*
 * English labels, and both are **required** on create — a missing one is ASP.NET
 * model validation, which comes back as problem-details rather than the usual
 * `{error, detail}` this app's error reader understands. Sending one name for both
 * would put an English string on every German screen.
 *
 * Every placeholder is an `e.g.` example. They used to read as values — the German
 * field showed a real German profession name, styled like content — which invites
 * "is this already filled in?". The required markers now carry that job instead.
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

  /**
   * The gate reads the code through `finalizeProfessionCode`, the same function the
   * submit uses — a field holding only `_` passes a bare `.trim()` but finalises to
   * an empty string, which would post a blank code and come back as problem-details.
   */
  const canSubmit =
    nameDe.trim().length > 0 &&
    nameEn.trim().length > 0 &&
    (isEdit || finalizeProfessionCode(code).length > 0) &&
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
          <Field
            label={t("form.code")}
            required={!isEdit}
            hint={isEdit ? t("form.codeImmutable") : t("form.codeHint")}
          >
            {isEdit ? (
              <p className="rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-sm">
                {profession.code}
              </p>
            ) : (
              <Input
                value={code}
                /*
                  Normalised as typed, so the field shows what will actually be
                  stored: the server upper-cases and trims, and a space would
                  survive into a value nothing can ever edit.
                */
                onChange={(e) => setCode(normalizeProfessionCode(e.target.value))}
                placeholder={t("form.codePlaceholder")}
                maxLength={50}
                required
                className="font-mono"
                autoFocus
              />
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("form.nameDe")} required>
              <Input
                value={nameDe}
                onChange={(e) => setNameDe(e.target.value)}
                placeholder={t("form.nameDePlaceholder")}
                maxLength={100}
                required
              />
            </Field>
            <Field label={t("form.nameEn")} required>
              <Input
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder={t("form.nameEnPlaceholder")}
                maxLength={100}
                required
              />
            </Field>
          </div>

          {/*
            No required marker, which is now what says "optional" — the placeholder
            used to carry that word, so it vanished the moment anyone typed.
          */}
          <Field label={t("form.description")}>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder={t("form.descriptionPlaceholder")}
              className="resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </Field>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            {tCommon("cancel")}
          </Button>
          <Button
            onClick={() =>
              onSubmit({
                code: finalizeProfessionCode(code),
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
