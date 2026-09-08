// components/walk-in/walk-in-order-form.tsx
"use client";

import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MonthDatePicker } from "@/components/tasks/month-date-picker";
import { LocationPicker } from "@/components/properties/location-picker";
import { useCreateTaskGroup } from "@/hooks/use-tasks";
import { useHasPermission } from "@/hooks/use-current-permissions";
import { getApiErrorCode, getValidationMessage } from "@/lib/http/api-error";
import { newIdempotencyKey } from "@/lib/http/idempotency";
import {
  buildWalkInOrder,
  type WalkInOrderDraft,
  type WalkInOrderErrorKey,
} from "@/lib/tasks/walk-in-order";
import type { TaskGroupDto } from "@/lib/types/task.types";

const EMPTY: WalkInOrderDraft = {
  title: "",
  customer: "",
  dates: [],
  startTime: "09:00",
  hasDeadline: false,
  deadline: "",
  workerLimit: "1",
  instructions: "",
  location: null,
};

/**
 * File one order under the walk-in property.
 *
 * `propertyId` is a prop rather than a field: exactly one walk-in property is
 * used for filing, the page above resolves it, and the page does not render this
 * form at all when it is missing. Sending any other property would make five
 * contract-derived refusals reachable that this form deliberately cannot render.
 *
 * There is no success panel. On `201` the page switches to the Orders tab and
 * opens that group's sheet, which shows the same per-date jobs and offers the
 * same staffing action — in the surface the admin will use again tomorrow.
 */
