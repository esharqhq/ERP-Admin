import { Layers, Key, DoorOpen, Ruler } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { InfoRow } from "@/components/owners/info-row";
import { useLocale, useTranslations } from "next-intl";
import type { PropertyDto } from "@/lib/types/property.types";

/**
 * The property's measurements and access notes.
 *
 * Three rows that used to be here are gone rather than restyled: `address` and
 * the category are both already in the hero directly above, and the raw
 * coordinates now sit under the map that renders them. Each was the same fact
 * printed twice on one screen.
 */
export function PropertyInfo({ property }: { property: PropertyDto }) {
  const t = useTranslations("properties");
  const locale = useLocale();

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
