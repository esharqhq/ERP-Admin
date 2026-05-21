"use client";

import { use, useState } from "react";
import {
  Star,
  CheckCircle2,
  BadgeCheck,
  User,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useWorkerDetail } from "@/hooks/use-worker-detail";
import { useApproveWorker, useRejectWorker } from "@/hooks/use-worker-actions";
import {
  useWorkerDocs,
  useApproveWorkerDoc,
  useRejectWorkerDoc,
} from "@/hooks/use-worker-docs";
import { ActionBar } from "@/components/workers/action-bar";
import { HeroCard } from "@/components/workers/hero-card";
import { StatCard } from "@/components/workers/stat-card";
import { ApproveWorkerModal } from "@/components/workers/approve-modal";
import { RejectWorkerModal } from "@/components/workers/reject-modal";
import { DocTable } from "@/components/workers/doc-table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function WorkerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: worker, isLoading, isError } = useWorkerDetail(id);
  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const { mutate: approve, isPending: isApproving } = useApproveWorker(id);
  const { mutate: reject, isPending: isRejecting } = useRejectWorker(id);
  const { data: docs = [], isLoading: isLoadingDocs } = useWorkerDocs(id);
  const { mutate: approveDoc, isPending: isApprovingDoc } =
    useApproveWorkerDoc(id);
  const { mutate: rejectDoc, isPending: isRejectingDoc } =
    useRejectWorkerDoc(id);

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
          Ishchi topilmadi yoki xatolik yuz berdi.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ActionBar />
      <HeroCard worker={worker} />

      {!worker.isApproved && (
        <div className="flex gap-2">
          <Button className="gap-1.5" onClick={() => setShowApprove(true)}>
            <CheckCircle className="size-4" />
            Tasdiqlash
          </Button>
          <Button
            variant="destructive"
            className="gap-1.5"
            onClick={() => setShowReject(true)}
          >
            <XCircle className="size-4" />
            Rad etish
          </Button>
        </div>
      )}

      <ApproveWorkerModal
        open={showApprove}
        onClose={() => setShowApprove(false)}
        onConfirm={() => {
          approve();
          setShowApprove(false);
        }}
        isPending={isApproving}
        workerName={worker.fullName ?? "Ishchi"}
      />
      <RejectWorkerModal
        open={showReject}
        onClose={() => setShowReject(false)}
        onConfirm={(reason) => {
          reject(reason);
          setShowReject(false);
        }}
        isPending={isRejecting}
        workerName={worker.fullName ?? "Ishchi"}
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
          label="Reyting"
          value={worker.rating.toFixed(1)}
          hint="Mijozlar bahosi"
          icon={<Star className="size-4" />}
          tone="amber"
        />
        <StatCard
          label="Holat"
          value={worker.isApproved ? "Tasdiqlangan" : "Kutilmoqda"}
          hint={worker.isApproved ? "Faol xodim" : "Tekshirilmoqda"}
          icon={<BadgeCheck className="size-4" />}
          tone={worker.isApproved ? "emerald" : "amber"}
        />
        {/* <StatCard
          label="Verified"
          value={worker.isVerified ? "Ha" : "Yo'q"}
          hint="Hujjat tekshiruvi"
          icon={<CheckCircle2 className="size-4" />}
          tone={worker.isVerified ? "emerald" : "violet"}
        /> */}
        <StatCard
          label="Kasb"
          value={worker.professions?.length ?? 0}
          hint="Mutaxassisliklar"
          icon={<User className="size-4" />}
          tone="blue"
        />
      </div>
    </div>
  );
}
