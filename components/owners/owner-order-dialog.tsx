"use client";

import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MonthDatePicker } from "@/components/tasks/month-date-picker";
import { useCreateTaskGroup } from "@/hooks/use-tasks";
import { newIdempotencyKey } from "@/lib/http/idempotency";
import { describeApiError, isPermissionDenied } from "@/lib/onboarding/errors";
import { categoryName } from "@/lib/properties/table-rows";
import { buildOrder, type OrderDraft, type OrderErrorKey } from "@/lib/tasks/order";
import type { PropertyDto } from "@/lib/types/property.types";
import type { TaskGroupDto } from "@/lib/types/task.types";

const EMPTY: OrderDraft = {
  title: "",
  dates: [],
  startTime: "09:00",
  hasDeadline: false,
  deadline: "",
  workerLimit: "1",
  instructions: "",
};

/**
 * File one order for this owner — the work they asked for by phone.
 *
 * The walk-in page files the same request against its one fixed property; here
 * the property is chosen, and it is the *only* thing that carries the owner:
 * `POST /api/tasks/admin/groups` takes a `propertyId` and no owner id, so the
 * select is seeded from this owner's list and nothing else can be picked.
 *
 * That choice is also why this dialog, unlike the walk-in form, has to render
 * the contract-derived refusals. Against the walk-in account they are all
 * suppressed server-side; against a real owner five of them are live —
 * `403 onboarding_incomplete`, `403 contract_expired`,
 * `403 contract_not_yet_active`, `403 contract_expiring_imminently` and
 * `400 task_date_beyond_contract` (handoff `f-02b-6`, §5). The action row only
 * offers this button while the owner's cover is in force, which leaves the last
 * two genuinely reachable: cover can lapse between the read and the submit, and
 * a chosen date can sit past its end.
 */
export function OwnerOrderDialog({
  open,
  onClose,
  ownerName,
  properties,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  ownerName: string;
  /** This owner's properties, complete — `GET /api/properties?ownerUserId=` is unpaginated. */
  properties: PropertyDto[];
  onCreated: (group: TaskGroupDto) => void;
}) {
  const t = useTranslations("owners.order");
  const tCommon = useTranslations("common");
  const tOnboarding = useTranslations("onboarding");
  const locale = useLocale();

  const [draft, setDraft] = useState<OrderDraft>(EMPTY);
  const [chosen, setChosen] = useState("");
  const [localError, setLocalError] = useState<OrderErrorKey | null>(null);

  /**
   * One key per attempt, held across retries — that is what makes the route's
   * `[Idempotent]` replay work. A fresh key per request would turn a retried
   * order into two orders.
   */
  const key = useRef<string | null>(null);
  const create = useCreateTaskGroup();

  // Derived rather than seeded through an effect: the list arrives after the
  // first render, and an effect would paint one frame with no property chosen.
  const propertyId = chosen || properties[0]?.id || "";

  const propertyItems = properties.map((property) => ({
    value: property.id,
    label: `${property.name || property.address} · ${categoryName(property.category, locale)}`,
  }));

  function set<K extends keyof OrderDraft>(field: K) {
    return (value: OrderDraft[K]) =>
      setDraft((d) => ({ ...d, [field]: value }));
  }

  function handleSubmit() {
    setLocalError(null);
    const result = buildOrder(draft, propertyId);
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
          setChosen("");
          create.reset();
          onCreated(group);
        },
      },
    );
  }

  // A 403 *with* a body is the owner's contract, not the admin's access — only
  // the empty-body one is a permission problem, which is what
  // `isPermissionDenied` tests. Both are 403s and they read nothing alike.
  const serverError = !create.isError
    ? null
    : isPermissionDenied(create.error)
      ? tOnboarding("permissionDenied")
      : tOnboarding(
          `apiErrors.${describeApiError(create.error)?.labelKey ?? "unknown"}`,
        );

  const disabled = create.isPending;
  const dateCount = draft.dates.length;
  const workers = Number(draft.workerLimit);

  function close() {
    if (disabled) return;
    setLocalError(null);
    create.reset();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      {/* Same width as the property create dialog: the month grid and this form
          ask for the same room, and two dialogs on one screen that differ by
          20px read as a mistake. */}
      <DialogContent className="sm:max-w-[682px]">
        <DialogHeader>
          <DialogTitle>{t("title", { name: ownerName })}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto pr-1">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="oo-property">{t("property")}</Label>
            <Select
              value={propertyId}
              onValueChange={(v) => setChosen(v ?? "")}
              items={propertyItems}
            >
              <SelectTrigger id="oo-property" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {propertyItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{t("propertyHint")}</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="oo-title">{t("job")}</Label>
            <Input
              id="oo-title"
              value={draft.title}
              onChange={(e) => set("title")(e.target.value)}
              placeholder={t("jobPlaceholder")}
              disabled={disabled}
            />
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
              <Label htmlFor="oo-time">{t("startTime")}</Label>
              <Input
                id="oo-time"
                type="time"
                value={draft.startTime}
                onChange={(e) => set("startTime")(e.target.value)}
                disabled={disabled}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="oo-workers">{t("workers")}</Label>
              <Input
                id="oo-workers"
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
                id="oo-has-deadline"
                checked={draft.hasDeadline}
                onCheckedChange={(v: boolean) => set("hasDeadline")(v)}
                disabled={disabled}
              />
              <Label htmlFor="oo-has-deadline">{t("deadlineToggle")}</Label>
            </div>
            {draft.hasDeadline ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="oo-deadline">{t("deadline")}</Label>
                <Input
                  id="oo-deadline"
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
            <Label htmlFor="oo-instructions">{t("instructions")}</Label>
            <textarea
              id="oo-instructions"
              value={draft.instructions}
              onChange={(e) => set("instructions")(e.target.value)}
              placeholder={t("instructionsPlaceholder")}
              disabled={disabled}
              className="min-h-[80px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            />
          </div>

          {/* What this order deliberately does not constrain. The body sends no
              profession filter, no rating floor and no new-worker bar, so every
              eligible worker can take it — stated here rather than left for the
              admin to infer from three absent fields. */}
          <p className="text-xs text-muted-foreground">{t("defaults")}</p>

          {localError ? (
            <p className="text-sm text-destructive">
              {t(`errors.${localError}` as Parameters<typeof t>[0])}
            </p>
          ) : serverError ? (
            <p className="text-sm text-destructive">{serverError}</p>
          ) : null}
        </div>

        <DialogFooter className="items-center gap-3 sm:justify-between">
          {/* The count the admin is about to author, not a restatement of the
              form: one task per date, each holding the same worker limit. */}
          <span className="text-xs text-muted-foreground tabular-nums">
            {t("summary", {
              count: dateCount,
              workers: Number.isInteger(workers) && workers > 0 ? workers : 0,
            })}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={close} disabled={disabled}>
              {tCommon("cancel")}
            </Button>
            <Button onClick={handleSubmit} disabled={disabled}>
              {create.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t("submit", { count: dateCount })}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
