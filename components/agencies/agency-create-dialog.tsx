"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AgencyFormFields } from "@/components/agencies/agency-form-fields";
import {
  buildAgencyCreate,
  emptyAgencyForm,
  missingRequired,
} from "@/lib/agencies/form";
import type { CreateAgencyRequest } from "@/lib/types/agency.types";

/**
 * ⚠ A `201` means the rows were written and the invitation was **queued**. If the
 * mail never arrives the repair is the re-send action, never a second create —
 * that answers `agency_email_taken`.
 */
export function AgencyCreateDialog({
  open,
  onClose,
  pending,
  error,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  pending: boolean;
  /** Localized parent-mutation error, shown without closing the dialog. */
  error?: string | null;
  onSubmit: (body: CreateAgencyRequest) => void;
}) {
  const t = useTranslations("agencies.create");
  const tForm = useTranslations("agencies.form");
  const tCommon = useTranslations("common");
  const [form, setForm] = useState(emptyAgencyForm());

  /**
   * The six required fields, client-side. Not a substitute for the server's
   * validation — a missing field there is problem-details with no `error` code —
   * but it keeps the common case out of a round trip.
   *
   * ⚠ A disabled button with no explanation is the defect this replaces: the
   * form has ten fields and six of them are required, so "why can I not submit"
   * has to be answerable on the screen rather than by counting asterisks.
   */
  const missing = missingRequired(form);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      {/* ⚠ `sm:max-w-2xl`, not `max-w-2xl`. `DialogContent`'s own base class
          ends in `sm:max-w-sm`, so an unprefixed utility loses to it at every
          width above 640px — which is what shrank this ten-field form into a
          384px column. `admin-form.tsx:214` is the precedent. */}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>

        <AgencyFormFields
          value={form}
          onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
        />

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter className="items-center gap-3">
          {missing.length > 0 ? (
            <p className="mr-auto text-[11px] text-muted-foreground">
              {tForm("stillNeeded", {
                fields: missing.map((k) => tForm(k)).join(", "),
              })}
            </p>
          ) : null}
          <Button variant="outline" onClick={onClose} disabled={pending}>
            {tCommon("cancel")}
          </Button>
          <Button
            disabled={pending || missing.length > 0}
            onClick={() => onSubmit(buildAgencyCreate(form))}
          >
            {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
