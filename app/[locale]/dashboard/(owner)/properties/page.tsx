"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { RowLink } from "@/components/ui/row-link";
import { DataTableCard } from "@/components/ui/data-table-card";
import { FilterMenu, type FilterGroup } from "@/components/ui/filter-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Plus } from "lucide-react";
import { useProperties, useCreateAdminProperty } from "@/hooks/use-properties";
import { useTableFilters, type TableFilterConfig } from "@/hooks/use-table-filters";
import { useLocale, useTranslations } from "next-intl";
import { Can } from "@/components/auth/can";
import { PropertyCreateDialog } from "@/components/properties/property-create-dialog";
import { describeApiError, isGateRefusal, isPermissionDenied } from "@/lib/onboarding/errors";
import { PROPERTY_TYPES, type PropertyDto } from "@/lib/types/property.types";

const docsStatusConfig: Record<
  string,
  { labelKey: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  Pending:  { labelKey: "docsStatus.pending", variant: "secondary" },
  Approved: { labelKey: "docsStatus.approved", variant: "default" },
  Rejected: { labelKey: "docsStatus.rejected", variant: "destructive" },
};

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Docs-status values the backend returns, in the order shown in the filter menu.
const DOCS_STATUSES = ["Pending", "Approved", "Rejected"] as const;

// Pure selectors — defined once so `useTableFilters` doesn't recompute each render.
const propertyFilterConfig: TableFilterConfig<PropertyDto>[] = [
  { key: "docsStatus", selector: (p) => p.docsStatus },
  { key: "type", selector: (p) => p.type },
];

export default function PropertiesPage() {
  const t = useTranslations("properties");
  const tc = useTranslations("common");
  const tOnboarding = useTranslations("onboarding");
  const locale = useLocale();
  const { data: properties = [], isLoading, isError, error } = useProperties();

  const [search, setSearch] = useState("");
  const { values, setFilter, filtered } = useTableFilters(properties, propertyFilterConfig);

  const filterGroups = useMemo<FilterGroup[]>(
    () => [
      {
        key: "docsStatus",
        label: t("columns.docsStatus"),
        options: DOCS_STATUSES.map((s) => ({
          value: s,
          label: t(`docsStatus.${s.toLowerCase()}` as Parameters<typeof t>[0]),
        })),
      },
      {
        key: "type",
        label: t("columns.type"),
        options: PROPERTY_TYPES.map((ty) => ({ value: ty, label: ty })),
      },
    ],
    [t],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return filtered;
    return filtered.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) || p.address?.toLowerCase().includes(q),
    );
  }, [filtered, search]);

  const [createOpen, setCreateOpen] = useState(false);
  const create = useCreateAdminProperty();
  // POST /api/admin/properties is gated on the TARGET OWNER's contract, not the
  // admin's — a 403 with a body is that owner's cover, not a permission problem
  // (isPermissionDenied catches the empty-body 403 that actually is one).
  const createError = !create.isError
    ? null
    : isPermissionDenied(create.error)
      ? tOnboarding("permissionDenied")
      : (() => {
          const info = describeApiError(create.error);
          if (info && isGateRefusal(create.error)) {
            // About the OWNER's contract, not the admin's access.
            return tOnboarding(`apiErrors.${info.labelKey}`);
          }
          return tOnboarding(`apiErrors.${info?.labelKey ?? "unknown"}`);
        })();

  const closeCreate = () => {
    setCreateOpen(false);
    create.reset();
  };

  const columns = [
    { label: "#", className: "w-10 text-center" },
    { label: t("columns.name") },
    { label: t("columns.address") },
    { label: t("columns.type") },
    { label: t("columns.docsStatus") },
    { label: t("columns.createdAt") },
  ];

  function getDocsStatusConfig(status: string | null) {
    if (!status) return { label: t("docsStatus.unknown"), variant: "outline" as const };
    const config = docsStatusConfig[status];
    if (!config) return { label: status, variant: "outline" as const };
    return { label: t(config.labelKey as Parameters<typeof t>[0]), variant: config.variant };
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex flex-col gap-2 rounded-xl border border-border p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    const msg =
      (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
      (error as Error)?.message ??
      t("errorConnect");
    const status = (error as { response?: { status?: number } })?.response?.status;
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">
            {t("title")}
          </h1>
        </div>
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
          <p className="font-semibold">
            {t("errorLoad")}{status ? ` (${status})` : ""}
          </p>
          <p className="mt-1 text-destructive/80">{msg}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Can permission="property:create_any">
            <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              {t("create.new")}
            </Button>
          </Can>
        </div>
      </div>

      <DataTableCard
        title={t("list")}
        count={visible.length}
        searchPlaceholder={t("searchPlaceholder")}
        searchValue={search}
        onSearchChange={setSearch}
        filter={
          <FilterMenu
            groups={filterGroups}
            values={values}
            onChange={setFilter}
            allLabel={tc("all")}
          />
        }
        columns={columns}
        data={visible}
        renderRow={(p: PropertyDto, index: number) => {
          const docs = getDocsStatusConfig(p.docsStatus);
          return (
            <TableRow
              key={p.id}
              className="group/row relative cursor-pointer transition-colors duration-150 hover:bg-accent/40"
            >
              <TableCell className="py-3 text-center text-[13px] tabular-nums text-muted-foreground">
                <RowLink href={`/dashboard/properties/${p.id}`} label={p.name ?? undefined} />
                {index + 1}
              </TableCell>
              <TableCell className="py-3 font-medium">{p.name ?? "—"}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0" />
                  {p.address ?? "—"}
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{p.type ?? "—"}</TableCell>
              <TableCell>
                <Badge variant={docs.variant}>{docs.label}</Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(p.createdAt, locale)}
              </TableCell>
            </TableRow>
          );
        }}
      />

      {createOpen && (
        <PropertyCreateDialog
          open
          onClose={closeCreate}
          pending={create.isPending}
          error={createError}
          onSubmit={(body) => create.mutate(body, { onSuccess: closeCreate })}
        />
      )}
    </div>
  );
}
