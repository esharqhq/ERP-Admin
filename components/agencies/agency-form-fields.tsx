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

/**
 * `BoundBox` is sized for its own file's filter band — `h-8`, `text-xs`, a 10px
 * radius. In a form it has to match `components/ui/input.tsx`, which is `h-10`,
 * `rounded-lg` and full width. The mono face stays: dates are mono everywhere in
 * this console, and `YYYY-MM-DD` is what the wire speaks in both languages.
 */
const DATE_BOX = "h-10 w-full rounded-lg text-sm";

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
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
 * The ten fields, shared by create and edit so a field cannot exist on one form
 * and not the other — which matters more than usual here, because `PUT` **clears
 * `licenceNumber` and `contactPhone` when they are omitted**. A field missing from
 * the edit form would silently erase data on every save.
 *
 * **Layout: eight fields in a two-column grid, then the contract window on its
 * own.** The two dates were originally two more grid cells, and it read badly —
 * each carried a four-or-five-line hint, so the rows went ragged and the one
 * sentence that prevents the feature's first support ticket ended up as small
 * grey text squeezed into half a cell. They are one thing (the window that
 * decides login), they share one note, and the note is the most consequential
 * copy on the form, so they get a section.
 *
 * ⚠ **The label keys are the field names** — `countryId`, not `country`. The
 * submit-reason line lists missing fields by looking each one up as
 * `agencies.form.<fieldName>`, so any divergence between a key and its field
 * would need a second mapping table that could then fall out of step. An i18n
 * key name is invisible to a user; a mapping that drifts is not.
 *
 * Two behaviours the block owns:
 *
 * - ⚠ **Changing the country clears the city.** The city must belong to the
 *   country and the pair is re-validated server-side against the *stored* values,
 *   so moving one without the other is a `400 city_country_mismatch`. The city
 *   select is also disabled until a country is picked — which is why there is no
 *   "the city must belong to the country" hint any more: the control enforces it,
 *   and a hint restating a disabled input is a line of text that never helps.
 * - ⚠ **Dates are `DayControl`, never `<input type="date">`**, which prints in the
 *   browser's locale rather than the page's. `DayControl` also carries the
 *   clearing gesture this form needs: picking the day that is already set clears
 *   it, which is the only way back to "no date".
 */
export function AgencyFormFields({
  value,
  onChange,
  showLoginEmailNote = false,
}: {
  value: AgencyFormState;
  onChange: (patch: Partial<AgencyFormState>) => void;
  /**
   * Whether to explain that `contactEmail` is not the login address.
   *
   * ⚠ **Only the edit form sets this.** On create the two addresses are
   * identical by construction, so the note has nothing to warn about and was
   * spending four lines saying so. After one edit they legitimately differ, and
   * that is where an admin can wrongly believe the edit moved the login.
   */
  showLoginEmailNote?: boolean;
}) {
  const t = useTranslations("agencies.form");
  const locale = useLocale();

  const { data: countries = [] } = useCountries();
  const { data: cities = [] } = useCities(value.countryId || undefined);

  const name = (row: { nameEn: string; nameDe: string }) =>
    locale === "de" ? row.nameDe : row.nameEn;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("legalName")} required>
          <Input
            value={value.legalName}
            maxLength={200}
            onChange={(e) => onChange({ legalName: e.target.value })}
          />
        </Field>

        <Field label={t("registrationNumber")} required>
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

        <Field label={t("contactPersonName")} required>
          <Input
            value={value.contactPersonName}
            maxLength={200}
            onChange={(e) => onChange({ contactPersonName: e.target.value })}
          />
        </Field>

        <Field label={t("countryId")} required>
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
            {/* ⚠ `w-full`: `SelectTrigger`'s own default is `w-fit`, which with an
                empty value collapses the control to just its chevron. */}
            <SelectTrigger className="w-full">
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

        <Field label={t("cityId")} required>
          <Select
            value={value.cityId}
            disabled={!value.countryId}
            onValueChange={(v) => onChange({ cityId: v ?? "" })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("cityPlaceholder")} />
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

        <Field
          label={t("contactEmail")}
          required
          hint={showLoginEmailNote ? t("contactEmailHint") : undefined}
        >
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
      </div>

      {/* The contract window. ⚠ These two dates are not paperwork fields — login
          is decided by them live, on every attempt, so this section is where the
          form says whether the partner can get in at all. */}
      <div className="flex flex-col gap-3 rounded-lg bg-muted/40 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {t("contractHeading")}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("signedOn")}>
            <DayControl
              className={DATE_BOX}
              label={t("signedOn")}
              value={value.signedOn}
              onChange={(day) => onChange({ signedOn: day })}
            />
          </Field>
          <Field label={t("validUntil")}>
            <DayControl
              className={DATE_BOX}
              label={t("validUntil")}
              value={value.validUntil}
              onChange={(day) => onChange({ validUntil: day })}
            />
          </Field>
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {t("contractNote")}
        </p>
      </div>
    </div>
  );
}
