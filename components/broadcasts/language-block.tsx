"use client";

import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// Source of truth: assets/Uyer Admin Broadcasts.dc.html §06 — both language
// blocks visible at once, NEVER tabbed. This component is one half of that
// pair; compose-form.tsx renders two of these side by side.
//
// Hard caps match the backend's actual [MaxLength] validation
// (Backend/index/dtos/notifications.md — titleDe/titleEn 200, bodyDe/bodyEn
// 4000), enforced via the native `maxLength` attribute so a length violation
// can never reach the server as an unmappable problem-details 400. The
// design's own "no char limits documented" note (B21) is about OneSignal
// device-side truncation, a separate and still-open question — not about
// whether a hard cap exists here.
const TITLE_MAX = 200;
const BODY_MAX = 4000;

export interface LanguageBlockProps {
  language: "de" | "en";
  title: string;
  body: string;
  onTitleChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  /** Whitespace-only violation, surfaced after a submit attempt. */
  needsText: boolean;
}

function CharCounter({ length, max, alarmed }: { length: number; max: number; alarmed: boolean }) {
  return (
    <span
      className={cn(
        "text-xs tabular-nums",
        alarmed ? "text-destructive" : "text-muted-foreground",
      )}
    >
      {length}/{max}
    </span>
  );
}

export function LanguageBlock({
  language,
  title,
  body,
  onTitleChange,
  onBodyChange,
  needsText,
}: LanguageBlockProps) {
  const t = useTranslations("broadcasts.compose.language");
  const languageLabel = language === "de" ? "Deutsch" : "English";

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-border bg-card p-4",
        needsText && "border-destructive/50 ring-1 ring-inset ring-destructive/20",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">{languageLabel}</span>
        {needsText && (
          <span className="text-xs font-medium text-destructive">{t("needsText")}</span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`title-${language}`}>
          {t("title")} <span className="text-destructive">*</span>
        </Label>
        <Input
          id={`title-${language}`}
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          maxLength={TITLE_MAX}
          aria-invalid={needsText && !title.trim()}
        />
        <div className="flex justify-end">
          <CharCounter length={title.length} max={TITLE_MAX} alarmed={needsText && !title.trim()} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`body-${language}`}>
          {t("body")} <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id={`body-${language}`}
          value={body}
          onChange={(e) => onBodyChange(e.target.value)}
          maxLength={BODY_MAX}
          rows={5}
          aria-invalid={needsText && !body.trim()}
        />
        <div className="flex justify-end">
          <CharCounter length={body.length} max={BODY_MAX} alarmed={needsText && !body.trim()} />
        </div>
      </div>
    </div>
  );
}
