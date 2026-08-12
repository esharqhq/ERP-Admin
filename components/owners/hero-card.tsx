"use client";

import { useSyncExternalStore } from "react";
import { CalendarDays, IdCard, Mail, Phone, ScrollText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocale, useTranslations } from "next-intl";
import { useOwnerContractCover } from "@/hooks/use-contracts";
import { onboardingStatusPresentation } from "@/lib/onboarding/status";
import {
  coverNoteKey,
  coverPresentation,
  type CoverNote,
  type CoverPresentation,
  type SubjectCover,
} from "@/lib/onboarding/subject-row";
import type { OwnerSummaryDto } from "@/lib/types/owner.types";
import { cn } from "@/lib/utils";

function formatDate(iso: string | null, locale: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const DAY_MS = 86_400_000;

/**
 * Start of today in ms, `0` before the clock is known. Copied from the Docs
 * queue's own hook rather than shared: it is eight lines with no branching, and
 * the file it lives in renders both sides of that queue with no test coverage.
 * See `subject-docs-table.tsx` for why quantizing to the day is what makes
 * reading the clock through `useSyncExternalStore` safe — and why the reading
 * the contract cell wants is "days from the start of today" anyway.
 */
function useToday(): number {
  return useSyncExternalStore(
    subscribeNever,
    () => Math.floor(Date.now() / DAY_MS) * DAY_MS,
    () => 0,
  );
}

function subscribeNever() {
  return () => {};
}

/** Same three tones the Docs queue gives a contract period. */
const TEXT_TONE: Record<CoverPresentation["tone"], string> = {
  muted: "text-muted-foreground",
  warning: "text-amber-700 dark:text-amber-400",
  critical: "text-destructive",
};

/**
 * One cell of the contact band. `dt`/`dd` rather than the sidebar `InfoRow`'s
 * spans: read as a row the pairs were implicit, read as a band they are not.
 */
function Meta({
  icon,
  label,
  value,
  hint,
  hintClassName,
}: {
  icon: React.ReactNode;
  label: string;
  /** A node, not a string, so a cell still loading can hold a skeleton. */
  value: React.ReactNode;
  /** One line under the value, for when the label alone is ambiguous. */
  hint?: string;
  /** Tone for the hint, where it carries a warning rather than a note. */
  hintClassName?: string;
}) {
  return (
    // `gap-0.5`, as in `InfoRow`: the hint has to read as the value's, and the
    // band's own `gap-y-4` is what separates one cell from the next.
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="text-[13px] leading-snug break-words text-foreground">{value}</dd>
      {hint ? (
        <dd className={cn("text-[11px] leading-snug text-muted-foreground", hintClassName)}>
          {hint}
        </dd>
      ) : null}
    </div>
  );
}

/**
 * What the contract cell shows, for each way the read can land.
 *
 * Five outcomes, and four of them are not "no contract" — which is the one thing
 * an em dash alone would be read as. A refused read, a failed read and a period
 * that has genuinely never been authored are three different facts about three
 * different things, and only the last is about the owner.
 *
 * Copy is passed in rather than translated here so this stays a plain function
 * over the hook's result.
 */
function describeContract(
  contract: {
    cover: SubjectCover | null;
    /** `null` = grant set not resolved yet, which is not a refusal. */
    canRead: boolean | null;
    isPending: boolean;
    error: unknown;
  },
  today: number,
  locale: string,
  copy: {
    unavailable: () => string;
    failed: () => string;
    none: () => string;
    note: (note: CoverNote) => string;
  },
): { value: React.ReactNode; hint?: string; hintClassName?: string } {
  if (contract.canRead === false)
    return { value: "—", hint: copy.unavailable() };
  // `null` is "not known yet", and a query disabled behind it stays pending
  // forever — both are the same waiting state to a reader.
  if (contract.canRead === null || contract.isPending)
    return { value: <Skeleton className="h-4 w-36" /> };
  if (contract.error)
    return { value: "—", hint: copy.failed(), hintClassName: "text-destructive" };
  if (!contract.cover) return { value: copy.none() };

  const value = `${formatDate(contract.cover.from, locale)} – ${formatDate(
    contract.cover.to,
    locale,
  )}`;
  // No clock yet (server render) — the dates are still true, the countdown is not.
  if (today <= 0) return { value };

  const pres = coverPresentation(contract.cover, today);
  return {
    value,
    hint: copy.note(coverNoteKey(contract.cover.phase, pres)),
    hintClassName: TEXT_TONE[pres.tone],
  };
}

/**
 * The one place this screen states who the owner is: photo, display name, role,
 * onboarding stage, and how to reach them.
 *
 * Each of the first four used to appear twice — here and again in a stat card —
 * so the stat row is gone and this is the single source. The verified/unverified
 * badge went with it: it is a narrower fact than the onboarding stage, and two
 * status badges side by side read as contradictory rather than complementary.
 *
 * The contact facts followed for the same reason: they were a sidebar card
 * competing with the identity it belonged to. The user id it also carried is
 * gone — an admin who needs it has the URL.
 *
 * The contract period is in that band rather than in a card of its own, and it
 * belongs on this screen at all because nothing else here answers "is this owner
 * under contract, and until when". The badge two lines above reads the stored
 * `onboardingStatus`, a projection an hourly job refreshes, which says `Active`
 * in two windows where the server's live gate already refuses the owner —
 * `lib/types/onboarding.types.ts:68-75` is explicit that coverage must never be
 * answered from it. The phase behind the period below is computed per read, so
 * these two sit deliberately close together: the badge says what the account is,
 * the period says what is actually true today.
 */
export function HeroCard({
  owner,
  isWalkIn = false,
  onboardingStatus,
  identity,
}: {
  owner: OwnerSummaryDto;
  isWalkIn?: boolean;
  /** `null` when the KYC read 404'd or was refused — the badge is then omitted. */
  onboardingStatus?: string | null;
  /** `null` when the KYC read 404'd or was refused. */
  identity?: { firstName: string | null; lastName: string | null } | null;
}) {
  const t = useTranslations("owners");
  const tOnboarding = useTranslations("onboarding");
  const tDocs = useTranslations("docsWorkspace");
  const locale = useLocale();
  const today = useToday();
  const initials = (owner.fullName || "??").slice(0, 2).toUpperCase();

  const legalName =
    [identity?.firstName, identity?.lastName].filter(Boolean).join(" ") || "—";

  const contract = useOwnerContractCover(owner.id);
  const contractCell = describeContract(contract, today, locale, {
    unavailable: () => t("contract.unavailable"),
    failed: () => tOnboarding("apiErrors.unknown"),
    none: () => tDocs("noContract"),
    note: (note) => tDocs(note.key as Parameters<typeof tDocs>[0], note.values),
  });

  // `OwnerSummaryDto` does not carry profilePictureUrl yet: GET /api/owners/{id}
  // omits it even though the entity has it and PUT /api/owners/{id} returns it.
  // Written to render the photo the moment the backend adds the field, and to
  // show initials until then — which is also the correct fallback afterwards.
  const pictureUrl =
    (owner as { profilePictureUrl?: string | null }).profilePictureUrl ?? null;

  const presentation = onboardingStatus
    ? onboardingStatusPresentation(onboardingStatus)
    : null;

  return (
    <Card className="overflow-hidden">
      <div
        aria-hidden
        className="h-24 w-full bg-linear-to-r from-primary/12 via-primary/6 to-accent/10"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(16,54,125,0.18) 1px, transparent 0)",
          backgroundSize: "18px 18px",
        }}
      />
      <CardContent className="-mt-12 flex flex-col gap-5 pb-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-end gap-4">
            <Avatar className="size-24 ring-4 ring-background shadow-sm">
              {pictureUrl ? <AvatarImage src={pictureUrl} alt="" /> : null}
              <AvatarFallback className="bg-primary text-2xl font-semibold text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1.5 pb-1">
              <h1 className="font-heading text-2xl font-bold tracking-tight leading-tight sm:text-[28px]">
                {owner.fullName || "—"}
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                {owner.roleCode && <Badge variant="secondary">{owner.roleCode}</Badge>}
                {presentation ? (
                  <Badge variant={presentation.variant} className={presentation.className}>
                    {tOnboarding(
                      `status.${presentation.labelKey}` as Parameters<typeof tOnboarding>[0],
                    )}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>

          {/* Both are plain links, not integrations. The call button hands the
              number to the OS and hears nothing back — there is deliberately no
              call log, because "an admin clicked a button" is not evidence that
              a call happened, and as an audit trail it would be false. */}
          <div className="flex items-center gap-2">
            {owner.phoneNumber && !isWalkIn && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                nativeButton={false}
                render={<a href={`tel:${owner.phoneNumber}`} />}
              >
                <Phone className="size-4" />
                {t("account.call")}
              </Button>
            )}
            {owner.email && !isWalkIn && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                nativeButton={false}
                render={<a href={`mailto:${owner.email}`} />}
              >
                <Mail className="size-4" />
                {t("account.email")}
              </Button>
            )}
          </div>
        </div>

        {/* The values sit here and the actions above them on purpose: the
            buttons are the affordance, so these stay plain text rather than
            offering a second mailto/tel to click. */}
        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <h2 className="font-heading text-sm font-semibold tracking-tight">
            {t("contact.title")}
          </h2>
          {/* Five across only at `2xl`, and three below it. The contract cell
              holds a date range — about 160px at 13px — and five columns inside
              a 1280px window minus the 16rem sidebar, the page padding and four
              gaps leaves each cell ~157px, so the range would wrap mid-period.
              Three columns and two rows costs nothing and reads deliberately. */}
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
            <Meta
              icon={<Mail className="size-3.5 shrink-0" />}
              label={t("account.email")}
              value={owner.email || "—"}
            />
            <Meta
              icon={<Phone className="size-3.5 shrink-0" />}
              label={t("account.phone")}
              value={owner.phoneNumber || "—"}
            />

            <Meta
              icon={<IdCard className="size-3.5 shrink-0" />}
              label={t("account.legalName")}
              value={legalName}
              hint={t("account.legalNameHint")}
            />
            <Meta
              icon={<CalendarDays className="size-3.5 shrink-0" />}
              label={t("account.joined")}
              value={formatDate(owner.createdAt, locale)}
            />
            {/* Last in the band, and the only cell whose hint can turn red: the
                other four state facts that do not expire. */}
            <Meta
              icon={<ScrollText className="size-3.5 shrink-0" />}
              label={t("contract.title")}
              value={contractCell.value}
              hint={contractCell.hint}
              hintClassName={contractCell.hintClassName}
            />
          </dl>
        </div>
      </CardContent>
    </Card>
  );
}
