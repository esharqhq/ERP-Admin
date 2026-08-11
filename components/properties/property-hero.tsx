import { Building2, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useLocale } from "next-intl";
import { categoryName } from "@/lib/properties/table-rows";
import type { PropertyDto } from "@/lib/types/property.types";

function formatDate(iso: string, locale: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * A single generic icon replaces the old per-type map. Category codes are
 * admin-authored free text (`MaxLength(50)`) since F-02c, so no static map can
 * cover them — and `PropertyDto.category` is the slim ref projection, which
 * carries no `icon`/`color` to render instead. Resolving those would mean
 * fetching the whole category list to decorate one header; not worth a request.
 *
 * The docs-status badge that used to sit here is gone with the feature: a
 * property carries no review status of any kind any more.
 */
export function PropertyHero({ property }: { property: PropertyDto }) {
  const locale = useLocale();

  return (
    <Card className="overflow-hidden">
      <div
        aria-hidden
        className="h-24 w-full bg-gradient-to-r from-primary/12 via-primary/6 to-accent/10"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(16,54,125,0.18) 1px, transparent 0)",
          backgroundSize: "18px 18px",
        }}
      />
      <div className="flex flex-wrap items-end justify-between gap-4 px-6 -mt-8 pb-6">
        <div className="flex items-end gap-4">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-4 ring-background text-primary shadow-sm">
            <Building2 className="size-5" />
          </div>
          <div className="flex flex-col gap-1.5 pb-1">
            <h1 className="font-heading text-2xl font-bold tracking-tight leading-tight sm:text-[28px]">
              {property.name}
            </h1>
            {property.address && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="size-3.5 shrink-0" />
                {property.address}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                {categoryName(property.category, locale)}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {formatDate(property.createdAt, locale)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
