import Link from "next/link";
import { Home } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocale, useTranslations } from "next-intl";
import { categoryName } from "@/lib/properties/table-rows";
import type { PropertyDto } from "@/lib/types/property.types";

interface PropertyListProps {
  properties: PropertyDto[];
}

export function PropertyList({ properties }: PropertyListProps) {
  const t = useTranslations("owners");
  const locale = useLocale();

  return (
    <Card>
      {/* The count replaces a "Properties list" subtitle that only restated the
          title, and a "View All" button that went to the *global* properties
          table. This list is already every property this owner holds:
          `GET /api/properties?ownerUserId=` takes no page parameter and returns a
          bare `List<PropertyDto>` (`Backend/index/controllers/properties.md:15`),
          and nothing here caps it. So the button led away from a complete answer
          to a less relevant one while its label promised the opposite. Each row
          still opens its own property. */}
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <h2 className="font-heading text-base font-semibold tracking-tight">
          {t("properties.title")}
        </h2>
        {properties.length > 0 ? (
          <Badge variant="secondary" className="tabular-nums">
            {properties.length}
          </Badge>
        ) : null}
      </CardHeader>

      {properties.length === 0 ? (
        <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
          <Home className="size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{t("properties.empty")}</p>
        </CardContent>
      ) : (
        <CardContent className="flex flex-col gap-2.5">
          {properties.map((property) => (
            <Link
              key={property.id}
              href={`/dashboard/properties/${property.id}`}
              className="group flex items-start gap-3 rounded-lg border border-border bg-card p-2.5 transition-colors hover:border-foreground/15 hover:bg-muted/30"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <Home className="size-3.5" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[13px] font-medium leading-tight">
                  {property.name || t("properties.unnamed")}
                </span>
                <span className="truncate text-[11px] text-muted-foreground">
                  {property.address}
                </span>
              </div>
              {/* Was a docs-status badge; a property has no review status since
                  F-02c, so the slot shows what it actually is instead. */}
              <Badge variant="secondary" className="shrink-0 text-[10px] font-normal">
                {categoryName(property.category, locale)}
              </Badge>
            </Link>
          ))}
        </CardContent>
      )}
    </Card>
  );
}
