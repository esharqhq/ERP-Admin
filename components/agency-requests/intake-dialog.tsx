"use client";

import { useState, type ReactNode } from "react";
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DocumentUploadPanel } from "@/components/agency-requests/document-upload-panel";
import { useCreateAdminApplication } from "@/hooks/use-agency-applications";
import { useCities, useCountries } from "@/hooks/use-lookups";
import { applicationErrorKey } from "@/lib/agencies/application-errors";
import {
  buildAdminIntake,
  clearCityOnCountry,
  emptyIntakeForm,
  missingIntakeRequired,
  type IntakeFormState,
} from "@/lib/agencies/intake-form";
import { formatDay } from "@/lib/ui/relative-time";
import type { AdminIntakeResponse } from "@/lib/types/agency.types";

/**
 * The second intake door — an agency that phoned or emailed instead of using the
 * public form.
 *
 * ⚠ **The upload token never crosses a route, and that is what shapes this
 * component.** The App Router has no router state; the URL is out, because a
 * token there lands in server logs, browser history and any `Referer`; and a store
 * or context for one value living the lifetime of one dialog is machinery with no
 * owner. So both steps live here: the token never leaves the component that
 * received it, and it is gone when the dialog closes.
 *
 * ⚠ **And it is gone for good.** Closing this is the last moment anyone here
 * holds the plaintext token — the row keeps a hash and there is no resend door.
 * The only route back is the applicant's emailed receipt, valid 14 days and dead
 * the moment the application is decided. Hence step 2's warning names the address
 * that receipt went to: on this door that address is one the admin just typed, so
 * a typo in it means there is no second copy at all.
 *
 * ⚠ **It ends at `Pending`, not approved.** Nothing here creates an agency;
 * approving is a separate act on the application's own screen, deliberately.
 */
