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
import { buildAgencyCreate, emptyAgencyForm } from "@/lib/agencies/form";
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
  const tCommon = useTranslations("common");
  const [form, setForm] = useState(emptyAgencyForm());

  /**
   * The six required fields, client-side. Not a substitute for the server's
   * validation — a missing field there is problem-details with no `error` code —
   * but it keeps the common case out of a round trip.
   */
  const complete =
    form.legalName.trim() !== "" &&
    form.registrationNumber.trim() !== "" &&
    form.countryId !== "" &&
    form.cityId !== "" &&
    form.contactPersonName.trim() !== "" &&
    form.contactEmail.trim() !== "";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>

        <AgencyFormFields
          value={form}
          onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
        />

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            {tCommon("cancel")}
          </Button>
          <Button
            disabled={pending || !complete}
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
