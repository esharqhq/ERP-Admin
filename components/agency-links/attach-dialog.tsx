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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useActiveAgencies } from "@/hooks/use-agencies";
import { useAttachLink } from "@/hooks/use-agency-links";
import { linkErrorKey } from "@/lib/agencies/link-errors";

const MAX_REASON = 2000;

/**
 * Attaching an agency to a worker — `POST /api/admin/agency-links`.
 *
 * ⚠ **`reason` is required, and the worker reads it.** They are emailed, and
 * they must confirm before this is a badge anywhere; the sentence an admin types
 * here is what they decide on.
 *
 * ⚠ **A whitespace-only reason returns problem-details on this door**, not
 * `reason_required` — `[Required]` trims it away before the service is reached.
 * Submit stays disabled while the box is blank, so that difference is never met.
 *
 * ⚠ **Only in-force agencies are offered**, because that is all
 * `GET /api/agencies/active` returns — which is what makes
 * `agency_not_in_force` a rare race rather than a routine refusal. A partner
 * whose contract has lapsed keeps its existing links and simply leaves this
 * list: *"is this agency still our partner"* and *"did this worker come through
 * them"* are independent questions, and only the first one expires.
 */
export function AttachDialog({
  open,
  onClose,
  workerId,
}: {
  open: boolean;
  onClose: () => void;
  workerId: string;
}) {
  const t = useTranslations("agencyLinks.attach");
  const tErrors = useTranslations("agencyLinks.errors");
  const tCommon = useTranslations("common");

  const [agencyId, setAgencyId] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: agencies = [] } = useActiveAgencies();
  const attach = useAttachLink();

  /*
    ⚠ `items` is not optional. Base UI's `Select.Value` renders the selected
    *value* unless the root is told how values map to labels — omitting it is
    what printed raw GUIDs in the phase-2 form. The trigger and the item list
    read the same array so the two cannot drift.
  */
  const items = agencies.map((a) => ({
    value: a.id,
    label: a.city ? `${a.legalName} · ${a.city}` : a.legalName,
  }));

  const trimmed = reason.trim();

  function close() {
    setAgencyId("");
    setReason("");
    setError(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("notifyHint")}</DialogDescription>
        </DialogHeader>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-foreground/80">
            {t("agency")}
            <span aria-hidden className="text-destructive">
              {" *"}
            </span>
          </span>
          <Select
            items={items}
            value={agencyId}
            onValueChange={(v) => setAgencyId(v ?? "")}
          >
            {/* ⚠ `w-full`: `SelectTrigger` defaults to `w-fit`, which with an
                empty value collapses the control to its chevron. */}
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("agencyPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {items.map((i) => (
                <SelectItem key={i.value} value={i.value}>
                  {i.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* No in-force partner means no new link can be made at all — worth
              saying, since an empty select otherwise reads as a broken input. */}
          {items.length === 0 ? (
            <span className="text-[11px] text-muted-foreground">
              {t("noAgencies")}
            </span>
          ) : null}
        </label>

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

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={attach.isPending}>
            {tCommon("cancel")}
          </Button>
          <Button
            onClick={() => {
              setError(null);
              attach.mutate(
                { workerId, agencyId, reason: trimmed },
                {
                  onSuccess: close,
                  onError: (err) => {
                    const { key, detail } = linkErrorKey(err);
                    setError(key === "generic" && detail ? detail : tErrors(key));
                  },
                },
              );
            }}
            disabled={attach.isPending || !agencyId || trimmed.length === 0}
          >
            {attach.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
