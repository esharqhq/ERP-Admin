"use client";

import type { ReactNode } from "react";
import { useLocale } from "next-intl";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCities, useCountries } from "@/hooks/use-lookups";
import { locationName } from "@/lib/properties/location-fields";

interface LocationRef {
  id: string;
  nameDe: string;
  nameEn: string;
}

/**
 * Country + city, as two selects — because cities are only ever served per
 * country (`GET /api/countries/{id}/cities`; there is no flat list). Shared by the
 * walk-in order (through `WalkInCityField`, which fixes its copy) and the
 * property create/edit dialogs (F-07 ·9b, `f-02c-property-rework.md` §4.1a).
 *
 * No default country, on purpose: a hard-coded "Germany" would be a value this
 * app mirrors from data the API owns, and it would silently go stale.
 *
 * Only **active** rows are offered. A deactivated city is refused wherever a new
 * pair is written (`400 city_inactive`), so listing it would offer an answer that
 * fails — **except** the pair a record already holds (`keep`): the property edit
 * door validates only a *changed* pair, so a property legitimately sitting on a
 * since-deactivated city must keep it as an option, or the form would force a
 * change on save. `keep` also names the stored pair while the lists are still
 * loading, so the trigger never falls back to the raw GUID.
 *
 * Picking a country clears the city: a city id from the old country would be a
 * value no longer in the list, and the trigger would render it as a raw GUID.
 */
export function CountryCityField({
  countryId,
  cityId,
  onChange,
  disabled,
  idPrefix,
  labels,
  hint,
  keep,
  onClear,
}: {
  countryId: string;
  cityId: string;
  onChange: (next: { countryId: string; cityId: string }) => void;
  disabled: boolean;
  /** Keeps the element ids unique when two of these can be mounted at once. */
  idPrefix: string;
  labels: {
    country: string;
    countryPlaceholder: string;
    city: string;
    cityPlaceholder: string;
    /** Required with `onClear`. */
    clear?: string;
  };
  hint?: ReactNode;
  /** The pair a record already holds — offered even when since deactivated. */
  keep?: { country: LocationRef | null; city: LocationRef | null };
  /**
   * Set where "nothing picked" is itself a valid answer (property create: the
   * owner's city). Base UI's Select has no deselect, so without this a started
   * pick could never be taken back.
   */
  onClear?: () => void;
}) {
  const locale = useLocale();

  const { data: countries = [] } = useCountries();
  const { data: cities = [] } = useCities(countryId || undefined);

  const name = (row: LocationRef) => locationName(row, locale) ?? row.id;

  // ⚠ `items` is required: without it Base UI's `SelectValue` renders the raw
  // id in the closed trigger (see `agency-form-fields.tsx`).
  const countryItems = withKept(
    countries.filter((c) => c.isActive).map((c) => ({ value: c.id, label: name(c) })),
    keep?.country ?? null,
    name,
  );
  // The kept city only while its own country is selected — under another
  // country it would be an option from the wrong list.
  const keptCity =
    keep?.city && keep.country && keep.country.id === countryId ? keep.city : null;
  const cityItems = withKept(
    cities.filter((c) => c.isActive).map((c) => ({ value: c.id, label: name(c) })),
    keptCity,
    name,
  );

  const showClear = Boolean(onClear) && Boolean(countryId || cityId);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-country`}>{labels.country}</Label>
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
            <SelectTrigger id={`${idPrefix}-country`} className="w-full">
              <SelectValue placeholder={labels.countryPlaceholder} />
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
          <Label htmlFor={`${idPrefix}-city`}>{labels.city}</Label>
          <Select
            items={cityItems}
            value={cityId}
            onValueChange={(v) => onChange({ countryId, cityId: v ?? "" })}
            disabled={disabled || !countryId}
          >
            <SelectTrigger id={`${idPrefix}-city`} className="w-full">
              <SelectValue placeholder={labels.cityPlaceholder} />
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
      {showClear ? (
        <div className="flex items-start justify-between gap-3">
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : <span />}
          <Button
            type="button"
            variant="ghost"
            // `sm`, not `xs`: `xs` is reserved for table cells and chip rows.
            size="sm"
            className="shrink-0"
            onClick={onClear}
            disabled={disabled}
          >
            <X />
            {labels.clear}
          </Button>
        </div>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/** Prepends the kept row when the active list does not already carry it. */
function withKept(
  items: { value: string; label: string }[],
  kept: LocationRef | null,
  name: (row: LocationRef) => string,
): { value: string; label: string }[] {
  if (!kept || items.some((i) => i.value === kept.id)) return items;
  return [{ value: kept.id, label: name(kept) }, ...items];
}
