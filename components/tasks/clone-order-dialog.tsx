"use client";

import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { MonthDatePicker } from "@/components/tasks/month-date-picker";
import { LocationPicker } from "@/components/properties/location-picker";
import { WalkInCityField } from "@/components/walk-in/walk-in-city-field";
import { usePropertyById } from "@/hooks/use-properties";
import { useCloneTaskGroup } from "@/hooks/use-tasks";
import { useRouter } from "@/i18n/navigation";
import { newIdempotencyKey } from "@/lib/http/idempotency";
import {
  buildCloneOrder,
  classifyCloneError,
  cloneDraftFrom,
  copiedDeadlineFallsBack,
  type CloneDraft,
  type CloneErrorKey,
} from "@/lib/tasks/clone-order";
import type { TaskGroupDto } from "@/lib/types/task.types";

/** `"09:00:00"` → `"09:00"`. The wire carries seconds; nobody needs to read them. */
function hhmm(time: string | null | undefined): string | null {
  return time ? time.slice(0, 5) : null;
}

/**
 * "Copy as new order" — repeat `source` on new dates through
 * `POST /api/tasks/admin/groups/{id}/clone` (F-07 ·10, `task-lifecycle.md` §0i).
 *
 * The server copies almost everything, so this dialog asks for almost nothing:
 * the dates, the two times (pre-filled, sent only if changed), and — only when
 * the source lacks them — the three answers every new job must carry since
 * F-07 ·7. A read-only summary on top says what is being copied, because
 * ⚠ **the copy cannot be edited from the admin panel afterwards**: there is no
 * admin edit route, so this is the last moment anything can be put right.
 *
 * ⚠ **Mount it per open** (`{open && <CloneOrderDialog …/>}`), never keep one
 * instance across sources: the idempotency key lives in a ref, and a key reused
 * for a *different* source replays the first source's clone.
 *
 * `isWalkIn` comes from `isWalkInSource`; the caller hides the door while that is
 * unknown. A walk-in order additionally offers its city (required if it has none
 * — filed before 2026-09-23) and a different address.
 */
