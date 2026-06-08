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
import { Loader2, Star } from "lucide-react";
import { useTranslations } from "next-intl";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (stars: number) => void;
  isPending: boolean;
  workerName: string;
  initial?: number | null;
}

/** Star-rating picker (1–5). Only meaningful for a Completed task worker. */
export function RateWorkerDialog({
  open,
  onClose,
  onConfirm,
  isPending,
  workerName,
  initial,
}: Props) {
  const t = useTranslations("tasks");
  const tCommon = useTranslations("common");
  const [stars, setStars] = useState<number>(initial ?? 0);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("actions.rateTitle")}</DialogTitle>
          <DialogDescription>
            <strong>{workerName}</strong>
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-center gap-1 py-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setStars(n)}
              className="p-1"
              aria-label={`${n}`}
            >
              <Star
                className={`size-7 transition-colors ${
                  n <= stars
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground"
                }`}
              />
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            {tCommon("cancel")}
          </Button>
          <Button
            onClick={() => onConfirm(stars)}
            disabled={isPending || stars < 1}
          >
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {tCommon("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
