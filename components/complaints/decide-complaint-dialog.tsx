"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDecideComplaint, useRefetchComplaint } from "@/hooks/use-complaints";
import { DECIDE_REFETCH, decideErrorKind } from "@/lib/complaints/decision";
import { getValidationMessage } from "@/lib/http/api-error";

const NOTE_MAX = 2000;

export type DecisionSide = "SidedWithOwner" | "SidedWithWorker";

/**
 * Confirm one ruling. The consequences are listed for the chosen side — for the
 * owner that includes the warning that the free day may never fill
 * (`task-lifecycle.md` §0e) — and both sides say no worker loses credit.
 * Irreversible, and it says so.
 */
export function DecideComplaintDialog({
  side,
  complaintId,
  taskId,
  groupId,
  onClose,
  onDecided,
}: {
  side: DecisionSide | null;
  complaintId: string;
  taskId: string;
  groupId: string;
  onClose: () => void;
  onDecided: () => void;
}) {
  const t = useTranslations("complaints.dialog");
  const tErr = useTranslations("complaints.errors");
  const tCommon = useTranslations("common");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const decide = useDecideComplaint(taskId, groupId);
  const refetch = useRefetchComplaint(taskId);

  function close() {
    if (decide.isPending) return;
    setNote("");
    setError(null);
    decide.reset();
    onClose();
  }

  function submit() {
    if (!side) return;
    setError(null);
    const trimmed = note.trim();
    decide.mutate(
      { complaintId, body: { decision: side, ...(trimmed ? { note: trimmed } : {}) } },
      {
        onSuccess: () => {
          toast.success(t("success"));
          setNote("");
          onDecided();
        },
        onError: (err) => {
          const kind = decideErrorKind(err);
          if (DECIDE_REFETCH.has(kind)) {
            toast.error(tErr(kind));
            refetch();
            close();
            return;
          }
          setError(kind === "invalid" ? (getValidationMessage(err) ?? tErr("invalid")) : tErr(kind));
        },
      },
    );
  }

  const owner = side === "SidedWithOwner";

  return (
    <Dialog open={side !== null} onOpenChange={(v) => !v && close()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{owner ? t("titleOwner") : t("titleWorker")}</DialogTitle>
          <DialogDescription>{t("final")}</DialogDescription>
        </DialogHeader>

        <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
          {owner ? (
            <>
              <li>{t("ownerPoint1")}</li>
              <li>{t("ownerPoint2")}</li>
              <li className="text-status-pending-deep">{t("ownerPoint3")}</li>
            </>
          ) : (
            <>
              <li>{t("workerPoint1")}</li>
              <li>{t("workerPoint2")}</li>
            </>
          )}
          <li className="font-medium">{t("credit")}</li>
        </ul>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="decide-note">{t("note")}</Label>
          <Textarea
            id="decide-note"
            value={note}
            maxLength={NOTE_MAX}
            onChange={(e) => setNote(e.target.value)}
            disabled={decide.isPending}
          />
          <p className="text-xs text-muted-foreground">{t("noteHint")}</p>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={decide.isPending}>
            {tCommon("cancel")}
          </Button>
          <Button onClick={submit} disabled={decide.isPending}>
            {decide.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
