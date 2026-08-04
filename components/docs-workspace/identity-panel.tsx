"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { companyTypeLabelKey } from "@/lib/onboarding/company";
import type {
  OwnerCompanyDto,
  OwnerIdentityDto,
  WorkerIdentityDto,
} from "@/lib/types/identity.types";

/** Days before an expiry date at which we start warning about it. */
const EXPIRY_WARN_DAYS = 30;

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return null;
  return Math.floor((ms - Date.now()) / 86_400_000);
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm">{value?.trim() ? value : "—"}</span>
    </div>
  );
}

/**
 * A date the expiry ladder watches. Past or near-term dates are called out here
 * because they end the subject's cover on their own — a licence lapsing next month
 * reverts the account even with a year left on the contract.
 */
function ExpiryField({
  label,
  value,
  locale,
}: {
  label: string;
  value: string | null;
  locale: string;
}) {
  const t = useTranslations("docsWorkspace");
  const left = daysUntil(value);
  const expired = left !== null && left < 0;
  const soon = left !== null && left >= 0 && left <= EXPIRY_WARN_DAYS;

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="flex flex-wrap items-center gap-1.5 text-sm">
        {value ? new Date(value).toLocaleDateString(locale) : "—"}
        {expired && (
          <Badge variant="destructive">{t("identity.expired")}</Badge>
        )}
        {soon && (
          <Badge
            variant="secondary"
            className="bg-amber-500/10 text-amber-700 dark:text-amber-400"
          >
            {t("identity.expiresInDays", { days: left })}
          </Badge>
        )}
      </span>
    </div>
  );
}

/**
 * Read-only by design. Only the subject writes identity and company data, only
 * while they are at `Kyc`/`Rejected`, and the API has **no admin correction
 * endpoint** — so the way to fix a wrong passport number is to reject the bundle
 * with a reason and let the subject edit it. The panel says so rather than
 * offering an edit affordance that cannot exist.
 */
export function IdentityPanel({
  identity,
  company,
  locale,
}: {
  identity: OwnerIdentityDto | WorkerIdentityDto | null;
  /** Owners only. `null` means the owner is a natural person — a complete state. */
  company?: OwnerCompanyDto | null;
  locale: string;
}) {
  const t = useTranslations("docsWorkspace");
  // Company-type labels live in the shared onboarding namespace, next to the
  // status and phase copy — they are wire-value maps, not screen copy.
  const tOnboarding = useTranslations("onboarding");
  const licenseExpiry =
    identity && "licenseExpiry" in identity ? identity.licenseExpiry : null;

  /** All four are required before the subject can submit for review at all. */
  const incomplete =
    !identity?.firstName?.trim() ||
    !identity?.lastName?.trim() ||
    !identity?.passportNumber?.trim() ||
    !identity?.passportExpiry;

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">{t("identity.title")}</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("identity.firstName")} value={identity?.firstName ?? null} />
          <Field label={t("identity.lastName")} value={identity?.lastName ?? null} />
          <Field
            label={t("identity.passportNumber")}
            value={identity?.passportNumber ?? null}
          />
          <ExpiryField
            label={t("identity.passportExpiry")}
            value={identity?.passportExpiry ?? null}
            locale={locale}
          />
          {licenseExpiry !== null && (
            <ExpiryField
              label={t("identity.licenseExpiry")}
              value={licenseExpiry}
              locale={locale}
            />
          )}
        </div>
      </section>

      {company !== undefined && (
        <section className="flex flex-col gap-3 border-t border-border pt-4">
          <h3 className="text-sm font-medium">{t("company.title")}</h3>
          {company === null ? (
            /* The absence of a company row IS the fact: this owner is a natural
               person, which is a valid and complete state. Never an empty form. */
            <p className="text-sm text-muted-foreground">{t("company.naturalPerson")}</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("company.name")} value={company.name} />
              <Field
                label={t("company.type")}
                /* CompanyType serializes as its enum member (`Gmbh`), and no rule
                   derives `GmbH` from it — always map it. */
                value={tOnboarding(`companyType.${companyTypeLabelKey(company.type)}`)}
              />
              <Field label={t("company.licenseNumber")} value={company.licenseNumber} />
              <ExpiryField
                label={t("company.licenseExpiry")}
                value={company.licenseExpiry}
                locale={locale}
              />
              <Field label={t("company.taxNumber")} value={company.taxNumber} />
              <Field
                label={t("company.registeredIn")}
                value={
                  [
                    locale === "de" ? company.cityNameDe : company.cityNameEn,
                    locale === "de" ? company.countryNameDe : company.countryNameEn,
                  ]
                    .filter(Boolean)
                    .join(", ") || null
                }
              />
            </div>
          )}
        </section>
      )}

      {incomplete && (
        /* The real blocker at the start of the flow: these four fields are a
           precondition of the subject's own submit, so an empty block means nothing
           is coming for review yet — no admin action substitutes for it. */
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-400">
          {t("identity.incomplete")}
        </p>
      )}

      <p className="text-xs text-muted-foreground">{t("identity.readOnlyNote")}</p>
    </div>
  );
}
