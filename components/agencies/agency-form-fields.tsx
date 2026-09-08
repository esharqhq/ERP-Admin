"use client";

import { useLocale, useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DayControl } from "@/components/ui/date-range-field";
import { useCities, useCountries } from "@/hooks/use-lookups";
import type { AgencyFormState } from "@/lib/agencies/form";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/**
 * The ten fields, shared by create and edit so a field cannot exist on one form
 * and not the other — which matters more than usual here, because `PUT` **clears
 * `licenceNumber` and `contactPhone` when they are omitted**. A field missing from
 * the edit form would silently erase data on every save.
 *
 * Two behaviours the block owns:
 *
 * - ⚠ **Changing the country clears the city.** The city must belong to the
 *   country and the pair is re-validated server-side against the *stored* values,
 *   so moving one without the other is a `400 city_country_mismatch`.
 * - ⚠ **Dates are `DayControl`, never `<input type="date">`**, which prints in the
 *   browser's locale rather than the page's. `DayControl` also carries the
 *   clearing gesture this form needs: picking the day that is already set clears
 *   it, which is the only way back to "no date".
 */
export function AgencyFormFields({
  value,
  onChange,
}: {
  value: AgencyFormState;
  onChange: (patch: Partial<AgencyFormState>) => void;
}) {
  const t = useTranslations("agencies.form");
  const locale = useLocale();

  const { data: countries = [] } = useCountries();
  const { data: cities = [] } = useCities(value.countryId || undefined);

  const name = (row: { nameEn: string; nameDe: string }) =>
    locale === "de" ? row.nameDe : row.nameEn;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={t("legalName")}>
        <Input
          value={value.legalName}
          maxLength={200}
          onChange={(e) => onChange({ legalName: e.target.value })}
        />
      </Field>

      <Field label={t("registrationNumber")}>
        <Input
          value={value.registrationNumber}
          maxLength={100}
          onChange={(e) => onChange({ registrationNumber: e.target.value })}
        />
      </Field>

      <Field label={t("licenceNumber")}>
        <Input
          value={value.licenceNumber}
          maxLength={100}
          onChange={(e) => onChange({ licenceNumber: e.target.value })}
        />
      </Field>

      <Field label={t("contactPersonName")}>
        <Input
          value={value.contactPersonName}
          maxLength={200}
          onChange={(e) => onChange({ contactPersonName: e.target.value })}
        />
      </Field>

      <Field label={t("country")}>
        <Select
          value={value.countryId}
          /*
            ⚠ The city goes with it. See this component's doc comment.

            `?? ""` because this `Select`'s `onValueChange` is typed
            `string | null` — clearing the control hands back `null`, and the
            form state is all strings so that every input stays controlled.
          */
          onValueChange={(v) => onChange({ countryId: v ?? "", cityId: "" })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {countries.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {name(c)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label={t("city")} hint={t("cityHint")}>
        <Select
          value={value.cityId}
          disabled={!value.countryId}
          onValueChange={(v) => onChange({ cityId: v ?? "" })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {cities.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {name(c)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label={t("contactEmail")} hint={t("contactEmailHint")}>
        <Input
          type="email"
          value={value.contactEmail}
          maxLength={256}
          onChange={(e) => onChange({ contactEmail: e.target.value })}
        />
      </Field>

      <Field label={t("contactPhone")}>
        <Input
          value={value.contactPhone}
          maxLength={50}
          onChange={(e) => onChange({ contactPhone: e.target.value })}
        />
      </Field>

      {/* ⚠ The helper text is not decoration: left blank, this creates an account
          that cannot sign in, and the first support ticket the feature generates
          is "we created them and they can't get in". */}
      <Field label={t("signedOn")} hint={t("signedOnHint")}>
        <DayControl
          label={t("signedOn")}
          value={value.signedOn}
          onChange={(day) => onChange({ signedOn: day })}
        />
      </Field>

      <Field label={t("validUntil")} hint={t("validUntilHint")}>
        <DayControl
          label={t("validUntil")}
          value={value.validUntil}
          onChange={(day) => onChange({ validUntil: day })}
        />
      </Field>
    </div>
  );
}
