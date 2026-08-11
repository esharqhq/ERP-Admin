"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Can } from "@/components/auth/can";
import { useRouter } from "@/i18n/navigation";
import { useSoftDeleteOwner } from "@/hooks/use-owners";
import { getApiErrorCode } from "@/lib/http/api-error";
import type { OwnerSummaryDto } from "@/lib/types/owner.types";

/**
 * Soft-delete action for an owner account. Gated on `owner:soft_delete` — a plain
 * [RequirePermission] with no Admin-collapse branch (unlike PropertyController), so
 * SUPER_ADMIN sees it and MODERATOR does not. The optional reason is recorded in the
 * OWNER_DEACTIVATED audit entry.
 */
export function OwnerActions({ owner }: { owner: OwnerSummaryDto }) {
  const t = useTranslations("owners");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const softDelete = useSoftDeleteOwner();

  /**
   * `boss_has_active_properties` used to be handled here and no longer exists —
   * F-02b·7 swapped the guard, so this had been catching a code that could
   * never arrive while the two that do arrive fell through to the generic
   * message. Its copy was worse than useless: it told the admin to reassign or
   * delete the owner's properties, which was never the blocker and would not
   * have helped.
   */
  function mapError(err: unknown): string {
    const code = getApiErrorCode(err);
    if (code === "owner_not_found") return t("delete.errors.notFound");
    if (code === "owner_has_open_tasks") return t("delete.errors.hasOpenTasks");
    if (code === "owner_is_system") return t("delete.errors.isSystem");
    return t("delete.errors.generic");
  }

  function handleClose() {
    if (softDelete.isPending) return;
    setOpen(false);
    setReason("");
    setError(null);
  }

  function handleConfirm() {
    setError(null);
    softDelete.mutate(
      { ownerUserId: owner.id, reason: reason.trim() || undefined },
      {
        onSuccess: () => {
          setOpen(false);
          router.push("/dashboard/owners");
        },
        onError: (err) => setError(mapError(err)),
      },
    );
  }

  return (
    <Can permission="owner:soft_delete">
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-destructive hover:text-destructive"
        onClick={() => {
          setReason("");
          setError(null);
          setOpen(true);
        }}
      >
        <Trash2 className="size-4" />
        {t("delete.action")}
      </Button>

      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("delete.title")}</DialogTitle>
            <DialogDescription>
              {t("delete.description", { name: owner.fullName || "—" })}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="owner-delete-reason" className="text-sm font-medium">
              {t("delete.reasonLabel")}
            </label>
            <textarea
              id="owner-delete-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("delete.reasonPlaceholder")}
              className="min-h-[72px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={softDelete.isPending}>
              {tCommon("cancel")}
            </Button>
            <Button variant="destructive" onClick={handleConfirm} disabled={softDelete.isPending}>
              {softDelete.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t("delete.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Can>
  );
}
