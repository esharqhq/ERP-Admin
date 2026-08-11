import { Mail, Phone, Hash, CalendarDays, IdCard } from "lucide-react";
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

/**
 * `identity` is the **legal** name from the passport, which is a different
 * value from the `fullName` the hero card shows and is deliberately never
 * reconciled with it. It is rendered here because `PUT /api/owners/{id}` writes
 * only the legal pair — without this row an admin corrects a name, gets a
 * `200`, and sees nothing on the screen change.
 */
export function ContactCard({
  owner,
  identity,
}: {
  owner: OwnerSummaryDto;
  /** `null` when the KYC read 404'd or was refused. */
  identity: { firstName: string | null; lastName: string | null } | null;
}) {
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
        {identity && (identity.firstName || identity.lastName) ? (
          <InfoRow
            icon={<IdCard className="size-3.5" />}
            label={t("account.legalName")}
            value={[identity.firstName, identity.lastName].filter(Boolean).join(" ")}
            hint={t("account.legalNameHint")}
          />
        ) : null}
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
