"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Trash2,
  Loader2,
  Pencil,
  MessageSquare,
  Plus,
  ClipboardList,
} from "lucide-react";
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
import { OwnerOrderDialog } from "@/components/owners/owner-order-dialog";
import { PropertyCreateDialog } from "@/components/properties/property-create-dialog";
import {
  MessageUserDialog,
  type MessageDraft,
} from "@/components/detail/message-user-dialog";
import { useRouter } from "@/i18n/navigation";
import { useSoftDeleteOwner, useUpdateOwner } from "@/hooks/use-owners";
import { useCreateAdminProperty } from "@/hooks/use-properties";
import { useCreateTicketForUser } from "@/hooks/use-support";
import { getApiErrorCode } from "@/lib/http/api-error";
import { describeApiError, isPermissionDenied } from "@/lib/onboarding/errors";
import type {
  OwnerDetailActions,
  OwnerUpdateBody,
} from "@/lib/owners/detail-actions";
import type { OwnerSummaryDto } from "@/lib/types/owner.types";
import type { PropertyDto } from "@/lib/types/property.types";

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
  properties,
  coverInForce,
}: {
  owner: OwnerSummaryDto;
  actions: OwnerDetailActions;
  /** Legal name pair; both null when the KYC read 404'd or was refused. */
  identity: { firstName: string | null; lastName: string | null };
  /** This owner's properties — an order is filed against one of them. */
  properties: PropertyDto[];
  /**
   * Whether the owner holds cover today (`phase === "InForce"`). Create order is
   * offered only then: the create route runs the same ACTIVE gate as the owner's
   * own, so without cover every attempt is a `403` about their contract
   * (`onboarding_incomplete` / `contract_expired` / `contract_not_yet_active`).
   */
  coverInForce: boolean;
}) {
  const t = useTranslations("owners");
  const tCommon = useTranslations("common");
  const tOnboarding = useTranslations("onboarding");
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [propertyOpen, setPropertyOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const createProperty = useCreateAdminProperty();

  /**
   * `POST /api/admin/properties` is gated on the TARGET OWNER's contract, not on
   * the admin's access, so a `403` *with* a body is a statement about this owner's
   * cover — only the empty-body one is a permission problem, which is what
   * `isPermissionDenied` tests. Same mapping as the properties table, which owns
   * the other entry point to this route.
   */
  const propertyError = !createProperty.isError
    ? null
    : isPermissionDenied(createProperty.error)
      ? tOnboarding("permissionDenied")
      : tOnboarding(
          `apiErrors.${describeApiError(createProperty.error)?.labelKey ?? "unknown"}`,
        );

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
    if (code === "invalid_target_type")
      return t("message.errors.invalidTarget");
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
            <MessageUserDialog
              open={messageOpen}
              onClose={() => !createTicket.isPending && setMessageOpen(false)}
              pending={createTicket.isPending}
              title={t("message.title")}
              description={t("message.description")}
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
                <label
                  htmlFor="owner-delete-reason"
                  className="text-sm font-medium"
                >
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

              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : null}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={softDelete.isPending}
                >
                  {tCommon("cancel")}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleConfirm}
                  disabled={softDelete.isPending}
                >
                  {softDelete.isPending && (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  )}
                  {t("delete.confirm")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Can>
      ) : null}

      {/* Not on the walk-in account: it exists to hold manual orders, not
          buildings, so a property authored under it would belong to an account
          nobody can sign into. Offered at every other onboarding stage, exactly
          as the design draws it — for an owner without cover the route still
          answers `403`, and the dialog states that answer rather than the button
          pretending to know it in advance. */}
      {!actions.isWalkIn ? (
        <Can permission="property:create_any">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              createProperty.reset();
              setPropertyOpen(true);
            }}
          >
            <Plus className="size-4" />
            {t("addProperty.action")}
          </Button>

          {/* Mounted only while open — its owners queue is a read this page has
              no other use for, and locking the owner skips it entirely. */}
          {propertyOpen ? (
            <PropertyCreateDialog
              open
              onClose={() => {
                if (createProperty.isPending) return;
                setPropertyOpen(false);
                createProperty.reset();
              }}
              pending={createProperty.isPending}
              error={propertyError}
              lockedOwner={{
                id: owner.id,
                label: owner.fullName || owner.email || owner.id,
              }}
              onSubmit={(body) =>
                createProperty.mutate(body, {
                  onSuccess: () => setPropertyOpen(false),
                })
              }
            />
          ) : null}
        </Can>
      ) : null}

      {/* Three conditions, each one a refusal that would otherwise be reached by
          clicking: the walk-in account files its orders from its own page, an
          owner with no property has nothing to file against (`propertyId` is the
          only owner the body carries), and without cover in force every attempt
          is a `403` about their contract. Absent rather than disabled — the same
          call Edit makes two blocks up. */}
      {!actions.isWalkIn && properties.length > 0 && coverInForce ? (
        <Can permission="task_group:create_any">
          <Button size="sm" className="gap-1.5" onClick={() => setOrderOpen(true)}>
            <ClipboardList className="size-4" />
            {t("order.action")}
          </Button>

          {orderOpen ? (
            <OwnerOrderDialog
              open
              onClose={() => setOrderOpen(false)}
              ownerName={owner.fullName || owner.email || owner.id}
              properties={properties}
              onCreated={() => setOrderOpen(false)}
            />
          ) : null}
        </Can>
      ) : null}
    </div>
  );
}
