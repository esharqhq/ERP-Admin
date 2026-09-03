"use client";

import { IdCard, Mail, Phone, ScrollText } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FactTile, IdentityBand } from "@/components/detail/identity-band";
import { useOwnerContractCover } from "@/hooks/use-contracts";
import { useOwnerSubAccounts } from "@/hooks/use-owners";
import { describeCover } from "@/lib/detail/cover-cell";
import { onboardingStatusPresentation } from "@/lib/onboarding/status";
import type { NameLock } from "@/lib/owners/detail-actions";
import type { CoverNote } from "@/lib/onboarding/subject-row";
import type {
  OwnerCompanyDto,
  OwnerIdentityDto,
} from "@/lib/types/identity.types";
import type { OwnerSummaryDto } from "@/lib/types/owner.types";

function initialsOf(name: string): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Who is on the account besides the BOSS.
 *
 * In the band rather than in a sidebar card of its own: a manager and a property
 * admin are part of *who this account is* — the people who will actually be
 * ringing about a task — and a card three scrolls down was answering a question
 * nobody had got to. Two chips, then a count; the full list is not the point
 * here, the fact that the account is not a single person is.
 */
function TeamChips({ ownerId }: { ownerId: string }) {
  const t = useTranslations("owners.subAccounts");
  const { data: subAccounts = [], isLoading } = useOwnerSubAccounts(ownerId);

  if (isLoading) return <Skeleton className="h-6 w-40 rounded-full" />;
  if (subAccounts.length === 0) return null;

  const shown = subAccounts.slice(0, 2);
  const extra = subAccounts.length - shown.length;

  return (
    <div className="flex flex-col items-end gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
        {t("bandLabel")}
      </span>
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {shown.map((account) => (
          <span
            key={account.id}
            className="flex items-center gap-1.5 rounded-full bg-muted py-0.5 pl-0.5 pr-2.5"
            title={account.email}
          >
            <span className="flex size-5 items-center justify-center rounded-full bg-shell-tint text-[9px] font-semibold text-foreground/70">
              {initialsOf(account.fullName)}
            </span>
            <span className="text-[11px]">{account.fullName}</span>
            {account.roleCode ? (
              <span className="font-mono text-[9px] text-muted-foreground">
                {account.roleCode}
              </span>
            ) : null}
          </span>
        ))}
        {extra > 0 ? (
          <span className="text-[11px] text-muted-foreground">
            {t("more", { count: extra })}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The one place this screen states who the owner is: name, role, onboarding
 * stage, how to reach them, and whether they are under contract.
 *
 * Each of those used to appear twice — here and again in a stat card — so the
 * stat row is gone and this is the single source. The verified/unverified badge
 * went with it: it is a narrower fact than the onboarding stage, and two status
 * badges side by side read as contradictory rather than complementary.
 *
 * The contract period belongs on this screen at all because nothing else here
 * answers "is this owner under contract, and until when". The badge two lines
 * above reads the stored `onboardingStatus`, a projection an hourly job
 * refreshes, which says `Active` in two windows where the server's live gate
 * already refuses the owner — `lib/types/onboarding.types.ts` is explicit that
 * coverage must never be answered from it. The phase behind the period below is
 * computed per read, so these two sit deliberately close together: the badge
 * says what the account is, the period says what is actually true today.
 */
export function OwnerHeroCard({
  owner,
  isWalkIn = false,
  onboardingStatus,
  identity,
  company,
  today,
  nameLock,
}: {
  owner: OwnerSummaryDto;
  isWalkIn?: boolean;
  /** `null` when the KYC read 404'd or was refused — the badge is then omitted. */
  onboardingStatus?: string | null;
  /** `null` when the KYC read 404'd or was refused. */
  identity?: OwnerIdentityDto | null;
  /** `null` means the owner is a natural person — the absence is the fact. */
  company?: OwnerCompanyDto | null;
  today: number;
  /**
   * Why the legal name cannot be corrected here, when it cannot. The action row
   * drops its Edit button in exactly those states rather than disabling it, so
   * without this the button would simply be missing with nothing said; the cell
   * that holds the value carries the reason instead.
   */
  nameLock?: NameLock;
}) {
  const t = useTranslations("owners");
  const tOnboarding = useTranslations("onboarding");
  const tDocs = useTranslations("docsWorkspace");
  const locale = useLocale();

  function formatDate(iso: string | null): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  const contract = useOwnerContractCover(owner.id);
  const cover = describeCover(contract, today, {
    unavailable: () => t("contract.unavailable"),
    failed: () => tOnboarding("apiErrors.unknown"),
    none: () => tDocs("noContract"),
    note: (note: CoverNote) =>
      tDocs(note.key as Parameters<typeof tDocs>[0], note.values),
    formatDate,
  });

  // `OwnerSummaryDto` does not carry `profilePictureUrl` yet: GET /api/owners/{id}
  // omits it even though the entity has it and PUT /api/owners/{id} returns it.
  // Written to render the photo the moment the backend adds the field, and to
  // show initials until then — which is also the correct fallback afterwards.
  const pictureUrl =
    (owner as { profilePictureUrl?: string | null }).profilePictureUrl ?? null;

  const presentation = onboardingStatus
    ? onboardingStatusPresentation(onboardingStatus)
    : null;

  const legalName =
    [identity?.firstName, identity?.lastName].filter(Boolean).join(" ") || "—";

  // The registration and tax numbers, which nothing else on this screen shows.
  // Absent for a natural person, and that absence is itself the fact — there is
  // no `isLegalEntity` flag to read instead.
  const registry = company
    ? [company.licenseNumber, company.taxNumber].filter(Boolean).join(" · ")
    : null;

  const meta = [
    registry,
    t("account.joinedOn", { date: formatDate(owner.createdAt) }),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <IdentityBand
      initials={initialsOf(owner.fullName || "??")}
      pictureUrl={pictureUrl}
      name={owner.fullName || "—"}
      qualifier={company?.name ?? undefined}
      badges={
        <>
          {owner.roleCode ? (
            <Badge variant="secondary" className="font-mono">
              {owner.roleCode}
            </Badge>
          ) : null}
          {presentation ? (
            <Badge
              variant={presentation.variant}
              className={presentation.className}
            >
              {tOnboarding(
                `status.${presentation.labelKey}` as Parameters<
                  typeof tOnboarding
                >[0],
              )}
            </Badge>
          ) : null}
        </>
      }
      meta={meta || undefined}
      stats={isWalkIn ? undefined : <TeamChips ownerId={owner.id} />}
      actions={
        // Both are plain links, not integrations. The call button hands the
        // number to the OS and hears nothing back — there is deliberately no
        // call log, because "an admin clicked a button" is not evidence that a
        // call happened, and as an audit trail it would be false.
        //
        // Neither is offered on the walk-in account: it has no person behind it.
        isWalkIn ? undefined : (
          <>
            {owner.phoneNumber ? (
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
            ) : null}
            {owner.email ? (
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
            ) : null}
          </>
        )
      }
      tiles={
        <>
          <FactTile
            icon={<Mail className="size-3.5" />}
            label={t("account.email")}
            value={owner.email || "—"}
          />
          <FactTile
            icon={<Phone className="size-3.5" />}
            label={t("account.phone")}
            value={owner.phoneNumber || "—"}
            mono
          />
          {/* `ON ID` replaces the sentence that used to sit under this value: the
              tag says where the name came from in two words, which frees the
              hint line for the one thing it could not say before — why the name
              is not editable from here. */}
          <FactTile
            icon={<IdCard className="size-3.5" />}
            label={t("account.legalName")}
            value={legalName}
            trailing={
              legalName === "—" ? undefined : (
                <span className="rounded-[5px] bg-muted px-1.5 py-px text-[9px] tracking-[0.06em] text-muted-foreground">
                  {t("account.onId")}
                </span>
              )
            }
            hint={
              nameLock === "self-editable"
                ? t("account.legalNameSelfEdit")
                : nameLock === "no-profile"
                  ? t("account.legalNameNoProfile")
                  : undefined
            }
          />
          {/* Last in the row, and the only cell whose tone can turn: the three
              before it state facts that do not expire. */}
          <FactTile
            icon={<ScrollText className="size-3.5" />}
            label={t("contract.title")}
            value={
              cover.value === null ? (
                <Skeleton className="h-4 w-32" />
              ) : (
                cover.value
              )
            }
            hint={cover.hint}
            trailing={cover.trailing}
            tone={cover.tone}
            progress={cover.progress}
            mono
          />
        </>
      }
    />
  );
}
