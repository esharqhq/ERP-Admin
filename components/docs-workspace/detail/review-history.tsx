"use client";

import { Check, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { HistoryEntry, HistoryKind } from "@/lib/onboarding/review-history";
import { cn } from "@/lib/utils";

/**
 * What has been decided on this bundle, newest first.
 *
 * See `buildHistory` for what this can and cannot contain. The short version:
 * actions and times, **no attribution**, because no endpoint resolves the
 * reviewing admin's id to a name. The note under the list says so rather than
 * leaving an operator to wonder whether the feed is broken.
 */

const ICON: Record<HistoryKind, typeof Check> = {
  docApproved: Check,
  docRejected: X,
  submissionApproved: Check,
  submissionRejected: X,
};

const TONE: Record<HistoryKind, string> = {
  docApproved: "bg-status-active-tint text-status-active",
  docRejected: "bg-status-cancelled-tint text-status-cancelled",
  submissionApproved: "bg-status-verified-tint text-status-verified",
  submissionRejected: "bg-status-cancelled-tint text-status-cancelled",
};

export function ReviewHistory({ entries }: { entries: HistoryEntry[] }) {
  const t = useTranslations("docsWorkspace.detail");
  const locale = useLocale();

  return (
    <section className="flex flex-col gap-2.5 rounded-xl bg-card p-3.5 shadow-card ring-1 ring-foreground/10">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {t("historyTitle")}
      </span>

      {entries.length === 0 ? (
        <p className="text-[11.5px] leading-snug text-ink-soft text-pretty">
          {t("historyEmpty")}
        </p>
      ) : (
        <ol className="flex flex-col gap-2.5">
          {entries.map((entry) => {
            const Icon = ICON[entry.kind];
            return (
              <li key={entry.id} className="flex gap-2.5">
                <span
                  className={cn(
                    "mt-px flex size-5 shrink-0 items-center justify-center rounded-full",
                    TONE[entry.kind],
                  )}
                >
                  <Icon className="size-3" strokeWidth={2.6} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[12px] leading-snug text-pretty">
                    {entry.docType
                      ? t(
                          entry.kind === "docApproved"
                            ? "historyDocApproved"
                            : "historyDocRejected",
                          { type: t(`type.${entry.docType}` as "type.Passport") },
                        )
                      : t(
                          entry.kind === "submissionApproved"
                            ? "historySubmissionApproved"
                            : "historySubmissionRejected",
                        )}
                  </span>
                  {entry.reason && (
                    <span className="text-[11.5px] leading-snug text-ink-soft text-pretty">
                      {entry.reason}
                    </span>
                  )}
                  <span className="font-mono text-[10.5px] text-muted-foreground">
                    {formatStamp(entry.at, locale)}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {/* Names what the feed excludes. A partial history presented as a complete
          one is the single worst thing a compliance surface can do. */}
      <p className="border-t border-border/60 pt-2.5 text-[10.5px] leading-snug text-muted-foreground text-pretty">
        {t("historyScopeNote")}
      </p>
    </section>
  );
}

/** `26 Aug 2026 · 09:12` — date and time, because two verdicts often share a day. */
function formatStamp(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const date = d.toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const time = d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  return `${date} · ${time}`;
}

