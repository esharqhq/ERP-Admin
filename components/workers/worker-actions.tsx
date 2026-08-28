"use client";

import { useState } from "react";
import {
  CheckCircle,
  FolderOpen,
  MessageSquare,
  Trash2,
  XCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";
import { Link, useRouter } from "@/i18n/navigation";
import { ApproveWorkerModal } from "@/components/workers/approve-modal";
import { RejectWorkerModal } from "@/components/workers/reject-modal";
import { ConfirmDialog } from "@/components/tasks/confirm-dialog";
import {
  MessageUserDialog,
  type MessageDraft,
} from "@/components/detail/message-user-dialog";
import {
  useApproveWorker,
  useRejectWorker,
  useSoftDeleteWorker,
} from "@/hooks/use-worker-actions";
import { useCreateTicketForUser } from "@/hooks/use-support";
import { getApiErrorCode } from "@/lib/http/api-error";
import { isPermissionDenied } from "@/lib/onboarding/errors";
import { canDecide } from "@/lib/onboarding/status";
import type { WorkerDetailDto } from "@/lib/types/worker.types";

/**
 * Everything an admin can do to a worker account, in one row.
 *
 * **The onboarding stage decides the row, and nothing else does.** Approve and
 * Reject exist only at `Review` — the server answers `400` from any other
 * stage — so they are *absent* elsewhere rather than present and disabled. There
 * is deliberately no "re-approve" for a rejected worker either: the worker
 * re-submits, which moves the stage back to `Review` by itself.
 *
 * Each verb is additionally gated on its own permission, so a MODERATOR sees a
 * shorter row rather than buttons that answer `403`. The row never collapses to
 * nothing — Message survives every gate, because opening a ticket is how an
 * admin acts on a worker they cannot otherwise touch.
 *
 * This replaces an `ActionBar` whose Message, Edit and More buttons were wired
 * to nothing at all, and whose Edit had no endpoint behind it in any case:
 * there is no admin correction of a worker's identity anywhere in the API. The
 * correction loop is reject-with-reason → the worker re-submits.
 */
export function WorkerActions({ worker }: { worker: WorkerDetailDto }) {
  const t = useTranslations("workers");
  const router = useRouter();

  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);

  const { mutate: approve, isPending: isApproving } = useApproveWorker(
    worker.id,
  );
  const { mutate: reject, isPending: isRejecting } = useRejectWorker(worker.id);
  const softDelete = useSoftDeleteWorker(worker.id);
  const createTicket = useCreateTicketForUser();

  const name = worker.fullName ?? "—";

  const deleteError = softDelete.isError
    ? getApiErrorCode(softDelete.error) === "worker_not_found"
      ? t("delete.errors.notFound")
      : t("delete.errors.generic")
    : null;

  function mapMessageError(err: unknown): string {
    if (isPermissionDenied(err)) return t("message.errors.forbidden");
    const code = getApiErrorCode(err);
    if (code === "invalid_target_type")
      return t("message.errors.invalidTarget");
    if (code === "target_not_found") return t("message.errors.notFound");
    return t("message.errors.generic");
  }

  function handleMessageSubmit(draft: MessageDraft) {
    setMessageError(null);
    createTicket.mutate(
      // `"Worker"` passes through `UserTypeNormalizer` unchanged — only the
      // owner literal is remapped there, so this one needs no special casing.
      { ...draft, targetUserType: "Worker", targetUserId: worker.id },
      {
        onSuccess: () => setMessageOpen(false),
        onError: (err) => setMessageError(mapMessageError(err)),
      },
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
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

        {/* Mounted only while open — the draft is seeded once and never resynced. */}
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

      <Can permission="worker:soft_delete">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-destructive hover:text-destructive"
          onClick={() => setShowDelete(true)}
        >
          <Trash2 className="size-4" />
          {t("delete.action")}
        </Button>
      </Can>

      {canDecide(worker.onboardingStatus) ? (
        <>
          <Can permission="worker:reject">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-destructive hover:text-destructive"
              onClick={() => setShowReject(true)}
            >
              <XCircle className="size-4" />
              {t("reject")}
            </Button>
          </Can>
          <Can permission="worker:approve">
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => setShowApprove(true)}
            >
              <CheckCircle className="size-4" />
              {t("approveAction")}
            </Button>
          </Can>
        </>
      ) : (
        <Can permission="worker:doc:read_any">
          <Button
            size="sm"
            className="gap-1.5"
            nativeButton={false}
            render={<Link href={`/dashboard/worker-documents/${worker.id}`} />}
          >
            <FolderOpen className="size-4" />
            {t("openDocuments")}
          </Button>
        </Can>
      )}

      <ApproveWorkerModal
        open={showApprove}
        onClose={() => setShowApprove(false)}
        onConfirm={() => {
          approve();
          setShowApprove(false);
        }}
        isPending={isApproving}
        workerName={name}
      />
      <RejectWorkerModal
        open={showReject}
        onClose={() => setShowReject(false)}
        onConfirm={(reason) => {
          reject(reason);
          setShowReject(false);
        }}
        isPending={isRejecting}
        workerName={name}
      />
      <ConfirmDialog
        open={showDelete}
        onClose={() => {
          setShowDelete(false);
          softDelete.reset();
        }}
        onConfirm={() =>
          softDelete.mutate(undefined, {
            onSuccess: () => {
              setShowDelete(false);
              router.push("/dashboard/workers");
            },
          })
        }
        isPending={softDelete.isPending}
        destructive
        title={t("delete.title")}
        description={t("delete.description", { name })}
        confirmLabel={t("delete.action")}
        error={deleteError}
      />
    </div>
  );
}
