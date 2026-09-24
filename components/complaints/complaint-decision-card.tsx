"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DecideComplaintDialog,
  type DecisionSide,
} from "@/components/complaints/decide-complaint-dialog";
import { useHasPermission } from "@/hooks/use-current-permissions";
import { complaintState } from "@/lib/complaints/decision";
import type { TaskItemDto } from "@/lib/types/task.types";

function fmt(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

/**
 * Open → the two rulings, both OUTLINE: emphasising either would lean on the
 * decision; the dialog's confirm is the one primary. Decided → read-only record.
 * No `task_complaint:decide_any` → a note instead of buttons.
 */
export function ComplaintDecisionCard({
  task,
  onDecided,
}: {
  task: TaskItemDto;
  onDecided: () => void;
}) {
  const t = useTranslations("complaints.decision");
  const locale = useLocale();
  const canDecide = useHasPermission("task_complaint:decide_any");
  const [side, setSide] = useState<DecisionSide | null>(null);
  const complaint = task.complaint;
  const state = complaintState(complaint);
  if (!complaint || state === "none") return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        {state === "decided" ? (
          <>
            <p className="font-medium">
              {complaint.decision === "SidedWithOwner"
                ? t("decidedOwner")
                : complaint.decision === "SidedWithWorker"
                  ? t("decidedWorker")
                  : t("decidedOther")}
              {complaint.decidedAt ? ` · ${t("decidedAt", { time: fmt(complaint.decidedAt, locale) })}` : null}
            </p>
            {complaint.decisionNote ? (
              <p className="whitespace-pre-wrap text-muted-foreground">
                {t("note")}: {complaint.decisionNote}
              </p>
            ) : null}
          </>
        ) : canDecide ? (
          <>
            <p className="text-muted-foreground">{t("lead")}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setSide("SidedWithWorker")}>
                {t("forWorkers")}
              </Button>
              <Button variant="outline" onClick={() => setSide("SidedWithOwner")}>
                {t("forOwner")}
              </Button>
            </div>
          </>
        ) : (
          <p className="text-muted-foreground">{t("noPermission")}</p>
        )}
      </CardContent>

      <DecideComplaintDialog
        side={side}
        complaintId={complaint.id}
        taskId={task.id}
        groupId={task.groupId}
        onClose={() => setSide(null)}
        onDecided={() => {
          setSide(null);
          onDecided();
        }}
      />
    </Card>
  );
}