export function WalkInOrderForm({
  propertyId,
  onCreated,
}: {
  propertyId: string;
  onCreated: (group: TaskGroupDto) => void;
}) {
  const t = useTranslations("walkIn");
  const canCreate = useHasPermission("task_group:create_any");

  const [draft, setDraft] = useState<WalkInOrderDraft>(EMPTY);
  const [localError, setLocalError] = useState<WalkInOrderErrorKey | null>(null);

  /**
   * One key per attempt, held across retries — that is what makes the route's
   * `[Idempotent]` replay work. A fresh key per request would turn a retried
   * order into two orders.
   */
  const key = useRef<string | null>(null);
  const create = useCreateTaskGroup();

  function set<K extends keyof WalkInOrderDraft>(field: K) {
    return (value: WalkInOrderDraft[K]) =>
      setDraft((d) => ({ ...d, [field]: value }));
  }

  function handleSubmit() {
    setLocalError(null);
    const result = buildWalkInOrder(draft, propertyId);
    if (!result.ok) {
      setLocalError(result.error);
      return;
    }
    key.current ??= newIdempotencyKey();
    create.mutate(
      { body: result.body, idempotencyKey: key.current },
      {
        onSuccess: (group) => {
          // Only now is the intent finished, so only now may the key change.
          key.current = null;
          setDraft(EMPTY);
          create.reset();
          onCreated(group);
        },
      },
    );
  }

  /**
   * Three envelopes, in order of specificity.
   *
   * `walkin_location_required` should be unreachable — `buildWalkInOrder` refuses
   * before the request — but it is worded rather than folded into the generic
   * failure, because it is the one refusal that says *which* field is at fault and
   * this form shipped for three weeks unable to file an order at all without it.
   *
   * An out-of-range coordinate is a `400` in **problem-details** shape
   * (`f-06-c-checkin-proof.md` §5.2), which carries no `error` field at all — so
   * `getApiErrorCode` returns `null` for it and the generic message would swallow
   * the server's own field-specific wording.
   */
  const serverError = create.isError
    ? (() => {
        const code = getApiErrorCode(create.error);
        if (code === "property_not_found") return t("errors.propertyGone");
        if (code === "walkin_location_required") return t("errors.locationRequired");
        return getValidationMessage(create.error) ?? t("errors.generic");
      })()
    : null;

  const disabled = !canCreate || create.isPending;

  return (
    <Card>
      <CardHeader className="pb-3">
        <h2 className="font-heading text-base font-semibold tracking-tight">
          {t("form.submit")}
        </h2>
        {!canCreate ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{t("noPermission")}</p>
        ) : null}
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wi-title">{t("form.title")}</Label>
            <Input
              id="wi-title"
              value={draft.title}
              onChange={(e) => set("title")(e.target.value)}
              placeholder={t("form.titlePlaceholder")}
              disabled={disabled}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wi-customer">{t("form.customer")}</Label>
            <Input
              id="wi-customer"
              value={draft.customer}
              onChange={(e) => set("customer")(e.target.value)}
              placeholder={t("form.customerPlaceholder")}
              disabled={disabled}
            />
            <p className="text-xs text-muted-foreground">{t("form.customerHint")}</p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>{t("form.dates")}</Label>
          <MonthDatePicker
            value={draft.dates}
            onChange={(v) => set("dates")(v)}
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">{t("form.datesHint")}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wi-time">{t("form.startTime")}</Label>
            <Input
              id="wi-time"
              type="time"
              value={draft.startTime}
              onChange={(e) => set("startTime")(e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wi-workers">{t("form.workers")}</Label>
            <Input
              id="wi-workers"
              type="number"
              min={1}
              step={1}
              value={draft.workerLimit}
              onChange={(e) => set("workerLimit")(e.target.value)}
              disabled={disabled}
            />
          </div>
        </div>

        {/* A TimeOnly end-of-day cutoff, so `type="time"` — not a date. */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2.5">
            <Switch
              id="wi-has-deadline"
              checked={draft.hasDeadline}
              onCheckedChange={(v: boolean) => set("hasDeadline")(v)}
              disabled={disabled}
            />
            <Label htmlFor="wi-has-deadline">{t("form.deadlineToggle")}</Label>
          </div>
          {draft.hasDeadline ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wi-deadline">{t("form.deadline")}</Label>
              <Input
                id="wi-deadline"
                type="time"
                value={draft.deadline}
                onChange={(e) => set("deadline")(e.target.value)}
                disabled={disabled}
                className="sm:max-w-[200px]"
              />
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="wi-instructions">{t("form.instructions")}</Label>
          <textarea
            id="wi-instructions"
            value={draft.instructions}
            onChange={(e) => set("instructions")(e.target.value)}
            placeholder={t("form.instructionsPlaceholder")}
            disabled={disabled}
            className="min-h-[80px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
          <p className="text-xs text-muted-foreground">{t("form.instructionsHint")}</p>
        </div>

        {/*
          Directly under the instructions, where the street was just typed — the
          same "type it, then point at it" order the property dialogs use.

          This is not optional data: `POST /api/tasks/admin/groups` has refused a
          walk-in order without `lat`/`long` since 2026-08-26 (F-06c), and the
          point becomes the geofence target every worker's check-in is measured
          against. A map rather than two number inputs is the guide's explicit
          instruction (§4): a coordinate that is merely *wrong* rather than out of
          range is accepted here and then refuses every check-in at the job with
          `outside_geofence`.
        */}
        <LocationPicker
          value={draft.location}
          onChange={(lat, long) => set("location")({ lat, long })}
          label={t("form.location")}
          hint={t("form.locationHint")}
        />

        {/*
          The order carries no read-back and no edit path (§4.2): `TaskGroupDto`
          does not return the coordinates and `PUT /api/tasks/groups/{id}` cannot
          change them, so a wrong address can only be cancelled and re-filed. The
          warning belongs next to Submit because that is the last moment it can be
          acted on.
        */}
        {draft.location ? (
          <p className="text-xs text-muted-foreground">{t("form.locationFinal")}</p>
        ) : null}

        {localError ? (
          <p className="text-sm text-destructive">
            {t(`errors.${localError}` as Parameters<typeof t>[0])}
          </p>
        ) : serverError ? (
          <p className="text-sm text-destructive">{serverError}</p>
        ) : null}

        <Button onClick={handleSubmit} disabled={disabled} className="self-start">
          {create.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
          {t("form.submit")}
        </Button>
      </CardContent>
    </Card>
  );
}
