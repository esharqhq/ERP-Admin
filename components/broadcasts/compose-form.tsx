"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { LanguageBlock } from "@/components/broadcasts/language-block";
import { BannerUploader } from "@/components/broadcasts/banner-uploader";
import { AudiencePicker } from "@/components/broadcasts/audience-picker";
import {
  computeScheduledAtUtc,
  isoToLocalParts,
  TimingPicker,
  type SendMode,
} from "@/components/broadcasts/timing-picker";
import { ReachPreviewPanel } from "@/components/broadcasts/reach-preview-panel";
import { ScheduleConfirmDialog } from "@/components/broadcasts/schedule-confirm-dialog";
import { broadcastService } from "@/lib/services/broadcast.service";
import { newIdempotencyKey } from "@/lib/http/idempotency";
import { getApiErrorCode, getValidationMessage } from "@/lib/http/api-error";
import type {
  BroadcastAudience,
  BroadcastCustomAudienceDto,
  BroadcastDetailDto,
  CreateBroadcastRequest,
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
  /**
   * UI-only — `scheduledAtUtc` is the only timing field the API sees.
   * `"unset"` and `"now"` both leave `scheduledAtUtc: null`, but only
   * `"now"` counts as "timing chosen" for Save; `"unset"` is the true
   * neither-preselected starting state (design §07 #03).
   */
  sendMode: SendMode;
  /** UI-only, local time — `YYYY-MM-DD` / `HH:MM`. Combined into `scheduledAtUtc`. */
  scheduleDate: string;
  scheduleTime: string;
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
  sendMode: "unset",
  scheduleDate: "",
  scheduleTime: "",
};

export interface ComposeFormProps {
  mode: ComposeMode;
  /** Required for "edit" — the id the PUT targets. */
  broadcastId?: string;
  /** Defaults for "create"; prefilled for "edit"/"recreate". */
  initialValues?: ComposeFormValues;
  /**
   * Edit and recreate: the source broadcast's banner, if it had one
   * (`BroadcastDetailDto.imageUrl`). Neither mode can round-trip
   * `imageStorageKey` — the DTO never returns it — so neither can silently
   * carry the banner forward; the uploader shows it read-only with an
   * explicit "upload a replacement or it won't carry over" note instead of
   * guessing (see banner-uploader.tsx).
   */
  existingImageUrl?: string | null;
  /** A one-line disclosure shown above the form — e.g. recreate silently dropping a Custom audience. */
  notice?: string;
  /** Page title/subtitle — rendered in the form's own header row alongside Discard/Save (design §06: one action bar, at the top, not a second one at the bottom). */
  title: string;
  subtitle: string;
  onSaved: (detail: BroadcastDetailDto, savedMode: "create" | "edit") => void;
}

function isTextFilled(v: string): boolean {
  return v.trim().length > 0;
}

/**
 * Edit-mode prefill. Callers must not invoke this for a Custom-audience
 * broadcast — `BroadcastDetailDto` has no `selection` field at all (16 keys,
 * f-01-a-broadcast-core.md §5.2), so there is no way to know who was picked,
 * and a PUT resends whatever `selection` the form holds wholesale. Re-saving
 * with an empty or re-picked selection would silently narrow or wipe the
 * frozen audience rather than leave it alone — the edit route itself blocks
 * this case (see [id]/edit/page.tsx) rather than trusting a caller to.
 */
export function broadcastDetailToEditValues(detail: BroadcastDetailDto): ComposeFormValues {
  const sendMode: SendMode = detail.scheduledAtUtc ? "schedule" : "now";
  const { date, time } = detail.scheduledAtUtc
    ? isoToLocalParts(detail.scheduledAtUtc)
    : { date: "", time: "" };
  return {
    titleDe: detail.titleDe,
    bodyDe: detail.bodyDe,
    titleEn: detail.titleEn,
    bodyEn: detail.bodyEn,
    audience: detail.audience,
    scheduledAtUtc: detail.scheduledAtUtc,
    imageStorageKey: null,
    imagePreviewUrl: null,
    selection: null,
    sendMode,
    scheduleDate: date,
    scheduleTime: time,
  };
}

