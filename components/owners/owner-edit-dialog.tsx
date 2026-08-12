"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
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
import { buildOwnerUpdateBody } from "@/lib/owners/detail-actions";
import type { NameLock, OwnerUpdateBody } from "@/lib/owners/detail-actions";

interface Props {
  open: boolean;
  onClose: () => void;
  identity: { firstName: string | null; lastName: string | null };
  /** Non-null means the fields are read-only, and says why. */
  nameLock: NameLock;
  pending: boolean;
  /** Localized parent-mutation error. */
  error?: string | null;
  onSubmit: (body: OwnerUpdateBody) => void;
}

/**
 * Corrects the owner's **legal** name — the passport pair, not the display
 * name they chose at registration. The two are deliberately never reconciled.
 *
 * It opens even when the fields are locked. At `Kyc`/`Rejected` the owner can
 * still fix their own name, so the admin route answers `409`; an admin who
 * simply finds no Edit button has no way to learn that, and the dialog is
 * where the answer lives.
 *
 * **Mount this only while open.** Its state is seeded from `identity` on first
 * render and never resynchronised, so a parent that keeps it mounted would show
 * a cancelled attempt's text on the next open.
 */
export function OwnerEditDialog({
  open,
  onClose,
  identity,
  nameLock,
  pending,
  error,
  onSubmit,
}: Props) {
  const t = useTranslations("owners");
  const tCommon = useTranslations("common");

  // Seeded once. The parent mounts this only while open — the same contract
  // PropertyEditDialog has — so a cancelled attempt's text cannot survive into
  // the next open, and no reset effect is needed to make that true.
  const [firstName, setFirstName] = useState(identity.firstName ?? "");
  const [lastName, setLastName] = useState(identity.lastName ?? "");
  const [reason, setReason] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const locked = nameLock !== null;

  function handleSubmit() {
    setLocalError(null);
    const body = buildOwnerUpdateBody({ firstName, lastName, reason });
    if (!body) {
      // The builder refuses exactly two things — say which one happened.
      setLocalError(
        reason.trim() ? t("edit.nothingToSave") : t("edit.reasonRequired"),
      );
      return;
    }
    onSubmit(body);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !pending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("edit.title")}</DialogTitle>
          <DialogDescription>{t("edit.description")}</DialogDescription>
        </DialogHeader>

        {locked ? (
          <p className="rounded-lg border border-border bg-muted/40 px-3.5 py-2.5 text-sm text-muted-foreground">
            {nameLock === "self-editable"
              ? t("edit.locks.selfEditable")
              : t("edit.locks.noProfile")}
          </p>
        ) : null}

        <div className="grid gap-3.5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="owner-first-name">{t("edit.firstName")}</Label>
            <Input
              id="owner-first-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={locked || pending}
              readOnly={locked}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="owner-last-name">{t("edit.lastName")}</Label>
            <Input
              id="owner-last-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={locked || pending}
              readOnly={locked}
            />
          </div>
        </div>

        {/* No reason field when nothing can be saved — it would be the only
            writable control on a form whose Save is disabled. */}
        {!locked ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="owner-edit-reason">{t("edit.reasonLabel")}</Label>
            <textarea
              id="owner-edit-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("edit.reasonPlaceholder")}
              disabled={pending}
              className="min-h-[72px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        ) : null}

        {localError || error ? (
          <p className="text-sm text-destructive">{localError ?? error}</p>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            {tCommon("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={locked || pending}>
            {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t("edit.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
