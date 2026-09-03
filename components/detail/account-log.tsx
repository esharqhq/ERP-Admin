"use client";

import {
  AlertTriangle,
  Building2,
  Check,
  FileText,
  History,
  ScrollText,
  UserCog,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { CardState } from "@/components/detail/card-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { AuditLogEntryDto } from "@/lib/services/audit.service";
import { cn } from "@/lib/utils";

/**
 * How each audit action reads on this screen: which family it belongs to, and
 * whether it was an approval, a refusal or a neutral change.
 *
 * Actions arrive as the C# enum's PascalCase name — `AdminController` projects
 * `a.Action.ToString()`, so `"WorkerApproved"`, not a screaming-snake code. An
 * action missing from this map still renders: it falls back to its own name,
 * split on the capitals. The backend adds members to this enum routinely and a
 * new one must not blank a row.
 */
const ACTIONS: Record<string, { family: Family; tone: Tone }> = {
  KycApproved: { family: "kyc", tone: "good" },
  KycRejected: { family: "kyc", tone: "bad" },
  OwnerKycResetToPending: { family: "kyc", tone: "warn" },
  OnboardingRevertedToKyc: { family: "kyc", tone: "warn" },
  OnboardingExpiryWarned: { family: "kyc", tone: "warn" },

  WorkerApproved: { family: "account", tone: "good" },
  WorkerRejected: { family: "account", tone: "bad" },
  WorkerDeactivated: { family: "account", tone: "bad" },
  OwnerDeactivated: { family: "account", tone: "bad" },
  OwnerProfileModified: { family: "account", tone: "neutral" },
  WorkerProfileModified: { family: "account", tone: "neutral" },
  WorkerAvailabilityModified: { family: "account", tone: "neutral" },

  ContractSent: { family: "contract", tone: "neutral" },
  ContractSigned: { family: "contract", tone: "good" },
  ContractRecalled: { family: "contract", tone: "warn" },
  ContractRejected: { family: "contract", tone: "bad" },
  OwnerContractForceDeactivated: { family: "contract", tone: "bad" },
  WorkerContractForceDeactivated: { family: "contract", tone: "bad" },

  PropertyCreatedByAdmin: { family: "property", tone: "neutral" },
  PropertyDeactivatedByAdmin: { family: "property", tone: "bad" },
  PropertyRestored: { family: "property", tone: "good" },

  TaskCancelled: { family: "work", tone: "warn" },
  TaskGroupCancelled: { family: "work", tone: "warn" },
  WorkerTaskUnassigned: { family: "work", tone: "warn" },
  WorkerTaskRated: { family: "work", tone: "neutral" },
  WorkerTaskOutcomeOverridden: { family: "work", tone: "neutral" },
};

type Family = "kyc" | "account" | "contract" | "property" | "work";
type Tone = "good" | "bad" | "warn" | "neutral";

const FAMILY_ICON: Record<Family, typeof FileText> = {
  kyc: FileText,
  account: UserCog,
  contract: ScrollText,
  property: Building2,
  work: AlertTriangle,
};

const TONE_DOT: Record<Tone, string> = {
  good: "bg-status-verified-tint text-status-verified",
  bad: "bg-status-cancelled-tint text-status-cancelled-deep",
  warn: "bg-status-pending-tint text-status-pending-deep",
  neutral: "bg-shell-tint text-foreground/70",
};

/** "WorkerAvailabilityModified" → "Worker availability modified". */
function humanise(action: string): string {
  const words = action.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return words.charAt(0).toUpperCase() + words.slice(1).toLowerCase();
}

/**
 * `Metadata` is a nullable raw JSON string with no fixed contract across
 * actions, so only the one key that is meaningful everywhere is read. A reason
 * is mandatory on the deactivation, legal-name and schedule routes precisely
 * because it *is* the audit entry — dropping it would leave the row saying that
 * something changed and never why.
 */
function extractReason(metadata: string | null): string | null {
  if (!metadata) return null;
  try {
    const parsed: unknown = JSON.parse(metadata);
    if (parsed && typeof parsed === "object") {
      const reason = (parsed as Record<string, unknown>).reason;
      if (typeof reason === "string" && reason.trim()) return reason.trim();
    }
  } catch {
    // A payload that is not JSON is not an error worth showing an admin — the
    // row's action and timestamp are still true without it.
  }
  return null;
}

type MessageKey = Parameters<
  ReturnType<typeof useTranslations<"detail.log">>
>[0];

/**
 * Admin actions recorded against one account, newest first.
 *
 * ⚠ Named for what it is. See `hooks/use-account-log.ts` for exactly what this
 * source does and does not contain — per-document verdicts, contract events and
 * everything the *subject* did are all absent, and the footnote under the list
 * says so on screen rather than only here.
 */
export function AccountLog({
  entries,
  canRead,
  isPending,
  isError,
}: {
  entries: AuditLogEntryDto[];
  canRead: boolean | null;
  isPending: boolean;
  isError: boolean;
}) {
  const t = useTranslations("detail.log");
  const locale = useLocale();

  if (canRead === null || isPending) {
    return (
      <div className="flex flex-col gap-3 py-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3.5">
            <Skeleton className="h-3 w-[74px] shrink-0" />
            <Skeleton className="size-6 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-3 w-2/5" />
              <Skeleton className="h-2.5 w-3/5" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (canRead === false) {
    return (
      <CardState
        icon={<History className="size-8" />}
        title={t("refused")}
        hint={t("refusedHint")}
        note="gated · system:audit:read"
      />
    );
  }

  if (isError) {
    return (
      <CardState
        icon={<History className="size-8" />}
        title={t("failed")}
        note="read failed"
      />
    );
  }

  if (entries.length === 0) {
    return (
      <CardState
        icon={<History className="size-8" />}
        title={t("empty")}
        hint={t("emptyHint")}
        note="200 · empty list"
      />
    );
  }

  function formatWhen(iso: string): string {
    return new Date(iso).toLocaleString(locale, {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* The rail sits behind the dots rather than between the rows, so a single
          entry does not draw half a line to nowhere. */}
      <div className="relative flex flex-col">
        <span
          aria-hidden
          className="absolute top-3 bottom-3 left-[calc(6rem+0.875rem+11px)] hidden w-px bg-border sm:block"
        />
        {entries.map((entry) => {
          const known = ACTIONS[entry.action];
          const family = known?.family ?? "account";
          const tone = known?.tone ?? "neutral";
          const Icon =
            tone === "good" ? Check : tone === "bad" ? X : FAMILY_ICON[family];
          const reason = extractReason(entry.metadata);

          return (
            <div key={entry.id} className="flex items-start gap-3.5 py-2">
              <span className="hidden w-24 shrink-0 pt-1 text-right font-mono text-[11px] text-muted-foreground sm:block">
                {formatWhen(entry.createdAt)}
              </span>
              <span
                className={cn(
                  "relative flex size-[22px] shrink-0 items-center justify-center rounded-full ring-[3px] ring-card",
                  TONE_DOT[tone],
                )}
              >
                <Icon className="size-3" strokeWidth={2.4} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[13px] font-semibold leading-snug">
                  {/* `has()` guards the case the map above cannot: the backend
                      enum grows, and an unmapped action falls back to its own
                      name rather than throwing on a missing key. */}
                  {t.has(`actions.${entry.action}` as MessageKey)
                    ? t(`actions.${entry.action}` as MessageKey)
                    : humanise(entry.action)}
                </span>
                <span className="text-[11px] leading-snug text-muted-foreground">
                  <span className="sm:hidden">
                    {formatWhen(entry.createdAt)} ·{" "}
                  </span>
                  {t.has(`actorType.${entry.actorType}` as MessageKey)
                    ? t(`actorType.${entry.actorType}` as MessageKey)
                    : entry.actorType}
                  {reason ? ` · ${reason}` : ""}
                </span>
              </span>
              <span className="hidden shrink-0 rounded-md bg-muted px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.05em] text-muted-foreground md:block">
                {t(`family.${family}`)}
              </span>
            </div>
          );
        })}
      </div>

      {/* On screen, not only in the source: this list is the admin audit trail
          filtered to one account, and an admin who reads it as a full history
          would conclude that documents were never reviewed. */}
      <p className="border-t border-border pt-3 text-[11px] leading-snug text-muted-foreground">
        {t("scopeNote")}
      </p>
    </div>
  );
}
