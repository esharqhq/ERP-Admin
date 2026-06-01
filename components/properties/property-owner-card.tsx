import Link from "next/link";
import { User, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import type { PropertyDto } from "@/lib/types/property.types";

export function PropertyOwnerCard({ property }: { property: PropertyDto }) {
  const t = useTranslations("properties");
  const shortId = property.bossOwnerUserId.slice(0, 8) + "…";

  return (
    <Card>
      <CardHeader className="pb-3">
        <h2 className="font-heading text-base font-semibold tracking-tight">{t("owner.title")}</h2>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <User className="size-4" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-[12px] font-medium leading-tight text-foreground">
              {shortId}
            </span>
            <span className="text-[11px] text-muted-foreground">{t("owner.ownerId")}</span>
          </div>
        </div>
        {/* TODO: show owner name when backend adds it to PropertyDto */}
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5"
          nativeButton={false}
          render={<Link href={`/dashboard/owners/${property.bossOwnerUserId}`} />}
        >
          {t("owner.viewProfile")}
          <ArrowUpRight className="size-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}
