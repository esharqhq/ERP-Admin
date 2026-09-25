"use client";

import { useTranslations } from "next-intl";
import { CountryCityField } from "@/components/location/country-city-field";

/**
 * The walk-in order's own city (F-07 ·9b, `task-lifecycle.md` §0h) — the shared
 * `CountryCityField` with the walk-in copy fixed. The two-select behaviour (no
 * default country, active rows only, a new country clears the city) is
 * documented there; the property dialogs use the same field with their own copy.
 */
export function WalkInCityField({
  countryId,
  cityId,
  onChange,
  disabled,
  idPrefix = "wi",
}: {
  countryId: string;
  cityId: string;
  onChange: (next: { countryId: string; cityId: string }) => void;
  disabled: boolean;
  /** Keeps the element ids unique when the clone dialog mounts beside the walk-in form. */
  idPrefix?: string;
}) {
  const t = useTranslations("walkIn.form");

  return (
    <CountryCityField
      countryId={countryId}
      cityId={cityId}
      onChange={onChange}
      disabled={disabled}
      idPrefix={idPrefix}
      labels={{
        country: t("country"),
        countryPlaceholder: t("countryPlaceholder"),
        city: t("city"),
        cityPlaceholder: t("cityPlaceholder"),
      }}
      hint={t("cityHint")}
    />
  );
}
