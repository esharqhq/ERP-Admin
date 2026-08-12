"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Trash2, Loader2, Pencil, MessageSquare } from "lucide-react";
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
import { OwnerEditDialog } from "@/components/owners/owner-edit-dialog";
import {
  MessageOwnerDialog,
  type MessageDraft,
} from "@/components/owners/message-owner-dialog";
import { useRouter } from "@/i18n/navigation";
import { useSoftDeleteOwner, useUpdateOwner } from "@/hooks/use-owners";
import { useCreateTicketForUser } from "@/hooks/use-support";
import { getApiErrorCode } from "@/lib/http/api-error";
import { isPermissionDenied } from "@/lib/onboarding/errors";
import type { OwnerDetailActions, OwnerUpdateBody } from "@/lib/owners/detail-actions";
import type { OwnerSummaryDto } from "@/lib/types/owner.types";

/**
 * Edit and soft-delete for an owner account.
 *
 * Both are plain [RequirePermission] routes with no Admin-collapse branch
 * (unlike PropertyController), so SUPER_ADMIN sees them and MODERATOR does not.
 * Each is gated twice over: on its permission, and on `actions`, which encodes
 * the targets the server always refuses. The permission gate alone is not
 * enough — a SUPER_ADMIN holds both codes and would still be shown two buttons
 * that answer `409 owner_is_system` on the walk-in account.
 */
export function OwnerActions({
  owner,
  actions,
  identity,
}: {
  owner: OwnerSummaryDto;
  actions: OwnerDetailActions;
  /** Legal name pair; both null when the KYC read 404'd or was refused. */
  identity: { firstName: string | null; lastName: string | null };
}) {
  const t = useTranslations("owners");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [messageOpen, setMessageOpen] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);

  const softDelete = useSoftDeleteOwner();
  const update = useUpdateOwner(owner.id);
  const createTicket = useCreateTicketForUser();

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

  /**
   * Mapped here rather than through `ErrorNotice`/`describeApiError`: the
   * shared catalog maps `owner_profile_not_found` to "subject not found",
   * which is right on the contract routes it was written for and wrong on this
   * one, where it means "this account has no identity record" about an owner
   * the admin is looking at. The guide tables these per route for exactly that
   * reason. The catalog also has no entry for `reason_required` or
   * `owner_can_self_edit`, both of which would degrade to "unknown".
   */
  function mapEditError(err: unknown): string {
    // This route's 403 carries an empty body, so there is no code to read.
    if (isPermissionDenied(err)) return t("edit.errors.forbidden");
    const code = getApiErrorCode(err);
    if (code === "reason_required") return t("edit.errors.reasonRequired");
    if (code === "owner_profile_not_found") return t("edit.errors.noProfile");
    if (code === "owner_can_self_edit") return t("edit.errors.canSelfEdit");
    if (code === "owner_is_system") return t("edit.errors.isSystem");
    if (code === "owner_not_found") return t("edit.errors.notFound");
    return t("edit.errors.generic");
  }

  function handleEditSubmit(body: OwnerUpdateBody) {
    setEditError(null);
    update.mutate(body, {
      onSuccess: () => setEditOpen(false),
      onError: (err) => setEditError(mapEditError(err)),
    });
  }

  function mapMessageError(err: unknown): string {
    if (isPermissionDenied(err)) return t("message.errors.forbidden");
    const code = getApiErrorCode(err);
    if (code === "invalid_target_type") return t("message.errors.invalidTarget");
    if (code === "target_not_found") return t("message.errors.notFound");
    if (code === "owner_is_system") return t("message.errors.isSystem");
    return t("message.errors.generic");
  }

  function handleMessageSubmit(draft: MessageDraft) {
    setMessageError(null);
    createTicket.mutate(
      // `"Owner"` rather than `"OwnerUser"`: the server runs the value through
      // UserTypeNormalizer, which maps "Owner" → "OWNER_USER" and passes
      // anything unrecognised straight through. "OwnerUser" would survive that
      // map unchanged and then fail to match.
      { ...draft, targetUserType: "Owner", targetUserId: owner.id },
      {
        onSuccess: () => setMessageOpen(false),
        onError: (err) => setMessageError(mapMessageError(err)),
      },
    );
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
    <div className="flex items-center gap-1">
      {/* Gated on the walk-in check rather than a per-action guard: the ticket
          route refuses that account with `400 owner_is_system` for the same
          reason the other three do — it cannot sign in, so nobody would read
          it. */}
      {!actions.isWalkIn ? (
        <Can permission="support_ticket:create_for_user">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setMessageError(null);
              setMessageOpen(true);
            }}
          >
            <MessageSquare className="size-4" />
            {t("message.action")}
          </Button>

          {messageOpen ? (
            <MessageOwnerDialog
              open={messageOpen}
              onClose={() => !createTicket.isPending && setMessageOpen(false)}
              pending={createTicket.isPending}
              error={messageError}
              onSubmit={handleMessageSubmit}
            />
          ) : null}
        </Can>
      ) : null}

      {actions.canEdit ? (
        <Can permission="owner:profile:update_any">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setEditError(null);
              setEditOpen(true);
            }}
          >
            <Pencil className="size-4" />
            {t("edit.action")}
          </Button>

          {/* Mounted only while open: the dialog seeds its fields from
              `identity` once and never resynchronises. */}
          {editOpen ? (
            <OwnerEditDialog
              open={editOpen}
              onClose={() => !update.isPending && setEditOpen(false)}
              identity={identity}
              nameLock={actions.nameLock}
              pending={update.isPending}
              error={editError}
              onSubmit={handleEditSubmit}
            />
          ) : null}
        </Can>
      ) : null}

      {actions.canDelete ? (
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
                <Button
                  variant="destructive"
                  onClick={handleConfirm}
                  disabled={softDelete.isPending}
                >
                  {softDelete.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {t("delete.confirm")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Can>
      ) : null}
    </div>
  );
}
