"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RowLink } from "@/components/ui/row-link";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronRight, Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useKycList } from "@/hooks/use-kyc";
import { describeApiError, isPermissionDenied } from "@/lib/onboarding/errors";
import { onboardingStatusPresentation } from "@/lib/onboarding/status";
import type { KycProfileSummaryDto } from "@/lib/types/kyc.types";
import type { OnboardingStatus } from "@/lib/types/onboarding.types";

const COLUMN_COUNT = 6;

/**
 * Tabs are the onboarding stage names themselves, not friendlier synonyms.
 * "Approved" on this screen filters `Approved` — the stage — and nothing else, so
 * the same word cannot come to mean two different filters on the two Docs screens.
 */
const TABS: { key: string; status: OnboardingStatus | undefined }[] = [
  { key: "all", status: undefined },
  { key: "review", status: "Review" },
  { key: "approved", status: "Approved" },
  { key: "contract", status: "Contract" },
  { key: "active", status: "Active" },
  { key: "rejected", status: "Rejected" },
];

function formatDate(iso: string | null, locale: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(locale);
}

function OwnerRow({
  row,
  locale,
}: {
  row: KycProfileSummaryDto;
  locale: string;
}) {
  const t = useTranslations("onboarding");
  const p = onboardingStatusPresentation(row.onboardingStatus);

  return (
    <TableRow className="relative cursor-pointer hover:bg-accent/40">
      <TableCell className="py-3">
        <RowLink
          href={`/dashboard/owner-documents/${row.ownerProfileId}`}
          label={row.ownerName || undefined}
        />
        <div className="flex flex-col">
          <span className="font-medium">{row.ownerName ?? "—"}</span>
          <span className="text-xs text-muted-foreground">
            {row.ownerEmail ?? "—"}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={p.variant} className={p.className}>
          {t(`status.${p.labelKey}`)}
        </Badge>
      </TableCell>
      <TableCell className="text-center text-sm">{row.documentCount}</TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {formatDate(row.onboardingReviewedAt, locale)}
      </TableCell>
      <TableCell className="max-w-[16rem] text-sm text-destructive">
        <span className="line-clamp-1">{row.onboardingRejectReason ?? ""}</span>
      </TableCell>
      <TableCell className="text-right">
        <ChevronRight className="ml-auto size-4 text-muted-foreground" />
      </TableCell>
    </TableRow>
  );
}

export default function OwnerDocumentsPage() {
  const t = useTranslations("docsWorkspace");
  const tOwners = useTranslations("owners");
  const tOnboarding = useTranslations("onboarding");
  const locale = useLocale();
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");

  const status = TABS.find((x) => x.key === tab)?.status;
  const { data: rows = [], isLoading, error } = useKycList(status);

  const filtered = rows.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (r.ownerName ?? "").toLowerCase().includes(q) ||
      (r.ownerEmail ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-bold leading-tight tracking-tight">
          {t("ownerListTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("ownerListSubtitle")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap rounded-lg border border-border bg-muted/50 p-0.5">
          {TABS.map((tb) => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === tb.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tb.key === "all"
                ? tOwners("kyc.allTab")
                : tOnboarding(`status.${tb.key}`)}
            </button>
          ))}
        </div>
        <div className="relative min-w-[200px] max-w-sm flex-1">
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
            {isLoading ? "…" : t("ownerCount", { count: filtered.length })}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tOwners("columns.owner")}</TableHead>
                <TableHead>{tOwners("columns.onboardingStatus")}</TableHead>
                <TableHead className="text-center">
                  {tOwners("columns.documents")}
                </TableHead>
                <TableHead>{tOwners("kyc.reviewedAt")}</TableHead>
                <TableHead>{tOwners("kyc.rejectReasonLabel")}</TableHead>
                <TableHead />
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
                /* A failed request must not read as "nobody has submitted". */
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
                    colSpan={COLUMN_COUNT}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    {tOwners("kyc.documentsEmpty")}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => (
                  <OwnerRow key={row.ownerProfileId} row={row} locale={locale} />
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
