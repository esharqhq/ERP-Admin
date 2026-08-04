"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Search, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useWorkers } from "@/hooks/use-workers";
import type { WorkerRowDto } from "@/lib/types/worker.types";
import type { OnboardingStatus } from "@/lib/types/onboarding.types";
import { onboardingStatusPresentation } from "@/lib/onboarding/status";
import { describeApiError, isPermissionDenied } from "@/lib/onboarding/errors";
import { DEFAULT_PAGE_SIZE } from "@/lib/types/paged.types";
import { RowLink } from "@/components/ui/row-link";

const COLUMN_COUNT = 5;

type FilterTab = "all" | "approved" | "pending";

function formatDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function StatusBadge({ status }: { status: WorkerRowDto["onboardingStatus"] }) {
  const t = useTranslations("onboarding");
  const p = onboardingStatusPresentation(status);
  return (
    <Badge variant={p.variant} className={p.className}>
      {t(`status.${p.labelKey}`)}
    </Badge>
  );
}

/**
 * The whole row opens the worker's Docs workspace — the screen where their
 * documents and the contract they unlock sit side by side. `RowLink` keeps
 * right-click and open-in-new-tab working, unlike an onClick handler.
 */
function WorkerRow({ worker, locale }: { worker: WorkerRowDto; locale: string }) {
  return (
    <TableRow className="relative cursor-pointer hover:bg-accent/40">
      <TableCell className="py-3 font-medium">
        <RowLink
          href={`/dashboard/worker-documents/${worker.id}`}
          label={worker.fullName || undefined}
        />
        {worker.fullName ?? "—"}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {worker.phoneNumber ?? worker.email ?? "—"}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {formatDate(worker.createdAt, locale)}
      </TableCell>
      <TableCell>
        <StatusBadge status={worker.onboardingStatus} />
      </TableCell>
      <TableCell className="text-right">
        <ChevronRight className="ml-auto size-4 text-muted-foreground" />
      </TableCell>
    </TableRow>
  );
}

export default function WorkerDocumentsPage() {
  const t = useTranslations("workers");
  const tStatus = useTranslations("status");
  const tOnboarding = useTranslations("onboarding");
  const locale = useLocale();
  const [tab, setTab] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");

  // Tabs map to the exact onboarding stage; `Review` is the admin review queue.
  const onboardingStatus: OnboardingStatus | undefined =
    tab === "approved" ? "Active" : tab === "pending" ? "Review" : undefined;

  const {
    data: page,
    isLoading,
    error,
  } = useWorkers({
    onboardingStatus,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  const workers = page?.items ?? [];

  const filtered = workers.filter((w) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (w.fullName ?? "").toLowerCase().includes(q) ||
      (w.email ?? "").toLowerCase().includes(q) ||
      (w.phoneNumber ?? "").toLowerCase().includes(q)
    );
  });

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: t("tabs.all") },
    { key: "approved", label: tStatus("approved") },
    { key: "pending", label: tStatus("pending") },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">
          {t("documents")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("documentsSubtitle")}
        </p>
      </div>

      {/* Filter bar */}
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
            placeholder={t("searchPlaceholder")}
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <p className="text-xs text-muted-foreground">
            {isLoading ? "Loading..." : `${filtered.length} workers`}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.fullName")}</TableHead>
                <TableHead>{t("columns.phone")}</TableHead>
                <TableHead>{t("columns.registeredAt")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead className="text-right">{t("columns.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={COLUMN_COUNT}>
                      <Skeleton className="h-8 w-full rounded-md" />
                    </TableCell>
                  </TableRow>
                ))
              ) : error ? (
                /* Without this branch a failed request is indistinguishable from
                   "this admin has no workers" — the table just renders empty. */
                <TableRow>
                  <TableCell
                    colSpan={COLUMN_COUNT}
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
                    {t("docNotFound")}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((worker) => (
                  <WorkerRow key={worker.id} worker={worker} locale={locale} />
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
