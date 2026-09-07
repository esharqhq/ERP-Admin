"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Info, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { BroadcastAudience, BroadcastDetailDto, BroadcastStatus } from "@/lib/types/broadcast.types";

// Source of truth: assets/Uyer Admin Broadcast Detail.dc.html §01 — the
// left column's three cards (Banner, Content, Audience).

/**
 * Absent entirely when there's no banner — `f.bannerDisplay` in the design
 * is `hasImage ? flex : none`, i.e. the whole card, not an empty placeholder.
 */
function BannerCard({ imageUrl }: { imageUrl: string }) {
  const t = useTranslations("broadcasts.detail");
  return (
    <Card size="sm">
      <CardHeader className="flex-row items-center gap-2.5 border-b border-border pb-3">
        <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          {t("banner")}
        </span>
        <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">
          {imageUrl}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1.5 px-2 text-[11.5px]"
          nativeButton={false}
          render={<a href={imageUrl} target="_blank" rel="noreferrer" />}
        >
          <ExternalLink className="size-3" />
          {t("openOriginal")}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="aspect-[3/1] overflow-hidden rounded-xl bg-muted ring-1 ring-inset ring-border">
          {/* eslint-disable-next-line @next/next/no-img-element -- dynamic uploaded banner, no next/image remote-domain config (see banner-uploader.tsx precedent) */}
          <img src={imageUrl} alt="" className="size-full object-cover" />
        </div>
        <p className="text-[11.5px] leading-relaxed text-muted-foreground">
          {t("bannerCaption")}
        </p>
      </CardContent>
    </Card>
  );
}

function LanguageColumn({
  language,
  title,
  body,
  divider,
}: {
  language: "de" | "en";
  title: string;
  body: string;
  divider: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col gap-2.5 px-4 py-3.5",
        divider && "border-r border-border",
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "flex h-5 items-center rounded-md px-1.5 font-mono text-[10.5px] font-bold",
            language === "de" ? "bg-accent text-accent-foreground" : "bg-muted text-foreground",
          )}
        >
          {language.toUpperCase()}
        </span>
        <span className="text-[11.5px] text-muted-foreground">
          {language === "de" ? "Deutsch" : "English"}
        </span>
      </div>
      <span className="text-[15px] font-semibold tracking-tight text-foreground">{title}</span>
      <span className="text-[13px] leading-relaxed text-foreground/85">{body}</span>
    </div>
  );
}

function ContentCard({ detail }: { detail: BroadcastDetailDto }) {
  const t = useTranslations("broadcasts.detail");
  const [copied, setCopied] = useState(false);

  const copyBoth = () => {
    const text = [
      `DE — ${detail.titleDe}\n${detail.bodyDe}`,
      `EN — ${detail.titleEn}\n${detail.bodyEn}`,
    ].join("\n\n");
    void navigator.clipboard
      ?.writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  };

  return (
    <Card size="sm">
      <CardHeader className="flex-row items-center gap-2.5 border-b border-border pb-3">
        <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          {t("content")}
        </span>
        <span className="text-xs text-muted-foreground">{t("bothVersionsNote")}</span>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1.5 px-2 text-[11.5px]"
          onClick={copyBoth}
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {t("copyBoth")}
        </Button>
      </CardHeader>
      <CardContent className="flex divide-x divide-border p-0">
        <LanguageColumn language="de" title={detail.titleDe} body={detail.bodyDe} divider />
        <LanguageColumn language="en" title={detail.titleEn} body={detail.bodyEn} divider={false} />
      </CardContent>
    </Card>
  );
}

/**
 * The eligible-audience (Workers/Owners/Both) and Custom copy families,
 * extended from the design's five drawn examples — one real body per status,
 * each for a *different* audience, since the mock only ever draws one frame
 * per status. The other combinations weren't drawn; these follow the same
 * voice and the same facts (resolved live vs. frozen list, before vs. after
 * fan-out) rather than inventing new claims. Collapsed into two families
 * instead of a full 4×5 matrix: Workers/Owners/Both differ only in which
 * noun fills the sentence, never in what actually happened.
 */
