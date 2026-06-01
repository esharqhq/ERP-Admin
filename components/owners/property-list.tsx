import Link from "next/link";
import { Home } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import type { PropertyDto } from "@/lib/types/property.types";

interface PropertyListProps {
  properties: PropertyDto[];
}

function docsStatusVariant(status: string | null): "default" | "secondary" | "destructive" {
  if (status === "Approved") return "default";
  if (status === "Rejected") return "destructive";
  return "secondary";
}

export function PropertyList({ properties }: PropertyListProps) {
  const t = useTranslations("owners");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <div>
          <h2 className="font-heading text-base font-semibold tracking-tight">{t("properties.title")}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("properties.list")}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/dashboard/properties" />}
          className="text-primary"
        >
          {t("properties.viewAll")}
        </Button>
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
                  {property.name ?? t("properties.unnamed")}
                </span>
                <span className="truncate text-[11px] text-muted-foreground">
                  {property.address ?? "—"}
                </span>
                {property.type && (
                  <span className="text-[10px] text-muted-foreground/70">{property.type}</span>
                )}
              </div>
              <Badge variant={docsStatusVariant(property.docsStatus)} className="shrink-0 text-[10px]">
                {property.docsStatus ?? "Pending"}
              </Badge>
            </Link>
          ))}
        </CardContent>
      )}
    </Card>
  );
}
