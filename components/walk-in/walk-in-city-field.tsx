"use client";

import { useLocale, useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCities, useCountries } from "@/hooks/use-lookups";

/**
 * The walk-in order's own city (F-07 ·9b, `task-lifecycle.md` §0h) — two selects,
 * because cities are only ever served per country
 * (`GET /api/countries/{id}/cities`; there is no flat list).
 *
 * No default country, on purpose: a hard-coded "Germany" would be a value this
 * app mirrors from data the API owns, and it would silently go stale.
 *
 * Only **active** rows are offered. A deactivated city is refused at the create
 * door (`400 city_inactive`), so listing it would offer an answer that fails.
 *
 * Picking a country clears the city: a city id from the old country would be a
 * value no longer in the list, and the trigger would render it as a raw GUID.
 */
export function WalkInCityField({
  countryId,
  cityId,
  onChange,
  disabled,
}: {
  countryId: string;
  cityId: string;
  onChange: (next: { countryId: string; cityId: string }) => void;
  disabled: boolean;
}) {
  const t = useTranslations("walkIn.form");
  const locale = useLocale();

  const { data: countries = [] } = useCountries();
  const { data: cities = [] } = useCities(countryId || undefined);

  const name = (row: { nameEn: string; nameDe: string }) =>
    locale === "de" ? row.nameDe : row.nameEn;

  // ⚠ `items` is required: without it Base UI's `SelectValue` renders the raw
  // id in the closed trigger (see `agency-form-fields.tsx`).
  const countryItems = countries
    .filter((c) => c.isActive)
    .map((c) => ({ value: c.id, label: name(c) }));
  const cityItems = cities
    .filter((c) => c.isActive)
    .map((c) => ({ value: c.id, label: name(c) }));

  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="wi-country">{t("country")}</Label>
          <Select
            items={countryItems}
            value={countryId}
            // `?? ""`: clearing hands back `null`, and the draft is all strings
            // so every control stays controlled.
            onValueChange={(v) => onChange({ countryId: v ?? "", cityId: "" })}
            disabled={disabled}
          >
            {/* `w-full`: the trigger's own default is `w-fit`, which collapses
                an empty select to its chevron. */}
            <SelectTrigger id="wi-country" className="w-full">
              <SelectValue placeholder={t("countryPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {countryItems.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="wi-city">{t("city")}</Label>
          <Select
            items={cityItems}
            value={cityId}
            onValueChange={(v) => onChange({ countryId, cityId: v ?? "" })}
            disabled={disabled || !countryId}
          >
            <SelectTrigger id="wi-city" className="w-full">
              <SelectValue placeholder={t("cityPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {cityItems.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{t("cityHint")}</p>
    </div>
  );
}
