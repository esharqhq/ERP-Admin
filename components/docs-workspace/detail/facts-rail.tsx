"use client";

import { useLocale, useTranslations } from "next-intl";
import { formatDate } from "@/components/docs-workspace/queue-cells";
import { companyTypeLabelKey } from "@/lib/onboarding/company";
import { daysUntil } from "@/lib/detail/attention";
import { CRITICAL_DAYS, WARN_DAYS } from "@/lib/onboarding/subject-row";
import type { FactsData } from "@/lib/types/facts.types";
import { cn } from "@/lib/utils";

/**
 * What the file has to match — the right rail's first block.
 *
 * **Read-only, and it says so.** The subject writes all of this, only while they
 * are at `Kyc`/`Rejected`, and the API has no admin correction endpoint at all.
 * The way to fix a wrong passport number is to reject the bundle with a reason.
 * An edit affordance here would be one the API could never honour.
 */
export function FactsRail({
  data,
  /** Start of today in ms, from `useToday()`. `0` = clock not known. */
  today,
}: {
  data: FactsData;
  today: number;
}) {
  const t = useTranslations("docsWorkspace.detail");
  const tCompany = useTranslations("onboarding.companyType");
  const locale = useLocale();

  const identity = data.identity;
  /** `null` for a worker too — the block below only reads it on the owner branch. */
  const company = data.kind === "owner" ? data.company : null;

  const legalName =
    [identity?.firstName, identity?.lastName].filter(Boolean).join(" ") || null;

  const registeredIn =
    [
      locale === "de" ? company?.cityNameDe : company?.cityNameEn,
      locale === "de" ? company?.countryNameDe : company?.countryNameEn,
    ]
      .filter(Boolean)
      .join(", ") || null;

  return (
    <section className="flex flex-col gap-2.5 rounded-xl bg-card p-3.5 shadow-card ring-1 ring-foreground/10">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {t("checkAgainst")}
        </span>
        <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
          {t("readOnly")}
        </span>
      </div>

      <dl className="flex flex-col">
        <Fact label={t("legalName")} value={legalName} />

        {data.kind === "owner" ? (
          <>
            {/* The absence of a company row IS the fact. Stated in words rather than
                left as a missing section, which reads as data that failed to load. */}
            <Fact
              label={t("legalForm")}
              value={
                company
                  ? tCompany(companyTypeLabelKey(company.type) as "gmbh")
                  : t("naturalPerson")
              }
            />
            <Fact label={t("passportNo")} value={identity?.passportNumber ?? null} mono />
            <Expiry
              label={t("passportExpires")}
              iso={identity?.passportExpiry ?? null}
              today={today}
              locale={locale}
            />

            {company && (
              <>
                <Fact label={t("licenceNo")} value={company.licenseNumber} mono />
                <Expiry
                  label={t("licenceExpires")}
                  iso={company.licenseExpiry}
                  today={today}
                  locale={locale}
                />
                <Fact label={t("taxNumber")} value={company.taxNumber} mono />
                <Fact label={t("registeredIn")} value={registeredIn} />
              </>
            )}
          </>
        ) : (
          <>
            {/* No legal-form concept for a worker — omitted entirely, not "Natural
                person": that sentence only makes sense beside a real company axis. */}
            <Fact label={t("passportNo")} value={identity?.passportNumber ?? null} mono />
            <Expiry
              label={t("passportExpires")}
              iso={identity?.passportExpiry ?? null}
              today={today}
              locale={locale}
            />
            <Expiry
              label={t("licenceExpires")}
              iso={data.identity?.licenseExpiry ?? null}
              today={today}
              locale={locale}
            />
          </>
        )}
      </dl>

      <p className="border-t border-border/60 pt-2.5 text-[11px] leading-snug text-ink-soft text-pretty">
        {t("readOnlyNote")}
      </p>
    </section>
  );
}

function Fact({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/40 py-1.5 last:border-0">
      <dt className="shrink-0 text-[11.5px] text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "min-w-0 truncate text-right text-[12.5px] font-medium",
          mono && "font-mono",
        )}
        title={value ?? undefined}
      >
        {value?.trim() ? value : "—"}
      </dd>
    </div>
  );
}

/**
 * A date the expiry ladder watches, annotated only when it is close enough to act
 * on. The two rungs are the shared `WARN_DAYS` / `CRITICAL_DAYS` — the same ones
 * the contract cover uses, so a licence turning amber a week apart from the
 * contract beside it would read as a bug in the screen rather than a difference in
 * the data.
 */
function Expiry({
  label,
  iso,
  today,
  locale,
}: {
  label: string;
  iso: string | null;
  today: number;
  locale: string;
}) {
  const t = useTranslations("docsWorkspace.detail");
  const left = daysUntil(iso, today);
  const tone =
    left === null
      ? null
      : left < 0
        ? "critical"
        : left <= CRITICAL_DAYS
          ? "critical"
          : left <= WARN_DAYS
            ? "warning"
            : null;

  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/40 py-1.5 last:border-0">
      <dt className="shrink-0 text-[11.5px] text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 flex-wrap items-baseline justify-end gap-1.5 text-right text-[12.5px] font-medium">
        <span>{iso ? formatDate(iso, locale) : "—"}</span>
        {tone && left !== null && (
          <span
            className={cn(
              "rounded-full px-1.5 py-px text-[10.5px] font-semibold",
              tone === "critical"
                ? "bg-status-cancelled-tint text-status-cancelled"
                : "bg-status-pending-tint text-status-pending",
            )}
          >
            {left < 0
              ? t("expired")
              : t("daysLeft", { days: left })}
          </span>
        )}
      </dd>
    </div>
  );
}
