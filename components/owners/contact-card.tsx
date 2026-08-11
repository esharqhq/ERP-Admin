import { Mail, Phone, Hash, CalendarDays, IdCard, UserCog, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { InfoRow } from "./info-row";
import { useLocale, useTranslations } from "next-intl";
import { onboardingStatusPresentation } from "@/lib/onboarding/status";
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
 * Everything the account *is*, as labelled rows.
 *
 * Role and onboarding stage live here rather than as badges beside the name:
 * spelled out with a label they read like the other facts on the card, and the
 * hero card stays a photo and a name. They are not repeated on the hero — one
 * fact, one place.
 *
 * `identity` is the **legal** name from the passport, a different value from
 * the `fullName` the hero shows and deliberately never reconciled with it. It
 * is rendered because `PUT /api/owners/{id}` writes only the legal pair —
 * without this row an admin corrects a name, gets a `200`, and sees nothing on
 * the screen change.
 */
export function ContactCard({
  owner,
  identity,
  onboardingStatus,
}: {
  owner: OwnerSummaryDto;
  /** `null` when the KYC read 404'd or was refused. */
  identity: { firstName: string | null; lastName: string | null } | null;
  /** `null` when the KYC read 404'd or was refused — the row is then omitted. */
  onboardingStatus?: string | null;
}) {
  const t = useTranslations("owners");
  const tOnboarding = useTranslations("onboarding");
  const locale = useLocale();

  const presentation = onboardingStatus
    ? onboardingStatusPresentation(onboardingStatus)
    : null;

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
        {owner.roleCode ? (
          <InfoRow
            icon={<UserCog className="size-3.5" />}
            label={t("directory.columns.role")}
            value={<Badge variant="secondary">{owner.roleCode}</Badge>}
          />
        ) : null}
        {presentation ? (
          <InfoRow
            icon={<ShieldCheck className="size-3.5" />}
            // Labelled "Onboarding", matching the owners table column above the
            // very same badge — the two screens name one fact one way.
            label={t("columns.onboarding")}
            value={
              <Badge variant={presentation.variant} className={presentation.className}>
                {tOnboarding(
                  `status.${presentation.labelKey}` as Parameters<typeof tOnboarding>[0],
                )}
              </Badge>
            }
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
