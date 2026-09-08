"use client";

import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { formatDay } from "@/lib/ui/relative-time";
import type { AgencyApplicationDetailDto } from "@/lib/types/agency.types";

/**
 * Everything the company said about itself.
 *
 * **A null field is omitted, never printed blank.** `licenceNumber`,
 * `contactPhone`, `expectedWorkerCount` and `message` are all optional on the
 * public form, and a labelled empty row reads as data that failed to load rather
 * than as a question the applicant left unanswered. The one exception is
 * `expectedWorkerCount`, whose absence an admin may want to see stated — it is
 * the field a partnership is sized on — so it renders `facts.none`.
 *
 * `message` gets room: it is free text up to 4000 characters and it is the
 * applicant's own case for themselves, which is the thing a reviewer actually
 * reads before deciding.
 */
export function ApplicationFacts({
  application: a,
}: {
  application: AgencyApplicationDetailDto;
}) {
  const t = useTranslations("agencyRequests");
  const locale = useLocale();

  return (
    <div className="flex flex-col gap-3.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {t("facts.heading")}
      </span>

      <dl className="flex flex-col gap-2.5">
        <Fact label={t("facts.legalName")}>
          <span className="font-medium">{a.legalName}</span>
        </Fact>
        <Fact label={t("facts.registrationNumber")} mono>
          {a.registrationNumber}
        </Fact>
        {a.licenceNumber ? (
          <Fact label={t("facts.licenceNumber")} mono>
            {a.licenceNumber}
          </Fact>
        ) : null}
        <Fact label={t("facts.location")}>
          {a.city}
          <span className="text-muted-foreground">, {a.country}</span>
        </Fact>
        <Fact label={t("facts.contactPerson")}>{a.contactPersonName}</Fact>
        <Fact label={t("facts.contactEmail")} mono>
          {/* Selectable and wrapping: this is the address an admin copies into a
              mail client, and an ellipsis in the middle of it is unusable. */}
          <span className="break-all">{a.contactEmail}</span>
        </Fact>
        {a.contactPhone ? (
          <Fact label={t("facts.contactPhone")} mono>
            {a.contactPhone}
          </Fact>
        ) : null}
        <Fact label={t("facts.expectedWorkers")} mono>
          {a.expectedWorkerCount ?? (
            <span className="font-sans text-muted-foreground">
              {t("facts.none")}
            </span>
          )}
        </Fact>

        <Fact label={t("facts.source")}>
          <span className="flex flex-col items-start gap-1">
            <Badge tone="neutral">
              {t.has(`source.${a.source}`) ? t(`source.${a.source}`) : a.source}
            </Badge>
            {/* Only for the keyed-in case: it is the one that needs explaining,
                because those terms were accepted on paper and not in the form. */}
            {a.source === "Admin" ? (
              <span className="text-[11px] leading-snug text-muted-foreground text-pretty">
                {t("source.hint")}
              </span>
            ) : null}
          </span>
        </Fact>

        {/* One line, not two: a version number alone answers nothing an admin
            asks, and a date alone loses which document was agreed to. */}
        <Fact label={t("facts.terms")}>
          <span className="text-[12.5px]">
            v{a.termsVersion} ·{" "}
            {t("facts.termsAccepted", {
              date: formatDay(a.termsAcceptedAt, locale),
            })}
          </span>
        </Fact>
      </dl>

      {a.message ? (
        <div className="flex flex-col gap-1.5 border-t border-border/60 pt-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {t("facts.message")}
          </span>
          {/* `whitespace-pre-line`: the applicant typed paragraphs into a
              textarea and collapsing them turns a structured pitch into a wall. */}
          <p className="whitespace-pre-line text-[13px] leading-relaxed text-foreground/90 text-pretty">
            {a.message}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function Fact({
  label,
  children,
  mono,
}: {
  label: string;
  children: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] leading-none text-muted-foreground">{label}</dt>
      <dd
        className={
          mono
            ? "font-mono text-[12.5px] leading-snug"
            : "text-[13px] leading-snug"
        }
      >
        {children}
      </dd>
    </div>
  );
}
