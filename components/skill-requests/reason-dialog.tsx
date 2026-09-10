"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

/**
 * The text-then-verb dialog behind request-info, reject and revoke. All three are
 * the same shape — a required piece of text, then one button — so they share it.
 *
 * ⚠ **Every one of these three texts is shown to the worker.** There is no
 * internal-only field anywhere in this feature, so each caller's description says so
 * in words rather than leaving an admin to write a private remark into a public box.
 *
 * ⚠ **The dialog stays open on failure**, which is what makes
 * `skill_in_use_by_live_work` retryable: that refusal is temporary — it clears once
 * the blocking work reaches `Done` or `Cancelled` — so it renders as a message
 * beside a live button, never as a dismissal. The caller closes the dialog only in
 * the mutation's `onSuccess`.
 *
 * ⚠ **Mount this only while open.** One box serves three verbs, and the draft text
 * lives in local state — a dialog kept mounted while closed would hand an abandoned
 * rejection reason to whoever next opens "Ask for more information". Mounting on
 * demand resets it for free; resetting it in an effect instead is what
 * `react-hooks/set-state-in-effect` refuses, and rightly. Same idiom as
 * `IntakeDialog` on the agency queue.
 *
 * A sibling of `VerbDialog` in `components/agency-requests/review-actions.tsx`; the
 * two are deliberately per-screen, as that file's own catalogue of verbs is.
 */
export function ReasonDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  destructive,
  pending,
  error,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  pending: boolean;
  /** Already translated by the caller, or `null`. */
  error?: string | null;
  onConfirm: (text: string) => void;
}) {
  const tCommon = useTranslations("common");
  const [text, setText] = useState("");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      {/* ⚠ `sm:max-w-lg`: `DialogContent`'s own class ends `sm:max-w-sm`, so an
          unprefixed width loses above 640px. */}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          aria-label={title}
        />

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            {tCommon("cancel")}
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            // Blank text is `note_required` / `reason_required` server-side; the
            // disabled button spares the admin a round trip to learn that.
            disabled={pending || !text.trim()}
            onClick={() => onConfirm(text.trim())}
          >
            {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
