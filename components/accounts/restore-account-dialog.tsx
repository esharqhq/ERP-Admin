"use client";

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
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
import { restoreErrorKey } from "@/lib/accounts/restore-errors";

const MAX_REASON = 2000;

/**
 * Bring a deleted worker or owner back — the shared half of
 * `POST /api/admin/workers/{id}/restore` and `POST /api/owners/{id}/restore`.
 * One body (`{reason}`), one refusal set, one piece of copy; only the route and
 * the labels differ, and two copies of this would drift on the one thing that
 * matters — which of the two 409s the admin is being told about.
 *
 * ⚠⚠ **A restore is conditional, not a button that always works.** The deleted
 * person's email *and* phone were released for re-registration, so somebody may
 * already hold either. The two clashes are separate codes and get separate
 * messages: the phone can clash independently of the email.
 *
 * ⚠ **Two things this dialog must not imply**, both stated in the copy:
 * chat groups the person owned do **not** come back (the delete handed them to a
 * successor irreversibly), and **re-registering is not a restore** — that is a
 * brand-new row with no history, and it is the only thing a person can do for
 * themselves.
 */
export function RestoreAccountDialog({
  open,
  onClose,
  name,
  isPending,
  onConfirm,
  error,
}: {
  open: boolean;
  onClose: () => void;
  name: string;
  isPending: boolean;
  onConfirm: (reason: string) => void;
  error: unknown;
}) {
  const t = useTranslations("accounts.restore");
  const tCommon = useTranslations("common");
  const [reason, setReason] = useState("");

  const mapped = error ? restoreErrorKey(error) : null;
  const message = !mapped
    ? null
    : mapped.key === "generic" && mapped.detail
      ? mapped.detail
      : t(`errors.${mapped.key}`);

  const trimmed = reason.trim();

  function close() {
    setReason("");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("title", { name })}</DialogTitle>
          <DialogDescription>{t("sameRow")}</DialogDescription>
        </DialogHeader>

        <div className="flex gap-2.5 rounded-md border border-border bg-muted/40 p-3">
          <AlertTriangle
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <div className="flex flex-col gap-1 text-[13px] leading-snug text-muted-foreground">
            <span>{t("chatGroupsGone")}</span>
            <span>{t("notReRegistration")}</span>
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-foreground/80">
            {t("reasonLabel")}
            <span aria-hidden className="text-destructive">
              {" *"}
            </span>
          </span>
          <Textarea
            value={reason}
            maxLength={MAX_REASON}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-24 text-sm"
          />
          <span className="text-[11px] text-muted-foreground">
            {t("reasonHint")}
          </span>
        </label>

        {message ? <p className="text-sm text-destructive">{message}</p> : null}

        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={isPending}>
            {tCommon("cancel")}
          </Button>
          <Button
            onClick={() => onConfirm(trimmed)}
            disabled={isPending || trimmed.length === 0}
          >
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
