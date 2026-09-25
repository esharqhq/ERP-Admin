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
// (index/dtos/notifications.md — titleDe/titleEn 200, bodyDe/bodyEn
// 4000), enforced via the native `maxLength` attribute so a length violation
// can never reach the server as an unmappable problem-details 400. The
// design's own "no char limits documented" note (B21) is about OneSignal
// device-side truncation, a separate and still-open question — not about
// whether a hard cap exists here.
//
// Two things the design mock shows here are deliberately NOT reproduced,
// both because there's no honest data source for them:
// - `l.share` ("default for 268 of 312"): how many of the eligible audience
//   have this language as their profile default. Nothing exposes that split
//   — same gap as the confirm dialog's fact 2 (schedule-confirm-dialog.tsx).
// - The "· fits a push title" qualifier on the title count: a claim about
//   on-device truncation, which B21 (still open) says is undocumented. The
//   raw count is real; a fit/no-fit verdict against an unconfirmed
//   threshold would be invented.
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

function CharCounter({ length, alarmed }: { length: number; alarmed: boolean }) {
  return (
    <span
      className={cn(
        "font-mono text-[10.5px] tabular-nums",
        alarmed ? "text-destructive" : "text-muted-foreground",
      )}
    >
      {length}
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
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "flex h-[22px] items-center rounded-md px-2 font-mono text-[11px] font-semibold",
            language === "de" ? "bg-accent text-accent-foreground" : "bg-muted text-foreground",
          )}
        >
          {language.toUpperCase()}
        </span>
        <span className="text-sm font-semibold text-foreground">{languageLabel}</span>
        {needsText && (
          <span className="ml-auto text-xs font-medium text-destructive">{t("needsText")}</span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor={`title-${language}`}>
            {t("title")} <span className="text-destructive">*</span>
          </Label>
          <CharCounter length={title.length} alarmed={needsText && !title.trim()} />
        </div>
        <Input
          id={`title-${language}`}
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          maxLength={TITLE_MAX}
          aria-invalid={needsText && !title.trim()}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor={`body-${language}`}>
            {t("body")} <span className="text-destructive">*</span>
          </Label>
          <CharCounter length={body.length} alarmed={needsText && !body.trim()} />
        </div>
        <Textarea
          id={`body-${language}`}
          value={body}
          onChange={(e) => onBodyChange(e.target.value)}
          maxLength={BODY_MAX}
          rows={5}
          aria-invalid={needsText && !body.trim()}
        />
      </div>
    </div>
  );
}