/**
 * Recreate-mode prefill: everything but the schedule carries over (§05 —
 * "Recreate loads from an existing broadcast BUT scheduledAtUtc starts
 * empty"). A Custom source resets to `audience: null` rather than "Custom"
 * with an empty selection — same root gap as the edit case above, but here
 * it's benign: nothing stops the admin from picking a fresh audience, so the
 * form reads as "not yet chosen" instead of "chosen but stuck."
 */
export function broadcastDetailToRecreateValues(detail: BroadcastDetailDto): ComposeFormValues {
  return {
    titleDe: detail.titleDe,
    bodyDe: detail.bodyDe,
    titleEn: detail.titleEn,
    bodyEn: detail.bodyEn,
    audience: detail.audience === "Custom" ? null : detail.audience,
    scheduledAtUtc: null,
    imageStorageKey: null,
    imagePreviewUrl: null,
    selection: null,
    sendMode: "unset",
    scheduleDate: "",
    scheduleTime: "",
  };
}

/**
 * `selection` is only ever attached for Custom — sending it alongside
 * Workers/Owners/Both is `broadcast_selection_not_allowed` (f-01-a-broadcast
 * -core.md §8), the same rule use-broadcast-audience-preview.ts follows.
 */
function buildPayload(values: ComposeFormValues): CreateBroadcastRequest {
  return {
    titleDe: values.titleDe.trim(),
    bodyDe: values.bodyDe.trim(),
    titleEn: values.titleEn.trim(),
    bodyEn: values.bodyEn.trim(),
    audience: values.audience,
    scheduledAtUtc: values.scheduledAtUtc ?? undefined,
    imageStorageKey: values.imageStorageKey ?? undefined,
    selection: values.audience === "Custom" ? (values.selection ?? undefined) : undefined,
  };
}

