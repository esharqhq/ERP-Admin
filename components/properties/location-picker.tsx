"use client";

import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Leaflet touches `window` while its module is still evaluating, so the map has
 * to be loaded on the client only — hence the dynamic import rather than a
 * plain one.
 */
const LocationMap = dynamic(
  () => import("@/components/properties/location-map").then((m) => m.LocationMap),
  {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full" />,
  },
);

export interface LocationPickerProps {
  value: { lat: number; long: number } | null;
  onChange: (lat: number, long: number) => void;
}

/**
 * Pick a property's coordinates by clicking a map, replacing the pair of
 * latitude/longitude number inputs that used to sit here. `lat`/`long` are
 * non-nullable server-side, so a caller must treat `value === null` as "not
 * ready to submit" — there is no other source for them now.
 */
export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const t = useTranslations("properties");

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label className="text-sm font-medium">{t("form.location")}</label>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {value
            ? `${value.lat.toFixed(5)}, ${value.long.toFixed(5)}`
            : t("form.locationEmpty")}
        </span>
      </div>

      <div className="relative overflow-hidden rounded-lg border border-input">
        <LocationMap value={value} onChange={onChange} className="h-64 w-full" />
        {!value && (
          // Above the tiles but click-through, so the hint never blocks the very
          // click it is asking for.
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[400] flex items-center justify-center gap-1.5 bg-background/85 py-1.5 text-[12px] font-medium text-muted-foreground backdrop-blur-sm">
            <MapPin className="size-3.5" />
            {t("form.locationHint")}
          </div>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">{t("form.locationAdjust")}</p>
    </div>
  );
}
