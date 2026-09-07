"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Eye } from "lucide-react";
import { useBroadcastAudiencePreview } from "@/hooks/use-broadcast-audience-preview";
import { getApiErrorCode } from "@/lib/http/api-error";
import { cn } from "@/lib/utils";
import type { BroadcastAudience, BroadcastCustomAudienceDto } from "@/lib/types/broadcast.types";

// Source of truth: assets/Uyer Admin Broadcasts.dc.html §06 (the dark-green
// "Reach & preview" rail) and §07 (the "Pick an audience to see the reach"
// empty state) — and the standalone Compose.dc.html #05: "the push preview
// shows the DE version first... because German is the fallback profile
// language and therefore the majority read."

export interface ReachPreviewContent {
  titleDe: string;
  bodyDe: string;
  titleEn: string;
  bodyEn: string;
  imagePreviewUrl: string | null;
}

export interface ReachPreviewPanelProps {
  audience: BroadcastAudience | null;
  selection: BroadcastCustomAudienceDto | null;
  content: ReachPreviewContent;
}

function StatCard({
  value,
  label,
  accent,
}: {
  value: number | undefined;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col gap-0.5 rounded-xl bg-white/10 p-2.5">
      <span
        className={cn(
          "font-mono text-[22px] leading-none font-semibold",
          accent ? "text-fresh" : "text-white",
        )}
      >
        {value ?? "—"}
      </span>
      <span className="text-[11px] leading-snug text-white/60">{label}</span>
    </div>
  );
}

export function ReachPreviewPanel({ audience, selection, content }: ReachPreviewPanelProps) {
  const t = useTranslations("broadcasts.compose.reach");
  const tAudience = useTranslations("broadcasts.audienceLabels");
  const tRow = useTranslations("broadcasts.row");
  const [lang, setLang] = useState<"de" | "en">("de");

  const preview = useBroadcastAudiencePreview(audience, selection);
  const nothingToPreview = audience === null || (audience === "Custom" && selection === null);

  const eligibleAudienceLabel =
    audience === "Both" ? tRow("audienceBoth") : audience ? tAudience(audience) : "";

  const errorCode = preview.isError ? getApiErrorCode(preview.error) : null;
  const errorText =
    errorCode === "broadcast_audience_too_large" ? t("tooLargeToPreview") : t("previewError");

  const onPhoneLabel = audience === "Owners" ? t("onOwnerPhone") : t("onWorkerPhone");
  const title = lang === "de" ? content.titleDe : content.titleEn;
  const body = lang === "de" ? content.bodyDe : content.bodyEn;

  return (
    <div className="flex flex-1 flex-col gap-3 rounded-xl bg-primary p-4 text-white">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold tracking-wide text-fresh uppercase">
          {t("label")}
        </span>
        <div className="flex-1" />
        <div className="flex gap-0.5 rounded-lg bg-white/10 p-0.5">
          <button
            type="button"
            onClick={() => setLang("de")}
            className={cn(
              "h-[22px] rounded-md px-2 font-mono text-[10.5px] font-semibold",
              lang === "de" ? "bg-white text-primary" : "text-white/70",
            )}
          >
            DE
          </button>
          <button
            type="button"
            onClick={() => setLang("en")}
            className={cn(
              "h-[22px] rounded-md px-2 font-mono text-[10.5px] font-semibold",
              lang === "en" ? "bg-white text-primary" : "text-white/70",
            )}
          >
            EN
          </button>
        </div>
      </div>

      {nothingToPreview ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
          <span className="flex size-11 items-center justify-center rounded-xl bg-white/10 text-white/40">
            <Eye className="size-5" />
          </span>
          <span className="text-sm font-semibold">{t("pickAudienceTitle")}</span>
          <span className="max-w-[220px] text-xs text-white/60">{t("pickAudienceBody")}</span>
        </div>
      ) : (
        <>
          {preview.isError ? (
            <p className="text-xs text-destructive">{errorText}</p>
          ) : audience === "Custom" ? (
            <div className="flex gap-2">
              <StatCard value={preview.data?.namedCount} label={t("namedCard")} />
              <StatCard value={preview.data?.eligibleCount} label={t("eligibleCard")} accent />
            </div>
          ) : (
            <div className="rounded-xl bg-white/10 p-3">
              <span className="block font-mono text-[22px] leading-none font-semibold text-fresh">
                {preview.data?.eligibleCount ?? "—"}
              </span>
              <span className="text-xs text-white/65">
                {t("eligibleSingle", { audience: eligibleAudienceLabel })}
              </span>
            </div>
          )}

          <div className="flex min-h-0 flex-1 flex-col gap-2">
            <span className="text-[10.5px] font-semibold tracking-wide text-white/45 uppercase">
              {onPhoneLabel}
            </span>
            <div className="flex flex-col gap-2 rounded-xl bg-background p-2.5 text-foreground shadow-lg">
              <div className="flex items-start gap-2">
                <span className="flex size-[26px] flex-none items-center justify-center rounded-md bg-primary text-[10px] font-bold text-primary-foreground">
                  U
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[11px] font-bold tracking-wide">UYER</span>
                    <span className="text-[10px] text-muted-foreground">{t("now")}</span>
                  </div>
                  <span className="truncate text-[12.5px] font-semibold">{title || "—"}</span>
                  <span className="line-clamp-2 text-[11.5px] text-muted-foreground">
                    {body || "—"}
                  </span>
                </div>
              </div>
              {content.imagePreviewUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- push preview thumbnail, same no-next/image-config precedent as banner-uploader.tsx
                <img
                  src={content.imagePreviewUrl}
                  alt=""
                  className="h-16 w-full rounded-lg object-cover"
                />
              )}
            </div>
            <span className="text-[11px] text-white/55">{t("noDeepLink")}</span>
          </div>
        </>
      )}
    </div>
  );
}
