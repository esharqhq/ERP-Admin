import { Mail, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTranslations } from "next-intl";
import { onboardingStatusPresentation } from "@/lib/onboarding/status";
import type { OwnerSummaryDto } from "@/lib/types/owner.types";

/**
 * The one place this screen states who the owner is: photo, display name, role,
 * and onboarding stage.
 *
 * Each of those used to appear twice — here and again in a stat card — so the
 * stat row is gone and this is the single source. The verified/unverified badge
 * went with it: it is a narrower fact than the onboarding stage, and two status
 * badges side by side read as contradictory rather than complementary.
 */
export function HeroCard({
  owner,
  isWalkIn = false,
  onboardingStatus,
}: {
  owner: OwnerSummaryDto;
  isWalkIn?: boolean;
  /** `null` when the KYC read 404'd or was refused — the badge is then omitted. */
  onboardingStatus?: string | null;
}) {
  const t = useTranslations("owners");
  const tOnboarding = useTranslations("onboarding");
  const initials = (owner.fullName || "??").slice(0, 2).toUpperCase();

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
        className="h-24 w-full bg-gradient-to-r from-primary/12 via-primary/6 to-accent/10"
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
      </CardContent>
    </Card>
  );
}
