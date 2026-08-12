// components/walk-in/walk-in-order-form.tsx
"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AssignWorkerDialog } from "@/components/tasks/assign-worker-dialog";
import { MonthDatePicker } from "@/components/tasks/month-date-picker";
import { useAssignWorker, useCreateTaskGroup } from "@/hooks/use-tasks";
import { useHasPermission } from "@/hooks/use-current-permissions";
import { getApiErrorCode } from "@/lib/http/api-error";
import { newIdempotencyKey } from "@/lib/http/idempotency";
import {
  buildWalkInOrder,
  type WalkInOrderDraft,
  type WalkInOrderErrorKey,
} from "@/lib/tasks/walk-in-order";
import type { TaskGroupDto, TaskItemDto } from "@/lib/types/task.types";

const EMPTY: WalkInOrderDraft = {
  title: "",
  date: "",
  startTime: "09:00",
  workerLimit: "1",
  instructions: "",
};

/**
 * File one order under the walk-in property, then staff it without leaving.
 *
 * `propertyId` is a prop rather than a field: exactly one walk-in property
 * exists, the page above resolves it, and the page does not render this form at
 * all when it is missing. Sending any other property would make five
 * contract-derived refusals reachable that this form deliberately cannot render.
 */
export function WalkInOrderForm({ propertyId }: { propertyId: string }) {
  const t = useTranslations("walkIn");
  const canCreate = useHasPermission("task_group:create_any");

  const [draft, setDraft] = useState<WalkInOrderDraft>(EMPTY);
  const [localError, setLocalError] = useState<WalkInOrderErrorKey | null>(null);
  const [created, setCreated] = useState<TaskGroupDto | null>(null);

  /**
   * One key per attempt, held across retries — that is what makes the route's
   * `[Idempotent]` replay work. A fresh key per request would turn a retried
   * order into two orders.
   */
  const key = useRef<string | null>(null);
  const create = useCreateTaskGroup();

  function set<K extends keyof WalkInOrderDraft>(field: K) {
    return (value: string) => setDraft((d) => ({ ...d, [field]: value }));
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
          setCreated(group);
          // Only now is the intent finished, so only now may the key change.
          key.current = null;
        },
      },
    );
  }

  function fileAnother() {
    setCreated(null);
    setDraft(EMPTY);
    setLocalError(null);
    create.reset();
  }

  const serverError = create.isError
    ? getApiErrorCode(create.error) === "property_not_found"
      ? t("errors.propertyGone")
      : t("errors.generic")
    : null;

  if (created) {
    return <CreatedPanel group={created} onAnother={fileAnother} />;
  }

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
          <Label>{t("form.date")}</Label>
          <MonthDatePicker
            value={draft.date ? [draft.date] : []}
            onChange={(v) => set("date")(v[0] ?? "")}
            disabled={disabled}
          />
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
        </div>

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

/**
 * The `201` already carries `tasks[]`, one per date, each with its id — so
 * staffing needs no re-fetch. `propertyName` on those tasks is `""` and
 * `isEnrolled` is `true` on this route; neither is rendered.
 */
function CreatedPanel({
  group,
  onAnother,
}: {
  group: TaskGroupDto;
  onAnother: () => void;
}) {
  const t = useTranslations("walkIn");

  return (
    <Card>
      <CardHeader className="pb-3">
        <h2 className="flex items-center gap-2 font-heading text-base font-semibold tracking-tight">
          <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
          {t("created.title")}
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{t("created.body")}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-2.5">
        {group.tasks.map((task) => (
          <TaskStaffingRow key={task.id} task={task} groupId={group.id} />
        ))}
        <Button variant="outline" onClick={onAnother} className="mt-1 self-start">
          {t("created.another")}
        </Button>
      </CardContent>
    </Card>
  );
}

function TaskStaffingRow({ task, groupId }: { task: TaskItemDto; groupId: string }) {
  const t = useTranslations("walkIn");
  const [open, setOpen] = useState(false);
  const assign = useAssignWorker(groupId);
  const assigned = task.workers.length > 0 || assign.isSuccess;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-2.5">
      <span className="text-[13px] tabular-nums">{task.scheduledDate}</span>
      {assigned ? (
        <span className="text-[13px] text-muted-foreground">{t("created.assigned")}</span>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          {t("created.assign")}
        </Button>
      )}

      {/* Mounted only while open — the picker seeds its search on first render. */}
      {open ? (
        <AssignWorkerDialog
          open={open}
          onClose={() => !assign.isPending && setOpen(false)}
          isPending={assign.isPending}
          error={assign.isError ? t("errors.generic") : null}
          onAssign={(workerId) =>
            assign.mutate(
              { taskId: task.id, workerId },
              { onSuccess: () => setOpen(false) },
            )
          }
        />
      ) : null}
    </div>
  );
}
