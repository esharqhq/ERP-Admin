"use client";

import { use, useState } from "react";
import {
  Star,
  BadgeCheck,
  User,
  CheckCircle,
  XCircle,
  Trash2,
} from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useWorkerDetail, useWorkerRating } from "@/hooks/use-worker-detail";
import {
  useApproveWorker,
  useRejectWorker,
  useSoftDeleteWorker,
} from "@/hooks/use-worker-actions";
import {
  useWorkerDocs,
  useApproveWorkerDoc,
  useRejectWorkerDoc,
} from "@/hooks/use-worker-docs";
import { useHasPermission } from "@/hooks/use-current-permissions";
import { ActionBar } from "@/components/workers/action-bar";
import { HeroCard } from "@/components/workers/hero-card";
import { StatCard } from "@/components/workers/stat-card";
import { RatingSnapshotCard } from "@/components/workers/rating-snapshot-card";
import { ApproveWorkerModal } from "@/components/workers/approve-modal";
import { RejectWorkerModal } from "@/components/workers/reject-modal";
import { ConfirmDialog } from "@/components/tasks/confirm-dialog";
import { DocTable } from "@/components/workers/doc-table";
import { Can } from "@/components/auth/can";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiErrorCode } from "@/lib/http/api-error";
import { useTranslations } from "next-intl";

export default function WorkerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = useTranslations("workers");
  const tStatus = useTranslations("status");
  const { id } = use(params);
  const router = useRouter();
  const { data: worker, isLoading, isError } = useWorkerDetail(id);
  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const { mutate: approve, isPending: isApproving } = useApproveWorker(id);
  const { mutate: reject, isPending: isRejecting } = useRejectWorker(id);
  const { data: docs = [], isLoading: isLoadingDocs } = useWorkerDocs(id);
  const { mutate: approveDoc, isPending: isApprovingDoc } =
    useApproveWorkerDoc(id);
  const { mutate: rejectDoc, isPending: isRejectingDoc } =
    useRejectWorkerDoc(id);

  const canViewRating = useHasPermission("worker_rating:read_any");
  const { data: rating, isLoading: isLoadingRating } = useWorkerRating(
    id,
    canViewRating,
  );
  const softDelete = useSoftDeleteWorker(id);
  const deleteError = softDelete.isError
    ? getApiErrorCode(softDelete.error) === "worker_not_found"
      ? t("delete.errors.notFound")
      : t("delete.errors.generic")
    : null;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <ActionBar />
        <Skeleton className="h-48 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !worker) {
    return (
      <div className="flex flex-col gap-6">
        <ActionBar />
        <p className="text-sm text-destructive">
          {t("notFound")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ActionBar />
      <HeroCard worker={worker} />

      <div className="flex flex-wrap gap-2">
        {!worker.isApproved && (
          <>
            <Button className="gap-1.5" onClick={() => setShowApprove(true)}>
              <CheckCircle className="size-4" />
              {t("approve")}
            </Button>
            <Button
              variant="destructive"
              className="gap-1.5"
              onClick={() => setShowReject(true)}
            >
              <XCircle className="size-4" />
              {t("reject")}
            </Button>
          </>
        )}
        <Can permission="worker:soft_delete">
          <Button
            variant="outline"
            className="gap-1.5 text-destructive hover:text-destructive"
            onClick={() => setShowDelete(true)}
          >
            <Trash2 className="size-4" />
            {t("delete.action")}
          </Button>
        </Can>
      </div>

      <Can permission="worker_rating:read_any">
        <RatingSnapshotCard rating={rating} isLoading={isLoadingRating} />
      </Can>

      <ApproveWorkerModal
        open={showApprove}
        onClose={() => setShowApprove(false)}
        onConfirm={() => {
          approve();
          setShowApprove(false);
        }}
        isPending={isApproving}
        workerName={worker.fullName ?? "—"}
      />
      <RejectWorkerModal
        open={showReject}
        onClose={() => setShowReject(false)}
        onConfirm={(reason) => {
          reject(reason);
          setShowReject(false);
        }}
        isPending={isRejecting}
        workerName={worker.fullName ?? "—"}
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
        description={t("delete.description", { name: worker.fullName ?? "—" })}
        confirmLabel={t("delete.action")}
        error={deleteError}
      />

      <DocTable
        docs={docs}
        isLoading={isLoadingDocs}
        onApprove={(docId) => approveDoc(docId)}
        onReject={(docId, reason) => rejectDoc({ docId, reason })}
        isApproving={isApprovingDoc}
        isRejecting={isRejectingDoc}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard
          label={t("columns.rating")}
          value={worker.rating.toFixed(1)}
          hint="Customer rating"
          icon={<Star className="size-4" />}
          tone="amber"
        />
        <StatCard
          label={t("columns.status")}
          value={worker.isApproved ? tStatus("approved") : tStatus("pending")}
          hint={worker.isApproved ? "Active worker" : "Under review"}
          icon={<BadgeCheck className="size-4" />}
          tone={worker.isApproved ? "emerald" : "amber"}
        />
        {/* <StatCard
          label="Verified"
          value={worker.isVerified ? "Yes" : "No"}
          hint="Document verification"
          icon={<CheckCircle2 className="size-4" />}
          tone={worker.isVerified ? "emerald" : "violet"}
        /> */}
        <StatCard
          label="Profession"
          value={worker.professions?.length ?? 0}
          hint="Specializations"
          icon={<User className="size-4" />}
          tone="blue"
        />
      </div>
    </div>
  );
}
