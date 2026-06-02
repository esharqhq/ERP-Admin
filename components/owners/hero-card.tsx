import { Mail } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTranslations } from "next-intl";
import type { KycProfileSummaryDto } from "@/lib/types/kyc.types";

export function HeroCard({ owner }: { owner: KycProfileSummaryDto }) {
  const tStatus = useTranslations("status");
  const tCommon = useTranslations("common");

  const kycStatusConfig: Record<
    string,
    { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
  > = {
    "1": { label: tStatus("pending"), variant: "secondary" },
    "2": { label: tStatus("approved"), variant: "default" },
    "3": { label: tStatus("rejected"), variant: "destructive" },
  };

  const initials = (owner.ownerName ?? "??").slice(0, 2).toUpperCase();
  const status = owner.kycStatus
    ? (kycStatusConfig[owner.kycStatus] ?? { label: owner.kycStatus, variant: "outline" as const })
    : { label: tCommon("unknown"), variant: "outline" as const };

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
                {owner.ownerName ?? "—"}
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {owner.ownerEmail && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                nativeButton={false}
                render={<a href={`mailto:${owner.ownerEmail}`} />}
              >
                <Mail className="size-4" />
                Email
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
