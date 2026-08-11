import { MapPin, Layers, Key, Navigation, DoorOpen, Ruler, Tag } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { InfoRow } from "@/components/owners/info-row";
import { useLocale, useTranslations } from "next-intl";
import { categoryName } from "@/lib/properties/table-rows";
import type { PropertyDto } from "@/lib/types/property.types";

export function PropertyInfo({ property }: { property: PropertyDto }) {
  const t = useTranslations("properties");
  const locale = useLocale();
  const coords = `${property.lat.toFixed(6)}, ${property.long.toFixed(6)}`;

  // All three measures are nullable since F-02c. Rendered unguarded, a missing
  // one printed the literal "null" next to its unit.
  const num = (v: number | null, unit: string) =>
    v === null ? "—" : `${v.toLocaleString(locale, { maximumFractionDigits: 2 })} ${unit}`;

  return (
    <Card>
      <CardHeader className="pb-3">
        <h2 className="font-heading text-base font-semibold tracking-tight">
          {t("info.title")}
        </h2>
      </CardHeader>
      <CardContent className="flex flex-col gap-3.5">
        <InfoRow
          icon={<MapPin className="size-3.5" />}
          label={t("info.address")}
          value={property.address}
        />
        <InfoRow
          icon={<Tag className="size-3.5" />}
          label={t("columns.category")}
          value={categoryName(property.category, locale)}
        />
        <InfoRow
          icon={<Navigation className="size-3.5" />}
          label={t("info.coordinates")}
          value={coords}
        />
        <InfoRow
          icon={<Layers className="size-3.5" />}
          label={t("info.floors")}
          value={num(property.floorCount, t("info.floorUnit"))}
        />
        <InfoRow
          icon={<DoorOpen className="size-3.5" />}
          label={t("columns.rooms")}
          value={num(property.roomCount, t("info.roomUnit"))}
        />
        <InfoRow
          icon={<Ruler className="size-3.5" />}
          label={t("columns.area")}
          value={num(property.areaSqm, "m²")}
        />
        {property.entryInstructions && (
          <>
            <Separator />
            <InfoRow
              icon={<Key className="size-3.5" />}
              label={t("info.entryInstructions")}
              value={property.entryInstructions}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
