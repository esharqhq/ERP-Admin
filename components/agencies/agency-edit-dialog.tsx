"use client";

import { useState } from "react";
import { Loader2, TriangleAlert } from "lucide-react";
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
import { useToday } from "@/hooks/use-today";
import {
  agencyFormFrom,
  buildAgencyUpdate,
  endsAccessNow,
  missingRequired,
} from "@/lib/agencies/form";
import type { AgencyDto, UpdateAgencyRequest } from "@/lib/types/agency.types";

/**
 * ⚠ **This form is the on/off switch for a partner's business**, not a paperwork
 * screen. `signedOn` / `validUntil` are re-read on every login and every portal
 * request, so moving the end date into the past ends their access **within one
 * request** — and nothing notifies them.
 *
 * Hence the second step: when `endsAccessNow` is true the primary button does not
 * save, it reveals what the save does and asks again. A phone-number typo and
 * switching off a business must not feel like the same button.
 *
 * ⚠ Every field is present and posted on every save, because `PUT` **clears
 * `licenceNumber` and `contactPhone` when omitted** while keeping the dates and
 * the location ids — `buildAgencyUpdate` is what guarantees it.
 */
export function AgencyEditDialog({
  open,
  onClose,
  agency,
  pending,
  error,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  agency: AgencyDto;
  pending: boolean;
  error?: string | null;
  onSubmit: (body: UpdateAgencyRequest) => void;
}) {
  const t = useTranslations("agencies.edit");
  const tForm = useTranslations("agencies.form");
  const tCommon = useTranslations("common");
  const today = useToday();

  const [form, setForm] = useState(() => agencyFormFrom(agency));
  const [confirming, setConfirming] = useState(false);

  const ending = endsAccessNow(form, agency, today);
  // Edit starts complete, but an operator can empty a required box — and the
  // server refuses that as problem-details with no error code, so it is worth
  // catching here too.
  const missing = missingRequired(form);

  function primary() {
    if (ending && !confirming) {
      setConfirming(true);
      return;
    }
    onSubmit(buildAgencyUpdate(form));
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      {/* See the create dialog: `DialogContent` ends in `sm:max-w-sm`, so the
          override has to carry the same breakpoint prefix to win. */}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>

        <AgencyFormFields
          value={form}
          // ⚠ Edit is the only form where the two addresses can differ.
          showLoginEmailNote
          onChange={(patch) => {
            // Editing anything retracts the confirmation: the sentence the admin
            // agreed to described the form as it was.
            setConfirming(false);
            setForm((f) => ({ ...f, ...patch }));
          }}
        />

        {ending ? (
          <div className="flex gap-2 rounded-lg bg-status-cancelled-tint/60 p-3 text-[13px] text-status-cancelled-deep">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold">{t("endsAccessTitle")}</span>
              <span>{t("endsAccessBody")}</span>
            </div>
          </div>
        ) : null}

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
            variant={ending && confirming ? "destructive" : "default"}
            disabled={pending || missing.length > 0}
            onClick={primary}
          >
            {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {ending && confirming ? t("endsAccessConfirm") : t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
