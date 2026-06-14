import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useOwnerSubAccounts } from "@/hooks/use-owners";

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function SubAccountsCard({ ownerId }: { ownerId: string }) {
  const t = useTranslations("owners");
  const { data: subAccounts = [], isLoading } = useOwnerSubAccounts(ownerId);

  return (
    <Card>
      <CardHeader className="pb-3">
        <h2 className="font-heading text-base font-semibold tracking-tight">
          {t("subAccounts.title")}
        </h2>
      </CardHeader>
      <CardContent className="flex flex-col gap-0">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[0, 1].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-full shrink-0" />
                <div className="flex flex-col gap-1.5 flex-1">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            ))}
          </div>
        ) : subAccounts.length === 0 ? (
          <p className="text-[13px] text-muted-foreground py-1">
            {t("subAccounts.empty")}
          </p>
        ) : (
          subAccounts.map((account, idx) => (
            <div key={account.id}>
              <div className="flex items-start gap-3 py-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
                  {getInitials(account.fullName)}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium leading-snug text-foreground truncate">
                      {account.fullName}
                    </span>
                    {account.roleCode && (
                      <span className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {account.roleCode}
                      </span>
                    )}
                  </div>
                  <span className="text-[12px] text-muted-foreground truncate">
                    {account.email}
                  </span>
                </div>
              </div>
              {idx < subAccounts.length - 1 && <Separator />}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
