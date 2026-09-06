"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { LanguageBlock } from "@/components/broadcasts/language-block";
import { BannerUploader } from "@/components/broadcasts/banner-uploader";
import type {
  BroadcastAudience,
  BroadcastCustomAudienceDto,
  BroadcastDetailDto,
} from "@/lib/types/broadcast.types";

// Source of truth: assets/Uyer Admin Broadcasts.dc.html §06–09 and the
// standalone assets/Uyer Admin Broadcast Compose.dc.html §01–05. Both read
// whole before any line of this form was written.
//
// This file is the shared shell for all three modes (create/edit/recreate —
// §05's "Save as a new broadcast" escape hatch is why recreate exists at
// all) and is built up over six commits. The full value shape below is
// frozen from commit 1 on, even though most of it has no control wired to
// it yet — audience (commit 3), banner + timing + reach preview (commit 4),
// confirm/submit (commit 5), edit/recreate prefill (commit 6). Freezing it
// now means later commits fill declared slots instead of reshaping the
// contract each time.

export type ComposeMode = "create" | "edit" | "recreate";

export interface ComposeFormValues {
  titleDe: string;
  bodyDe: string;
  titleEn: string;
  bodyEn: string;
  /** `null` is the deliberate "not yet chosen" state (broadcast.types.ts D4) — never preselected. */
  audience: BroadcastAudience | null;
  /** `null` = send now. */
  scheduledAtUtc: string | null;
  imageStorageKey: string | null;
  /** Local-only, for the 236px preview slot — never sent to the API. */
  imagePreviewUrl: string | null;
  /** Only meaningful, and only ever sent, when `audience === "Custom"`. */
  selection: BroadcastCustomAudienceDto | null;
}

export const DEFAULT_COMPOSE_VALUES: ComposeFormValues = {
  titleDe: "",
  bodyDe: "",
  titleEn: "",
  bodyEn: "",
  audience: null,
  scheduledAtUtc: null,
  imageStorageKey: null,
  imagePreviewUrl: null,
  selection: null,
};

export interface ComposeFormProps {
  mode: ComposeMode;
  /** Required for "edit" — the id the PUT targets. */
  broadcastId?: string;
  /** Defaults for "create"; prefilled for "edit"/"recreate". */
  initialValues?: ComposeFormValues;
  /**
   * Edit mode only: the current banner's public URL
   * (`BroadcastDetailDto.imageUrl`). `BroadcastDetailDto` carries no
   * `imageStorageKey` to round-trip, so an edit that does not upload a
   * replacement cannot silently re-send the existing key — see the banner
   * uploader (commit 2) for how this is drawn honest rather than guessed.
   */
  existingImageUrl?: string | null;
  onSaved: (detail: BroadcastDetailDto, savedMode: "create" | "edit") => void;
}

function isTextFilled(v: string): boolean {
  return v.trim().length > 0;
}

export function ComposeForm({
  mode,
  broadcastId: _broadcastId,
  initialValues,
  existingImageUrl,
  onSaved: _onSaved,
}: ComposeFormProps) {
  const t = useTranslations("broadcasts.compose");
  const router = useRouter();

  const [values, setValues] = useState<ComposeFormValues>(
    initialValues ?? DEFAULT_COMPOSE_VALUES,
  );
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const filledCount = useMemo(
    () =>
      [values.titleDe, values.bodyDe, values.titleEn, values.bodyEn].filter(isTextFilled)
        .length,
    [values.titleDe, values.bodyDe, values.titleEn, values.bodyEn],
  );
  const allTextFilled = filledCount === 4;

  // Timing has no "unset" state of its own — `scheduledAtUtc: null` legitimately
  // means "send now" (commit 4 adds the Send-now/Schedule toggle that lets an
  // admin choose that on purpose, vs. just never having touched it). Until that
  // toggle exists nothing can express "timing chosen" beyond audience being set,
  // so this reduces to `allTextFilled && audience !== null` today — which, since
  // nothing sets `audience` before commit 3 either, keeps Save correctly disabled
  // in the meantime rather than only appearing to be.
  const canSubmit = allTextFilled && values.audience !== null;

  const reasonText = !canSubmit ? t("disabledReason") : null;

  const set = <K extends keyof ComposeFormValues>(key: K, value: ComposeFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const needsTextDe = submitAttempted && (!isTextFilled(values.titleDe) || !isTextFilled(values.bodyDe));
  const needsTextEn = submitAttempted && (!isTextFilled(values.titleEn) || !isTextFilled(values.bodyEn));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {t("contentLabel")}
          </span>
          <span className="flex h-5 items-center rounded-md bg-fresh-tint px-2 text-[11px] font-semibold text-primary">
            {t("filledCounter", { count: filledCount })}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <LanguageBlock
            language="de"
            title={values.titleDe}
            body={values.bodyDe}
            onTitleChange={(v) => set("titleDe", v)}
            onBodyChange={(v) => set("bodyDe", v)}
            needsText={needsTextDe}
          />
          <LanguageBlock
            language="en"
            title={values.titleEn}
            body={values.bodyEn}
            onTitleChange={(v) => set("titleEn", v)}
            onBodyChange={(v) => set("bodyEn", v)}
            needsText={needsTextEn}
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <BannerUploader
          value={{ storageKey: values.imageStorageKey, previewUrl: values.imagePreviewUrl }}
          onChange={(next) => {
            setValues((prev) => ({
              ...prev,
              imageStorageKey: next.storageKey,
              imagePreviewUrl: next.previewUrl,
            }));
          }}
          existingImageUrl={mode === "edit" ? existingImageUrl : null}
        />
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
        {reasonText && <span className="text-xs text-muted-foreground">{reasonText}</span>}
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/dashboard/notifications/broadcasts")}
        >
          {t("discard")}
        </Button>
        <Button
          type="button"
          disabled={!canSubmit}
          onClick={() => setSubmitAttempted(true)}
        >
          {mode === "edit" ? t("saveChanges") : t("submit")}
        </Button>
      </div>
    </div>
  );
}
