"use client";

import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useKycList, useApproveKyc, useRejectKyc } from "@/hooks/use-kyc";
import { KycRow } from "@/components/kyc/kyc-row";
import { describeApiError, isPermissionDenied } from "@/lib/onboarding/errors";
import type { OnboardingStatus } from "@/lib/types/onboarding.types";

type FilterTab = "all" | "review" | "approved" | "rejected";

// The queue filter is `?status=Review`, not `Pending` — the old Pending conflated
// "uploaded nothing yet" with "submitted and waiting for an admin".
const tabStatusMap: Record<FilterTab, OnboardingStatus | undefined> = {
  all: undefined,
  review: "Review",
  approved: "Approved",
  rejected: "Rejected",
};

export default function KycPage() {
  const t = useTranslations("owners");
  const tOnboarding = useTranslations("onboarding");
  const [tab, setTab] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");

  const {
    data: kycList = [],
    isLoading,
    error,
  } = useKycList(tabStatusMap[tab]);
  const approveMutation = useApproveKyc();
  const rejectMutation = useRejectKyc();

  const filtered = kycList.filter((k) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (k.ownerName ?? "").toLowerCase().includes(q) ||
      (k.ownerEmail ?? "").toLowerCase().includes(q)
    );
  });

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: t("kyc.allTab") },
    { key: "review", label: tOnboarding("status.review") },
    { key: "approved", label: tOnboarding("status.approved") },
    { key: "rejected", label: tOnboarding("status.rejected") },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">
          {t("kyc.documents")}
        </h1>
        <p className="text-sm text-muted-foreground">
          Review and manage owner KYC applications.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-border bg-muted/50 p-0.5">
          {tabs.map((tb) => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === tb.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tb.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <p className="text-xs text-muted-foreground">
            {isLoading ? "Loading..." : `${filtered.length} owners`}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.owner")}</TableHead>
                <TableHead>{t("columns.kycStatus")}</TableHead>
                <TableHead className="text-center">{t("columns.documents")}</TableHead>
                <TableHead>{t("kyc.rejectReasonLabel")}</TableHead>
                <TableHead className="text-right">{t("columns.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-8 w-full rounded-md" />
                    </TableCell>
                  </TableRow>
                ))
              ) : error ? (
                /* Without this branch a failed request is indistinguishable from
                   "no owners have submitted" — the table just renders empty. */
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-sm text-destructive"
                  >
                    {isPermissionDenied(error)
                      ? tOnboarding("permissionDenied")
                      : tOnboarding(
                          `apiErrors.${describeApiError(error)?.labelKey ?? "unknown"}`,
                        )}
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    {t("kyc.documentsEmpty")}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((kyc) => (
                  <KycRow
                    key={kyc.ownerProfileId}
                    kyc={kyc}
                    onApprove={(id) => approveMutation.mutate(id)}
                    onReject={(id, reason) =>
                      rejectMutation.mutate({ ownerProfileId: id, reason })
                    }
                    isApproving={
                      approveMutation.isPending &&
                      approveMutation.variables === kyc.ownerProfileId
                    }
                    isRejecting={
                      rejectMutation.isPending &&
                      rejectMutation.variables?.ownerProfileId === kyc.ownerProfileId
                    }
                  />
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