function audienceNoun(
  audience: BroadcastAudience,
  t: ReturnType<typeof useTranslations<"broadcasts.detail">>,
): string {
  switch (audience) {
    case "Workers":
      return t("audience.nounWorkers");
    case "Owners":
      return t("audience.nounOwners");
    case "Both":
      return t("audience.nounBoth");
    case "Custom":
      return "";
  }
}

function audienceCopy(
  detail: Pick<BroadcastDetailDto, "status" | "audience" | "recipientCount" | "namedCount">,
  t: ReturnType<typeof useTranslations<"broadcasts.detail">>,
): { headline: string; body: string } {
  const status = detail.status;
  if (detail.audience === "Custom") {
    const count = detail.namedCount ?? 0;
    const headline = t("audience.customHeadline", { count });
    const bodyKey = (
      {
        Scheduled: "audience.customBodyScheduled",
        Sending: "audience.customBodySending",
        Sent: "audience.customBodySent",
        Cancelled: "audience.customBodyCancelled",
        Missed: "audience.customBodyMissed",
      } satisfies Record<BroadcastStatus, string>
    )[status];
    return { headline, body: t(bodyKey as Parameters<typeof t>[0], { count }) };
  }

  const noun = audienceNoun(detail.audience, t);
  if (status === "Sent") {
    const label =
      detail.audience === "Both" ? t("audience.sentLabelBoth") : t(`audienceLabels.${detail.audience}` as never);
    return {
      headline: t("audience.sentHeadline", { label, count: detail.recipientCount }),
      body:
        detail.audience === "Both"
          ? t("audience.sentBodyBoth")
          : t("audience.sentBody", { noun }),
    };
  }
  if (status === "Scheduled" || status === "Sending") {
    return {
      headline: t("audience.eligibleHeadline", { noun }),
      body: t(status === "Scheduled" ? "audience.eligibleBodyScheduled" : "audience.eligibleBodySending"),
    };
  }
  // Cancelled or Missed — never resolved, nothing to count.
  return {
    headline: t("audience.wouldHaveBeenHeadline", { noun }),
    body: t(status === "Cancelled" ? "audience.eligibleBodyCancelled" : "audience.eligibleBodyMissed", { noun }),
  };
}

function AudienceCard({ detail }: { detail: BroadcastDetailDto }) {
  const t = useTranslations("broadcasts.detail");
  const tBroadcasts = useTranslations("broadcasts");
  const { headline, body } = audienceCopy(detail, t);
  const audienceLabel = tBroadcasts(`audienceLabels.${detail.audience}` as Parameters<typeof tBroadcasts>[0]);

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            {t("audience.label")}
          </span>
          <Badge variant="outline" className="gap-1.5">
            {audienceLabel}
          </Badge>
          <span className="text-[13px] font-semibold text-foreground">{headline}</span>
        </div>
        <p className="text-[13px] leading-relaxed text-foreground/85">{body}</p>

        {detail.audience === "Custom" && (
          <div className="flex flex-col gap-1.5 rounded-xl bg-[color-mix(in_oklab,var(--status-info)_6%,transparent)] p-2.5 ring-1 ring-inset ring-[color-mix(in_oklab,var(--status-info)_22%,transparent)]">
            <span className="flex items-start gap-2 text-[12.5px] leading-relaxed text-foreground/80">
              <Lock className="mt-0.5 size-3.5 shrink-0 text-status-info" />
              {t("audience.frozenListNote")}
            </span>
            <span className="flex items-start gap-2 text-[12.5px] leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              {t("audience.noNamesNote")}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function BroadcastDetailPanels({ detail }: { detail: BroadcastDetailDto }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4">
      {detail.imageUrl && <BannerCard imageUrl={detail.imageUrl} />}
      <ContentCard detail={detail} />
      <AudienceCard detail={detail} />
    </div>
  );
}
