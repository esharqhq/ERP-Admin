import { Mail, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTranslations } from "next-intl";
import type { OwnerSummaryDto } from "@/lib/types/owner.types";

/**
 * Who the owner is, at a glance: photo, display name, and the two ways to reach
 * them.
 *
 * Role and onboarding stage are deliberately **not** here — they are labelled
 * rows on the contact card, where they read as facts rather than as decoration
 * beside a name. Repeating them was what the removed stat row did.
 */
export function HeroCard({
  owner,
  isWalkIn = false,
}: {
  owner: OwnerSummaryDto;
  isWalkIn?: boolean;
}) {
  const t = useTranslations("owners");
  const initials = (owner.fullName || "??").slice(0, 2).toUpperCase();

  // `OwnerSummaryDto` does not carry profilePictureUrl yet: GET /api/owners/{id}
  // omits it even though the entity has it and PUT /api/owners/{id} returns it.
  // Written to render the photo the moment the backend adds the field, and to
  // show initials until then — which is also the correct fallback afterwards.
  const pictureUrl =
    (owner as { profilePictureUrl?: string | null }).profilePictureUrl ?? null;

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
            <div className="flex flex-col pb-1">
              <h1 className="font-heading text-2xl font-bold tracking-tight leading-tight sm:text-[28px]">
                {owner.fullName || "—"}
              </h1>
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
