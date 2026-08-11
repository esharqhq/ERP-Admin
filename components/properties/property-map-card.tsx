"use client";

import dynamic from "next/dynamic";
import { MapPin, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";
import type { PropertyDto } from "@/lib/types/property.types";

// Was an OpenStreetMap `export/embed.html` iframe. Now the same Leaflet map the
// create/edit picker uses, in read-only mode: leaflet is already bundled for
// those, so this costs no new weight and the two maps finally look alike — the
// iframe rendered OSM's own controls and styling, which matched nothing else.
// Client-only for the same reason as the picker: leaflet touches `window` while
// its module is evaluating.
const LocationMap = dynamic(
  () => import("@/components/properties/location-map").then((m) => m.LocationMap),
  { ssr: false, loading: () => <Skeleton className="h-full w-full" /> },
);

export function PropertyMapCard({ property }: { property: PropertyDto }) {
  const t = useTranslations("properties");
  const { lat, long } = property;

  const externalUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${long}#map=16/${lat}/${long}`;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <h2 className="flex items-center gap-2 font-heading text-base font-semibold tracking-tight">
          <MapPin className="size-4 text-muted-foreground" />
          {t("map.title")}
        </h2>
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {t("map.viewLarger")}
          <ExternalLink className="size-3.5" />
        </a>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="overflow-hidden rounded-lg border">
          <LocationMap value={{ lat, long }} readOnly className="h-72 w-full" />
        </div>
        {/* The coordinates moved here from the info card: they belong to the
            map, and repeating them as a plain row beside it was the same fact
            twice. */}
        <p className="text-[11px] tabular-nums text-muted-foreground">
          {lat.toFixed(6)}, {long.toFixed(6)}
        </p>
      </CardContent>
    </Card>
  );
}
