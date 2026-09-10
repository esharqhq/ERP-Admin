"use client";

import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";

import { adminNoteLabelKey } from "@/lib/skill-requests/display";
import { formatDay } from "@/lib/ui/relative-time";
import type { SkillRequestDto } from "@/lib/types/skill-request.types";

/**
 * The claim itself — what the worker asked for and everything either side has said
 * about it since.
 *
 * ⚠ **`adminNote` is labelled by status, never generically.** It is the admin's
 * *question* while `InfoRequested` and the *rejection reason* once `Rejected`, and
 * the same column carries both — reject overwrites it. `adminNoteLabelKey` owns that
 * rule, and returns `null` for the states where the field means neither, in which
 * case it is not rendered at all.
 *
 * ⚠ **No certificate.** Deliberate: the worker app is not building the upload, so
 * the field is `null` in practice and nothing in this feature renders it. The
 * decision on the request is itself the verdict on any certificate.
 *
 * A null field is omitted rather than printed blank — a labelled empty row reads as
 * data that failed to load rather than as something nobody wrote.
 */
export function ClaimPanel({ request }: { request: SkillRequestDto }) {
  const t = useTranslations("skillRequests.claim");
  const locale = useLocale();

  const noteLabel = adminNoteLabelKey(request.status);

  return (
    <div className="flex flex-col gap-3.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {t("heading")}
      </span>

      <dl className="flex flex-col gap-2.5">
        <Fact label={t("skill")}>
          <span className="font-medium">
            {locale === "de" ? request.professionNameDe : request.professionNameEn}
          </span>
        </Fact>

        <Fact label={t("claimedYears")}>
          {/* ⚠ `0` is a real answer — "no years yet" — and must print as 0, so the
              null check is explicit rather than a falsy one. */}
          {request.claimedYears === null ? t("yearsUnknown") : request.claimedYears}
        </Fact>

        <Fact label={t("requested")}>{formatDay(request.createdAt, locale)}</Fact>

        {request.workerNote && (
          <Fact label={t("workerNote")} prose>
            {request.workerNote}
          </Fact>
        )}

        {noteLabel && request.adminNote && (
          <Fact label={t(noteLabel)} prose>
            {request.adminNote}
          </Fact>
        )}

        {request.workerResponse && (
          <Fact label={t("workerResponse")} prose>
            {request.workerResponse}
          </Fact>
        )}

        {request.status === "Revoked" && request.revokeReason && (
          <Fact label={t("revokeReason")} prose>
            {request.revokeReason}
          </Fact>
        )}
      </dl>
    </div>
  );
}

function Fact({
  label,
  children,
  prose,
}: {
  label: string;
  children: ReactNode;
  /** Free text the worker or admin typed — keeps its line breaks and gets room. */
  prose?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] leading-none text-muted-foreground">{label}</dt>
      <dd
        className={
          prose
            ? "whitespace-pre-wrap text-[13px] leading-relaxed text-pretty"
            : "text-[13px] leading-snug"
        }
      >
        {children}
      </dd>
    </div>
  );
}
