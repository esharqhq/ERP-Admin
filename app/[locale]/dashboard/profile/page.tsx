"use client";

import { useTranslations } from "next-intl";
import { BadgeCheck, Info, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ChangePasswordCard } from "@/components/profile/change-password-card";
import { useMyProfile } from "@/hooks/use-profile";

export default function ProfilePage() {
  const t = useTranslations("profile");
  const { profile, isLoading, isError } = useMyProfile();

  const Header = (
    <div className="flex flex-col gap-1">
      <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">{t("title")}</h1>
      <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
    </div>
  );

  if (isLoading && !profile) {
    return (
      <div className="flex flex-col gap-6">
        {Header}
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    );
  }

  if (isError && !profile) {
    return (
      <div className="flex flex-col gap-6">
        {Header}
        <p className="text-sm text-destructive">{t("loadError")}</p>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="flex flex-col gap-6">
      {Header}

      <Card>
        <CardContent className="flex flex-col gap-5 p-6">
          <div className="flex items-center gap-4">
            <Avatar className="size-20 ring-1 ring-border">
              {profile.profilePictureUrl && (
                <AvatarImage src={profile.profilePictureUrl} alt={profile.fullName} />
              )}
              <AvatarFallback className="bg-muted text-lg font-semibold">
                {profile.fullName?.slice(0, 2).toUpperCase() ?? ''}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <h2 className="font-heading text-2xl font-bold tracking-tight">{profile.fullName}</h2>
                {profile.isVerified && (
                  <BadgeCheck className="size-5 text-primary" aria-label={t("verified")} />
                )}
              </div>
              <span className="text-sm text-muted-foreground">{profile.email}</span>
              {profile.role && (
                <div className="mt-1">
                  <Badge variant="secondary" className="gap-1">
                    <ShieldCheck className="size-3" />
                    {profile.role.name}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            <span>{t("managedNote")}</span>
          </div>
        </CardContent>
      </Card>

      <ChangePasswordCard />
    </div>
  );
}
