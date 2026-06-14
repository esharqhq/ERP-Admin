"use client";

import { MapPin, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useTranslations } from "next-intl";
import type { PropertyDto } from "@/lib/types/property.types";

export function PropertyMapCard({ property }: { property: PropertyDto }) {
  const t = useTranslations("properties");
  const { lat, long } = property;

  // Small bounding box around the point so the marker renders at a street-level zoom.
  const delta = 0.0025;
  const bbox = [long - delta, lat - delta, long + delta, lat + delta].join(",");
  const embedSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${long}`;
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
      <CardContent>
        <div className="overflow-hidden rounded-lg border">
          <iframe
            title={t("map.title")}
            src={embedSrc}
            className="h-72 w-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </CardContent>
    </Card>
  );
}
