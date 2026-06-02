import { MapPin, Layers, Key, Navigation } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { InfoRow } from "@/components/owners/info-row";
import { useTranslations } from "next-intl";
import type { PropertyDto } from "@/lib/types/property.types";

export function PropertyInfo({ property }: { property: PropertyDto }) {
  const t = useTranslations("properties");
  const coords = `${property.lat.toFixed(6)}, ${property.long.toFixed(6)}`;

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
          value={property.address ?? "—"}
        />
        <InfoRow
          icon={<Navigation className="size-3.5" />}
          label={t("info.coordinates")}
          value={coords}
        />
        <InfoRow
          icon={<Layers className="size-3.5" />}
          label={t("info.floors")}
          value={`${property.floorCount} ${t("info.floorUnit")}`}
        />
        {property.entryInstructions !== null && (
          <>
            <Separator />
            <InfoRow
              icon={<Key className="size-3.5" />}
              label={t("info.entryInstructions")}
              value={property.entryInstructions ?? "—"}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
