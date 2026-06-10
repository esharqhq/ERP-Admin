import { Mail, Phone, Hash, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { InfoRow } from "./info-row";
import { useLocale, useTranslations } from "next-intl";
import type { OwnerSummaryDto } from "@/lib/types/owner.types";

function formatDateTime(iso: string | null, locale: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function ContactCard({ owner }: { owner: OwnerSummaryDto }) {
  const t = useTranslations("owners");
  const locale = useLocale();

  return (
    <Card>
      <CardHeader className="pb-3">
        <h2 className="font-heading text-base font-semibold tracking-tight">
          {t("contact.title")}
        </h2>
      </CardHeader>
      <CardContent className="flex flex-col gap-3.5">
        <InfoRow
          icon={<Mail className="size-3.5" />}
          label={t("account.email")}
          value={owner.email || "—"}
        />
        <InfoRow
          icon={<Phone className="size-3.5" />}
          label={t("account.phone")}
          value={owner.phoneNumber || "—"}
        />
        <Separator />
        <InfoRow
          icon={<Hash className="size-3.5" />}
          label={t("contact.userId")}
          value={owner.id}
          mono
        />
        <InfoRow
          icon={<CalendarDays className="size-3.5" />}
          label={t("account.joined")}
          value={formatDateTime(owner.createdAt, locale)}
        />
      </CardContent>
    </Card>
  );
}
