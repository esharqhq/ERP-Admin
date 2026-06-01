import { MapPin, Layers, Key, Navigation } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { InfoRow } from "@/components/owners/info-row";
import type { PropertyDto } from "@/lib/types/property.types";

export function PropertyInfo({ property }: { property: PropertyDto }) {
  const coords = `${property.lat.toFixed(6)}, ${property.long.toFixed(6)}`;

  return (
    <Card>
      <CardHeader className="pb-3">
        <h2 className="font-heading text-base font-semibold tracking-tight">
          {"Umumiy ma'lumot"}
        </h2>
      </CardHeader>
      <CardContent className="flex flex-col gap-3.5">
        <InfoRow
          icon={<MapPin className="size-3.5" />}
          label="Manzil"
          value={property.address ?? "—"}
        />
        <InfoRow
          icon={<Navigation className="size-3.5" />}
          label="Koordinatalar"
          value={coords}
        />
        <InfoRow
          icon={<Layers className="size-3.5" />}
          label="Qavatlar soni"
          value={`${property.floorCount} qavat`}
        />
        {property.entryInstructions !== null && (
          <>
            <Separator />
            <InfoRow
              icon={<Key className="size-3.5" />}
              label="Kirish yo'riqnomasi"
              value={property.entryInstructions ?? "—"}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
