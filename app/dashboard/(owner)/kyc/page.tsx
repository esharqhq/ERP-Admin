"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTableCard } from "@/components/ui/data-table-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useKycList, useApproveKyc, useRejectKyc } from "@/hooks/use-kyc";
import { KycRow } from "@/components/kyc/kyc-row";
import type { KycStatus } from "@/lib/types/kyc.types";

const kycColumns = [
  { label: "Mulkdor" },
  { label: "Holat" },
  { label: "Hujjatlar", className: "text-center" },
  { label: "Rad etish sababi" },
  { label: "Amallar", className: "text-right" },
];

function KycTable({ status }: { status?: KycStatus }) {
  const { data: kycList = [], isLoading } = useKycList(status);
  const { mutate: approve, isPending: isApproving } = useApproveKyc();
  const { mutate: reject, isPending: isRejecting } = useRejectKyc();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-border p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (kycList.length === 0) {
    return (
      <p className="rounded-xl border border-border p-6 text-sm text-muted-foreground">
        KYC arizalar topilmadi.
      </p>
    );
  }

  return (
    <DataTableCard
      title="KYC Arizalar"
      count={kycList.length}
      columns={kycColumns}
      data={kycList}
      renderRow={(kyc) => (
        <KycRow
          key={kyc.ownerProfileId}
          kyc={kyc}
          onApprove={(id) => approve(id)}
          onReject={(id, reason) => reject({ ownerProfileId: id, reason })}
          isApproving={isApproving}
          isRejecting={isRejecting}
        />
      )}
    />
  );
}

type StatusTab = "all" | "pending" | "approved" | "rejected";

const statusMap: Record<StatusTab, KycStatus | undefined> = {
  all: undefined,
  pending: 1,
  approved: 2,
  rejected: 3,
};

export default function KycPage() {
  const [tab, setTab] = useState<StatusTab>("pending");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">
          KYC Review
        </h1>
        <p className="text-sm text-muted-foreground">
          Mulkdorlarning KYC arizalarini ko&apos;rib chiqing.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as StatusTab)} className="gap-4">
        <TabsList variant="line" className="self-start">
          <TabsTrigger value="all">Barchasi</TabsTrigger>
          <TabsTrigger value="pending">Kutilmoqda</TabsTrigger>
          <TabsTrigger value="approved">Tasdiqlangan</TabsTrigger>
          <TabsTrigger value="rejected">Rad etilgan</TabsTrigger>
        </TabsList>
        {(["all", "pending", "approved", "rejected"] as const).map((t) => (
          <TabsContent key={t} value={t}>
            <KycTable status={statusMap[t]} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