export function ComposeForm({
  mode,
  broadcastId,
  initialValues,
  existingImageUrl,
  notice,
  title,
  subtitle,
  onSaved,
}: ComposeFormProps) {
  const t = useTranslations("broadcasts.compose");
  const router = useRouter();
  const queryClient = useQueryClient();

  const [values, setValues] = useState<ComposeFormValues>(
    initialValues ?? DEFAULT_COMPOSE_VALUES,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Minted once per mounted form instance — i.e. once per user-initiated
  // compose attempt — and held for as long as that attempt may retry, per
  // lib/http/idempotency.ts's own contract. A successful create navigates
  // away, discarding this along with the unmounted form; a failed one keeps
  // it, so a retry replays instead of authoring a second broadcast. Not used
  // for edit (broadcastService.update isn't idempotent — no key to thread
  // through it).
  const [idempotencyKey] = useState(() => newIdempotencyKey());

  // Driven by the save attempt's actual response, not by a synthetic
  // "submit was clicked" flag — `canSubmit` below already trim-checks, so a
  // whitespace-only text field can never reach a clickable Save in the first
  // place. What these guard against is the server's own `broadcast_text_
  // required` (a client/server state mismatch, however unlikely) and
  // `broadcast_schedule_in_past` (a real, reachable race: the picked time
  // was valid when chosen and expired while the confirm dialog was open).
  // `textRequiredError` never needs an explicit clear: `needsTextDe`/
  // `needsTextEn` below already AND it with each field's own fill state, so
  // fixing the text turns the highlight off on its own. `pastError` clears
  // from the timing handlers directly, once the admin touches date/time/mode
  // again — not from an effect watching those values (the set-state-in-
  // effect rule: a derived reset belongs in the handler that changes the
  // thing it's derived from, not in a `useEffect` on the result).
  const [textRequiredError, setTextRequiredError] = useState(false);
  const [pastError, setPastError] = useState(false);
  const [notEditable, setNotEditable] = useState(false);
  const [genericError, setGenericError] = useState<string | null>(null);

  const filledCount = useMemo(
    () =>
      [values.titleDe, values.bodyDe, values.titleEn, values.bodyEn].filter(isTextFilled)
        .length,
    [values.titleDe, values.bodyDe, values.titleEn, values.bodyEn],
  );
  const allTextFilled = filledCount === 4;

  // A Custom audience with nothing named or filtered isn't really "chosen" —
  // it would submit as broadcast_selection_required. AudiencePicker already
  // reports selection as `null` whenever nothing's been picked or filtered.
  const hasUsableAudience =
    values.audience !== null && (values.audience !== "Custom" || values.selection !== null);

  const hasUsableTiming =
    values.sendMode === "now" || (values.sendMode === "schedule" && values.scheduledAtUtc !== null);

  const canSubmit = allTextFilled && hasUsableAudience && hasUsableTiming;

  const reasonText = !canSubmit ? t("disabledReason") : null;

  const set = <K extends keyof ComposeFormValues>(key: K, value: ComposeFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const save = useMutation({
    // Once `broadcast_not_editable` has fired, "Save as a new broadcast"
    // (§05) really does POST as new rather than retry the same PUT — it
    // isn't just a relabelled button.
    mutationFn: () =>
      mode === "edit" && broadcastId && !notEditable
        ? broadcastService.update(broadcastId, buildPayload(values))
        : broadcastService.create(buildPayload(values), idempotencyKey),
  });

  const handleConfirm = () => {
    setTextRequiredError(false);
    setPastError(false);
    setNotEditable(false);
    setGenericError(null);

    save.mutate(undefined, {
      onSuccess: (detail) => {
        setConfirmOpen(false);
        queryClient.invalidateQueries({ queryKey: ["broadcasts"] });
        // "Scheduled" comes back from the API even for a send-now row (it
        // becomes Sending, then Sent, within the next minute — §6), so the
        // toast branches on what the admin actually chose, never on
        // `detail.status` — reading that would render "Scheduled" for a
        // send-now, which §09 explicitly rules out.
        if (values.sendMode === "now") {
          toast.success(t("aftermath.sendingTitle"), {
            description: t("aftermath.sendingDescription"),
          });
        } else {
          const datetime = values.scheduledAtUtc
            ? new Date(values.scheduledAtUtc).toLocaleString(undefined, {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "";
          toast.success(t("aftermath.scheduledTitle", { datetime }), {
            description: t("aftermath.scheduledDescription"),
          });
        }
        onSaved(detail, mode === "edit" && !notEditable ? "edit" : "create");
      },
      onError: (error) => {
        setConfirmOpen(false);
        const code = getApiErrorCode(error);
        if (code === "broadcast_schedule_in_past") {
          setPastError(true);
        } else if (code === "broadcast_text_required") {
          // `detail` is prose, not a per-field pointer (f-01-a-broadcast-core.md
          // §8), so both blocks are flagged rather than guessing which one.
          setTextRequiredError(true);
        } else if (code === "broadcast_not_editable" && mode === "edit") {
          setNotEditable(true);
        } else if (code === "broadcast_forbidden") {
          // Not retryable — holding notification:broadcast doesn't make this
          // admin the row's creator or a SUPER_ADMIN, and that won't change
          // on a second click, so this must not fall into the generic
          // "Try again" copy.
          setGenericError(t("errors.forbidden"));
        } else {
          setGenericError(getValidationMessage(error) ?? t("errors.generic"));
        }
      },
    });
  };

  const needsTextDe = textRequiredError && (!isTextFilled(values.titleDe) || !isTextFilled(values.bodyDe));
  const needsTextEn = textRequiredError && (!isTextFilled(values.titleEn) || !isTextFilled(values.bodyEn));

  const submitLabel = notEditable ? t("errors.saveAsNew") : mode === "edit" ? t("saveChanges") : t("submit");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              className="-ml-2 gap-1.5 text-muted-foreground"
              render={<Link href="/dashboard/notifications/broadcasts" />}
            >
              <ArrowLeft className="size-4" />
              {t("backToList")}
            </Button>
          </div>
          <h1 className="font-heading text-2xl font-bold tracking-tight leading-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-3">
            {reasonText && (
              <span className="max-w-[220px] text-right text-xs text-muted-foreground">
                {reasonText}
              </span>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard/notifications/broadcasts")}
            >
              {t("discard")}
            </Button>
            <Button type="button" disabled={!canSubmit} onClick={() => setConfirmOpen(true)}>
              {submitLabel}
            </Button>
          </div>
          {notEditable && <p className="text-xs text-status-pending-deep">{t("errors.notEditable")}</p>}
          {genericError && <p className="text-xs text-destructive">{genericError}</p>}
        </div>
      </div>

      {notice && (
        <p className="rounded-lg bg-status-info-tint px-3 py-2 text-xs text-status-info">{notice}</p>
      )}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {t("contentLabel")}
              </span>
              <span className="flex h-5 items-center rounded-md bg-fresh-tint px-2 text-[11px] font-semibold text-primary">
                {t("filledCounter", { count: filledCount })}
              </span>
              <div className="flex-1" />
              <span className="text-[11.5px] text-muted-foreground">{t("plainTextNote")}</span>
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

            <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-2.5 ring-1 ring-inset ring-border">
              <span className="text-xs leading-relaxed text-muted-foreground text-pretty">
                {t("perLanguageNote")}
              </span>
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
              existingImageUrl={mode === "edit" || mode === "recreate" ? existingImageUrl : null}
            />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <AudiencePicker
            audience={values.audience}
            selection={values.selection}
            onAudienceChange={(audience) =>
              setValues((prev) => ({
                ...prev,
                audience,
                // Custom's picks/filters are meaningless under any other mode
                // — and would trip broadcast_selection_not_allowed if sent —
                // so switching away clears them rather than leaving them to
                // linger in state (design §08: "this list freezes when you
                // save", nothing implies it survives an audience change too).
                selection: audience === "Custom" ? prev.selection : null,
              }))
            }
            onSelectionChange={(selection) => set("selection", selection)}
          />

          <TimingPicker
            sendMode={values.sendMode}
            date={values.scheduleDate}
            time={values.scheduleTime}
            onSendModeChange={(sendMode) => {
              setPastError(false);
              setValues((prev) => ({
                ...prev,
                sendMode,
                scheduledAtUtc:
                  sendMode === "schedule"
                    ? computeScheduledAtUtc(prev.scheduleDate, prev.scheduleTime)
                    : null,
              }));
            }}
            onDateChange={(scheduleDate) => {
              setPastError(false);
              setValues((prev) => ({
                ...prev,
                scheduleDate,
                scheduledAtUtc:
                  prev.sendMode === "schedule"
                    ? computeScheduledAtUtc(scheduleDate, prev.scheduleTime)
                    : prev.scheduledAtUtc,
              }));
            }}
            onTimeChange={(scheduleTime) => {
              setPastError(false);
              setValues((prev) => ({
                ...prev,
                scheduleTime,
                scheduledAtUtc:
                  prev.sendMode === "schedule"
                    ? computeScheduledAtUtc(prev.scheduleDate, scheduleTime)
                    : prev.scheduledAtUtc,
              }));
            }}
            pastError={pastError}
          />

          <ReachPreviewPanel
            audience={values.audience}
            selection={values.selection}
            content={{
              titleDe: values.titleDe,
              bodyDe: values.bodyDe,
              titleEn: values.titleEn,
              bodyEn: values.bodyEn,
              imagePreviewUrl: values.imagePreviewUrl,
            }}
          />
        </div>
      </div>

      {values.audience && (
        <ScheduleConfirmDialog
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={handleConfirm}
          isSubmitting={save.isPending}
          sendMode={values.sendMode === "schedule" ? "schedule" : "now"}
          scheduledAtUtc={values.scheduledAtUtc}
          audience={values.audience}
          selection={values.selection}
        />
      )}
    </div>
  );
}