export function CloneOrderDialog({
  open,
  onClose,
  source,
  isWalkIn,
}: {
  open: boolean;
  onClose: () => void;
  source: TaskGroupDto;
  isWalkIn: boolean;
}) {
  const t = useTranslations("tasks.clone");
  const tCommon = useTranslations("common");
  const tFields = useTranslations("orderFields");
  const tOnboarding = useTranslations("onboarding");
  const router = useRouter();

  const [draft, setDraft] = useState<CloneDraft>(() => cloneDraftFrom(source));
  const [localError, setLocalError] = useState<CloneErrorKey | null>(null);

  /**
   * One key per clone intent, held across retries — the route is `[Idempotent]`
   * and caches only a 2xx, so a retry after a refusal may keep it. Cleared only
   * on success.
   */
  const key = useRef<string | null>(null);
  const clone = useCloneTaskGroup();

  function set<K extends keyof CloneDraft>(field: K) {
    return (value: CloneDraft[K]) => setDraft((d) => ({ ...d, [field]: value }));
  }

  // Which answers the source is missing — the server's `IsNullOrWhiteSpace` and
  // `bool?` rule (§0i·4). Only these are asked; sending any other is
  // `clone_field_already_set`.
  const needsTitle = !(source.title ?? "").trim();
  const needsInstructions = !(source.instructions ?? "").trim();
  const needsTools = source.ownerProvidesTools == null;
  const hasGaps = needsTitle || needsInstructions || needsTools;
  const sourceHasDeadline = source.defaultDeadline != null;
  const needsCity = isWalkIn && !source.cityId;

  function handleSubmit() {
    setLocalError(null);
    const result = buildCloneOrder(draft, source, isWalkIn);
    if (!result.ok) {
      setLocalError(result.error);
      return;
    }
    key.current ??= newIdempotencyKey();
    clone.mutate(
      { sourceId: source.id, body: result.body, idempotencyKey: key.current },
      {
        onSuccess: (group) => {
          // Only now is the intent finished, so only now may the key change.
          key.current = null;
          toast.success(t("created"));
          onClose();
          router.push(`/dashboard/tasks/${group.id}`);
        },
        onError: (error) => {
          // The one refusal the client cannot foresee: `TaskGroupDto` carries no
          // coordinates, so an order that never had any shows up only here. Open
          // the address change so the error arrives with the field that fixes it.
          const kind = classifyCloneError(error);
          if (isWalkIn && kind.kind === "clone" && kind.key === "locationRequired") {
            set("moveAddress")(true);
          }
        },
      },
    );
  }

  const serverError = clone.isError
    ? (() => {
        const kind = classifyCloneError(clone.error);
        switch (kind.kind) {
          case "clone":
            return t(`errors.${kind.key}`);
          case "catalog":
            return tOnboarding(`apiErrors.${kind.labelKey}` as Parameters<typeof tOnboarding>[0]);
          case "validation":
            return kind.message;
          case "permission":
            return tOnboarding("permissionDenied");
          case "unknown":
            return t("errors.generic");
        }
      })()
    : null;

  const disabled = clone.isPending;
  const dateCount = new Set(draft.dates).size;
  const fallsBack = copiedDeadlineFallsBack(draft, source);
  // `TaskGroupDto` carries only `propertyId`, and a day's `propertyName` can be
  // null (a cancelled source's days) — read the property itself.
  const property = usePropertyById(source.propertyId);
  const propertyName = property.data?.name ?? source.tasks[0]?.propertyName;
  const start = hhmm(source.defaultStartTime) ?? "–";
  const deadline = hhmm(source.defaultDeadline);
  const sourceTime = deadline ? `${start}–${deadline}` : `${start} · ${t("noDeadline")}`;

  function close() {
    if (disabled) return;
    clone.reset();
    onClose();
  }

  const toolsLabelId = "co-tools-label";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      {/* The owner order dialog's width: the same month grid asks for the same room. */}
      <DialogContent className="sm:max-w-[682px]">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto pr-1">
          {/* What is being copied — read-only, so the admin confirms the right job. */}
          <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-muted/40 px-4 py-3">
            <span className="overline-label text-muted-foreground">{t("sourceHeading")}</span>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-muted-foreground">{t("sourceJob")}</dt>
              <dd className="truncate">{source.title?.trim() || t("untitled")}</dd>
              <dt className="text-muted-foreground">{t("sourceProperty")}</dt>
              <dd className="truncate">{propertyName || "–"}</dd>
              <dt className="text-muted-foreground">{t("sourceTime")}</dt>
              <dd className="font-mono tabular-nums">{sourceTime}</dd>
            </dl>
            <p className="text-xs text-muted-foreground">
              {t("copied")}
              {isWalkIn ? ` ${t("copiedWalkIn")}` : null}
            </p>
            <p className="text-xs text-muted-foreground">{t("notCopied")}</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>{t("dates")}</Label>
            <MonthDatePicker
              value={draft.dates}
              onChange={(v) => set("dates")(v)}
              disabled={disabled}
            />
            <p className="text-xs text-muted-foreground">{t("datesHint")}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="co-time">{t("startTime")}</Label>
              <Input
                id="co-time"
                type="time"
                value={draft.startTime}
                onChange={(e) => set("startTime")(e.target.value)}
                disabled={disabled}
              />
              <p className="text-xs text-muted-foreground">{t("startTimeHint")}</p>
            </div>

            {/*
              ⚠ A source deadline gets an input and no switch: `null` means "copy"
              on this route, so it can be moved but never removed — an off switch
              would promise something the request cannot say.
            */}
            {sourceHasDeadline ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="co-deadline">{t("deadline")}</Label>
                <Input
                  id="co-deadline"
                  type="time"
                  value={draft.deadline}
                  onChange={(e) => set("deadline")(e.target.value)}
                  disabled={disabled}
                />
                <p className="text-xs text-muted-foreground">{t("deadlineKept")}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2.5 sm:mt-6">
                  <Switch
                    id="co-has-deadline"
                    checked={draft.hasDeadline}
                    onCheckedChange={(v: boolean) => set("hasDeadline")(v)}
                    disabled={disabled}
                  />
                  <Label htmlFor="co-has-deadline">{t("deadlineToggle")}</Label>
                </div>
                {draft.hasDeadline ? (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="co-deadline">{t("deadline")}</Label>
                    <Input
                      id="co-deadline"
                      type="time"
                      value={draft.deadline}
                      onChange={(e) => set("deadline")(e.target.value)}
                      disabled={disabled}
                    />
                    <p className="text-xs text-muted-foreground">{t("deadlineHint")}</p>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* The server drops an untouched copied deadline the start has passed;
              said here rather than discovered on the new days. */}
          {fallsBack ? (
            <div className="rounded-lg bg-status-pending-tint p-2.5 ring-1 ring-inset ring-status-pending/25">
              <p className="text-xs leading-relaxed text-status-pending-deep text-pretty">
                {t("deadlineFallsBack")}
              </p>
            </div>
          ) : null}

          {hasGaps ? (
            <div className="flex flex-col gap-4 border-t border-border pt-4">
              <div className="flex flex-col gap-0.5">
                <span className="overline-label text-muted-foreground">{t("gapsHeading")}</span>
                <p className="text-xs text-muted-foreground">{t("gapsHint")}</p>
              </div>

              {needsTitle ? (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="co-title">{t("jobTitle")}</Label>
                  <Input
                    id="co-title"
                    value={draft.title}
                    onChange={(e) => set("title")(e.target.value)}
                    placeholder={t("jobTitlePlaceholder")}
                    disabled={disabled}
                    aria-invalid={localError === "titleRequired" || undefined}
                  />
                </div>
              ) : null}

              {needsInstructions ? (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="co-instructions">{t("instructions")}</Label>
                  <Textarea
                    id="co-instructions"
                    value={draft.instructions}
                    onChange={(e) => set("instructions")(e.target.value)}
                    placeholder={t("instructionsPlaceholder")}
                    disabled={disabled}
                    aria-invalid={localError === "instructionsRequired" || undefined}
                  />
                </div>
              ) : null}

              {/* `ChoiceGroup` directly rather than `OrderExtrasFields`: that also
                  renders the add-on note, which the clone copies and cannot take. */}
              {needsTools ? (
                <div className="flex flex-col gap-1.5">
                  <Label id={toolsLabelId}>{tFields("tools")}</Label>
                  <ChoiceGroup
                    aria-labelledby={toolsLabelId}
                    aria-invalid={localError === "toolsRequired"}
                    value={
                      draft.ownerProvidesTools === null
                        ? null
                        : draft.ownerProvidesTools
                          ? "owner"
                          : "company"
                    }
                    onValueChange={(v) => set("ownerProvidesTools")(v === "owner")}
                    options={[
                      { value: "owner", label: tFields("toolsOwner") },
                      { value: "company", label: tFields("toolsCompany") },
                    ]}
                    disabled={disabled}
                  />
                  <p className="text-xs text-muted-foreground">{tFields("toolsHint")}</p>
                </div>
              ) : null}
            </div>
          ) : null}

          {isWalkIn ? (
            <div className="flex flex-col gap-4 border-t border-border pt-4">
              {/* A walk-in order filed before 2026-09-23 has no city, and the
                  copy cannot be filed without one (`walkin_city_required`). */}
              {needsCity ? (
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs text-muted-foreground">{t("cityMissing")}</p>
                  <WalkInCityField
                    idPrefix="co"
                    countryId={draft.countryId}
                    cityId={draft.cityId}
                    onChange={(next) => setDraft((d) => ({ ...d, ...next }))}
                    disabled={disabled}
                  />
                </div>
              ) : null}

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2.5">
                  <Switch
                    id="co-move-address"
                    checked={draft.moveAddress}
                    onCheckedChange={(v: boolean) =>
                      // Off drops what was picked, so "off" really means "copy".
                      setDraft((d) =>
                        v
                          ? { ...d, moveAddress: true }
                          : {
                              ...d,
                              moveAddress: false,
                              location: null,
                              ...(needsCity ? {} : { countryId: "", cityId: "" }),
                            },
                      )
                    }
                    disabled={disabled}
                  />
                  <Label htmlFor="co-move-address">{t("moveAddress")}</Label>
                </div>
                <p className="text-xs text-muted-foreground">{t("moveAddressHint")}</p>
              </div>

              {draft.moveAddress ? (
                <>
                  {needsCity ? null : (
                    <div className="flex flex-col gap-1.5">
                      <WalkInCityField
                        idPrefix="co"
                        countryId={draft.countryId}
                        cityId={draft.cityId}
                        onChange={(next) => setDraft((d) => ({ ...d, ...next }))}
                        disabled={disabled}
                      />
                      <p className="text-xs text-muted-foreground">{t("cityKept")}</p>
                    </div>
                  )}
                  <LocationPicker
                    value={draft.location}
                    onChange={(lat, long) => set("location")({ lat, long })}
                    label={t("location")}
                    hint={t("locationHint")}
                  />
                  {draft.location ? (
                    <p className="text-xs text-muted-foreground">{t("locationFinal")}</p>
                  ) : null}
                </>
              ) : null}
            </div>
          ) : null}

          <div className="rounded-lg bg-status-pending-tint p-2.5 ring-1 ring-inset ring-status-pending/25">
            <p className="text-xs leading-relaxed text-status-pending-deep text-pretty">
              {t("noEditAfter")}
            </p>
          </div>

          {localError ? (
            <p className="text-sm text-destructive">{t(`errors.${localError}`)}</p>
          ) : serverError ? (
            <p className="text-sm text-destructive">{serverError}</p>
          ) : null}
        </div>

        <DialogFooter className="items-center gap-3 sm:justify-between">
          <span className="text-xs text-muted-foreground tabular-nums">
            {t("summary", { count: dateCount })}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={close} disabled={disabled}>
              {tCommon("cancel")}
            </Button>
            <Button onClick={handleSubmit} disabled={disabled}>
              {clone.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t("submit", { count: dateCount })}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
