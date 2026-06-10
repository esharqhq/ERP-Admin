"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { TASK_WORKER_OUTCOMES } from "@/lib/types/task.types";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (outcome: string) => void;
  isPending: boolean;
  workerName: string;
  current: string;
}

/** Override a TaskWorker outcome (admin dispute correction). */
export function OutcomeDialog({
  open,
  onClose,
  onConfirm,
  isPending,
  workerName,
  current,
}: Props) {
  const t = useTranslations("tasks");
  const tCommon = useTranslations("common");
  const [outcome, setOutcome] = useState<string>(current || "Pending");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("actions.outcomeTitle")}</DialogTitle>
          <DialogDescription>
            <strong>{workerName}</strong>
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2 py-1">
          {TASK_WORKER_OUTCOMES.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => setOutcome(o)}
              className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                outcome === o
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-border text-muted-foreground hover:bg-accent"
              }`}
            >
              {o}
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            {tCommon("cancel")}
          </Button>
          <Button onClick={() => onConfirm(outcome)} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {tCommon("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
