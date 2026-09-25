"use client";

import { useState, type ReactNode } from "react";
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
  /** Shown in bold as the description when `description` is not given. */
  workerName?: string;
  initial?: number | null;
  /** Defaults to "Rate Worker". */
  title?: string;
  /** Replaces the bold worker name — the team dialog says who it scores. */
  description?: ReactNode;
  /** Extra body between the header and the stars. */
  children?: ReactNode;
  /** The refusal, as a line under the stars. Cleared by the caller. */
  error?: string | null;
  /** Called on every pick — a caller uses it to clear a stale `error`. */
  onStarsChange?: (stars: number) => void;
}

/**
 * Star-rating picker (1–5, whole stars — the route takes fractions, this picker
 * does not offer them). Only meaningful for a Completed task worker; the team
 * dialog (`rate-team-dialog.tsx`) reuses it for every Completed worker at once.
 */
export function RateWorkerDialog({
  open,
  onClose,
  onConfirm,
  isPending,
  workerName,
  initial,
  title,
  description,
  children,
  error,
  onStarsChange,
}: Props) {
  const t = useTranslations("tasks");
  const tCommon = useTranslations("common");
  const [stars, setStars] = useState<number>(initial ?? 0);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title ?? t("actions.rateTitle")}</DialogTitle>
          <DialogDescription>
            {description ?? <strong>{workerName}</strong>}
          </DialogDescription>
        </DialogHeader>
        {children}
        <div className="flex items-center justify-center gap-1 py-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => {
                setStars(n);
                onStarsChange?.(n);
              }}
              className="p-1"
              aria-label={`${n}`}
            >
              <Star
                className={`size-7 transition-colors ${
                  n <= stars
                    ? "fill-status-pending text-status-pending"
                    : "text-muted-foreground"
                }`}
              />
            </button>
          ))}
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
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
