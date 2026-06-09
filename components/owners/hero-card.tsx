import { Mail, BadgeCheck, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTranslations } from "next-intl";
import type { OwnerSummaryDto } from "@/lib/types/owner.types";

export function HeroCard({ owner }: { owner: OwnerSummaryDto }) {
  const t = useTranslations("owners");
  const initials = (owner.fullName || "??").slice(0, 2).toUpperCase();

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
      <CardContent className="-mt-12 flex flex-col gap-5 pb-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-end gap-4">
            <Avatar className="size-24 ring-4 ring-background shadow-sm">
              <AvatarFallback className="bg-primary text-2xl font-semibold text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1.5 pb-1">
              <h1 className="font-heading text-2xl font-bold tracking-tight leading-tight sm:text-[28px]">
                {owner.fullName || "—"}
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                {owner.roleCode && <Badge variant="secondary">{owner.roleCode}</Badge>}
                {owner.isVerified ? (
                  <Badge variant="default" className="gap-1">
                    <BadgeCheck className="size-3.5" />
                    {t("account.verified")}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 text-muted-foreground">
                    <ShieldAlert className="size-3.5" />
                    {t("account.unverified")}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {owner.email && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              nativeButton={false}
              render={<a href={`mailto:${owner.email}`} />}
            >
              <Mail className="size-4" />
              {t("account.email")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