export function IntakeDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("agencyRequests.intake");
  const tForm = useTranslations("agencies.form");
  const tErrors = useTranslations("agencyRequests.errors");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const [form, setForm] = useState<IntakeFormState>(emptyIntakeForm);
  const [created, setCreated] = useState<AdminIntakeResponse | null>(null);
  const [done, setDone] = useState(false);
  /**
   * Kept here only so step 2's primary button can say what leaving now *means*:
   * "no scans to attach" while nothing is attached, "finish" once something is.
   * The panel owns the real list — this is a count, not a second copy of it.
   */
  const [attachedCount, setAttachedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const create = useCreateAdminApplication();

  const { data: countries = [] } = useCountries();
  const { data: cities = [] } = useCities(form.countryId || undefined);

  const name = (row: { nameEn: string; nameDe: string }) =>
    locale === "de" ? row.nameDe : row.nameEn;

  /*
    ⚠ `items` is not optional. Base UI's `Select.Value` renders the selected
    *value* unless the root is told how values map to labels — omitting it is what
    printed raw GUIDs in the phase-2 form. Both the trigger and the item list read
    the same array so the two cannot drift.
  */
  const countryItems = countries.map((c) => ({ value: c.id, label: name(c) }));
  const cityItems = cities.map((c) => ({ value: c.id, label: name(c) }));

  const missing = missingIntakeRequired(form);

  function patch(next: Partial<IntakeFormState>) {
    setForm((prev) => ({ ...prev, ...next }));
  }

  function close() {
    setForm(emptyIntakeForm());
    setCreated(null);
    setDone(false);
    setAttachedCount(0);
    setError(null);
    onClose();
  }

  function submit() {
    setError(null);
    create.mutate(buildAdminIntake(form), {
      onSuccess: (res) => setCreated(res),
      onError: (err) => {
        const { key, detail } = applicationErrorKey(err);
        setError(key === "generic" && detail ? detail : tErrors(key));
      },
    });
  }

  const step = done ? 3 : created ? 2 : 1;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      {/* ⚠ `sm:max-w-2xl`: `DialogContent`'s own class ends `sm:max-w-sm`, so an
          unprefixed width loses above 640px — the phase-2 defect. Ten fields. */}
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {step === 1 ? t("subtitle") : t(`step${step}` as "step2")}
          </DialogDescription>
        </DialogHeader>

        {/* ── Step 1: the company ──────────────────────────────────────────── */}
        {step === 1 ? (
          <div className="flex max-h-[60svh] flex-col gap-4 overflow-y-auto pr-1">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={tForm("legalName")} required>
                <Input
                  value={form.legalName}
                  maxLength={200}
                  onChange={(e) => patch({ legalName: e.target.value })}
                />
              </Field>
              <Field label={tForm("registrationNumber")} required>
                <Input
                  value={form.registrationNumber}
                  maxLength={100}
                  onChange={(e) => patch({ registrationNumber: e.target.value })}
                />
              </Field>
              <Field label={tForm("licenceNumber")}>
                <Input
                  value={form.licenceNumber}
                  maxLength={100}
                  onChange={(e) => patch({ licenceNumber: e.target.value })}
                />
              </Field>
              <Field label={tForm("contactPersonName")} required>
                <Input
                  value={form.contactPersonName}
                  maxLength={200}
                  onChange={(e) => patch({ contactPersonName: e.target.value })}
                />
              </Field>

              <Field label={tForm("countryId")} required>
                <Select
                  items={countryItems}
                  value={form.countryId}
                  /* ⚠ The city goes with it: a stale city id under a new country
                     is `city_country_mismatch`. `?? ""` because this
                     `onValueChange` is typed `string | null` and the form state
                     is all strings, so every input stays controlled. */
                  onValueChange={(v) => patch(clearCityOnCountry(form, v ?? ""))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={tForm("countryPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {countryItems.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label={tForm("cityId")} required>
                <Select
                  items={cityItems}
                  value={form.cityId}
                  disabled={!form.countryId}
                  onValueChange={(v) => patch({ cityId: v ?? "" })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={tForm("cityPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {cityItems.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label={tForm("contactEmail")} required>
                <Input
                  type="email"
                  value={form.contactEmail}
                  maxLength={256}
                  onChange={(e) => patch({ contactEmail: e.target.value })}
                />
              </Field>
              <Field label={tForm("contactPhone")}>
                <Input
                  value={form.contactPhone}
                  maxLength={50}
                  onChange={(e) => patch({ contactPhone: e.target.value })}
                />
              </Field>
              <Field label={t("expectedWorkerCount")}>
                <Input
                  type="number"
                  min={0}
                  max={100000}
                  value={form.expectedWorkerCount}
                  onChange={(e) => patch({ expectedWorkerCount: e.target.value })}
                />
              </Field>
            </div>

            <Field label={t("message")}>
              <Textarea
                value={form.message}
                maxLength={4000}
                onChange={(e) => patch({ message: e.target.value })}
                className="min-h-24 text-sm"
              />
            </Field>

            {/* Says what this button does, because "create" here does not mean
                what it means on the agencies screen. */}
            <p className="text-[11.5px] leading-snug text-muted-foreground text-pretty">
              {t("endsPending")}
            </p>
          </div>
        ) : null}

        {/* ── Step 2: their papers ─────────────────────────────────────────── */}
        {step === 2 && created ? (
          <div className="flex max-h-[60svh] flex-col gap-3.5 overflow-y-auto pr-1">
            <div className="flex flex-col gap-1.5 rounded-xl bg-status-pending-tint p-3.5 ring-1 ring-inset ring-status-pending-deep/25">
              <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-status-pending-deep">
                <TriangleAlert aria-hidden className="size-4 shrink-0" />
                {t("step2Warning", { email: created.application.contactEmail })}
              </span>
              <span className="text-[11.5px] leading-snug text-foreground/80">
                {t("tokenExpires", {
                  date: formatDay(created.uploadTokenExpiresAt, locale),
                })}
              </span>
            </div>

            <DocumentUploadPanel
              applicationId={created.application.id}
              uploadToken={created.uploadToken}
              documents={created.application.documents ?? []}
              onUploaded={() => setAttachedCount((n) => n + 1)}
            />
          </div>
        ) : null}

        {/* ── Step 3: done ─────────────────────────────────────────────────── */}
        {step === 3 && created ? (
          <div className="flex flex-col gap-2">
            <span className="flex items-center gap-1.5 text-[13px] font-semibold">
              <CheckCircle2 aria-hidden className="size-4 shrink-0" />
              {t("doneTitle")}
            </span>
            <p className="text-[12.5px] leading-snug text-muted-foreground text-pretty">
              {t("doneBody")}
            </p>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              className="mt-1 w-fit"
              onClick={close}
              render={
                <Link
                  href={`/dashboard/agency-requests/${created.application.id}`}
                />
              }
            >
              {t("openApplication")}
            </Button>
          </div>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {/* The still-needed line, in form order — an operator scanning top to
            bottom meets the fields as the controls appear. */}
        {step === 1 && missing.length > 0 ? (
          <p className="text-[11.5px] text-muted-foreground">
            {tForm("stillNeeded", {
              fields: missing.map((k) => fieldLabel(k, t, tForm)).join(", "),
            })}
          </p>
        ) : null}

        <DialogFooter>
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={close} disabled={create.isPending}>
                {tCommon("cancel")}
              </Button>
              <Button
                onClick={submit}
                disabled={create.isPending || missing.length > 0}
              >
                {create.isPending && (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                )}
                {t("submit")}
              </Button>
            </>
          ) : step === 2 ? (
            /* One button, and its label is the honest description of leaving:
               there is no second act here, and two buttons doing the same thing
               would only imply there was. */
            <Button onClick={() => setDone(true)}>
              {attachedCount > 0 ? t("finish") : t("skip")}
            </Button>
          ) : (
            <Button onClick={close}>{t("finish")}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** The label a required field is named by in the still-needed line. */
function fieldLabel(
  key: string,
  t: ReturnType<typeof useTranslations<"agencyRequests.intake">>,
  tForm: ReturnType<typeof useTranslations<"agencies.form">>,
): string {
  return key === "expectedWorkerCount" || key === "message"
    ? t(key as "message")
    : tForm(key as "legalName");
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-medium text-foreground/80">
        {label}
        {required ? <span aria-hidden className="text-destructive"> *</span> : null}
      </span>
      {children}
    </label>
  );
}
