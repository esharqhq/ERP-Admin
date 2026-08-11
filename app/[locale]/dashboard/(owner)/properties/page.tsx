"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { RowLink } from "@/components/ui/row-link";
import { DataTableCard } from "@/components/ui/data-table-card";
import { FilterBar } from "@/components/ui/filter-bar";
import type { FilterGroup, FilterOption } from "@/components/ui/filter-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { useProperties, useCreateAdminProperty } from "@/hooks/use-properties";
import { useOwnerDirectory } from "@/hooks/use-owners";
import { usePropertyCategories } from "@/hooks/use-lookups";
import { useHasPermission } from "@/hooks/use-current-permissions";
import { normalizeHexColor } from "@/lib/properties/category-color";
import { useTableFilters, type TableFilterConfig } from "@/hooks/use-table-filters";
import { useLocale, useTranslations } from "next-intl";
import { Can } from "@/components/auth/can";
import { PropertyCreateDialog } from "@/components/properties/property-create-dialog";
import { describeApiError, isGateRefusal, isPermissionDenied } from "@/lib/onboarding/errors";
import {
  AREA_BUCKETS,
  CREATED_BUCKETS,
  areaBucket,
  categoryName,
  createdBucket,
  ownerNameById,
  type AreaBucket,
  type CreatedBucket,
} from "@/lib/properties/table-rows";
import type { PropertyDto } from "@/lib/types/property.types";

// Explicit maps rather than interpolating the bucket key into a message path:
// several keys start with a digit, and spelling the mapping out keeps every
// message path greppable.
const AREA_LABEL_KEY: Record<AreaBucket, string> = {
  unset:   "areaBands.unset",
  lt100:   "areaBands.lt100",
  from100: "areaBands.from100",
  from500: "areaBands.from500",
  gt2000:  "areaBands.gt2000",
};

const CREATED_LABEL_KEY: Record<CreatedBucket, string> = {
  "7d":    "createdBands.week",
  "30d":   "createdBands.month",
  "365d":  "createdBands.year",
  older:   "createdBands.older",
  unknown: "createdBands.unknown",
};

function formatDate(iso: string, locale: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
}

function formatArea(areaSqm: number | null, locale: string): string {
  if (areaSqm === null) return "—";
  return `${areaSqm.toLocaleString(locale, { maximumFractionDigits: 2 })} m²`;
}

/**
 * Shared by the area column's header and its cells, because they have to carry
 * the *same* right padding to line up: the header is right-aligned too, so any
 * difference between the two shows up directly as the label sitting off to one
 * side of the figures beneath it. Held in one place so changing the gap cannot
 * move only half of the column.
 */
const AREA_COLUMN = "pr-26 text-right";

/**
 * Options for one filter dimension, derived from the rows actually present and
 * ordered by a canonical key list.
 *
 * Derived rather than taken from a lookup endpoint on purpose: every option is
 * then guaranteed to match at least one row, and a property still carrying a
 * *deactivated* category stays filterable — deactivation is never enforced
 * retroactively, so such rows genuinely exist and would be unreachable if the
 * options came from the active-only category list.
 */
function presentOptions<K extends string>(
  order: readonly K[],
  present: Set<string>,
  label: (key: K) => string,
): FilterOption[] {
  return order.filter((k) => present.has(k)).map((k) => ({ value: k, label: label(k) }));
}

export default function PropertiesPage() {
  const t = useTranslations("properties");
  const tc = useTranslations("common");
  const tOnboarding = useTranslations("onboarding");
  const locale = useLocale();

  const { data: properties = [], isLoading, isError, error } = useProperties();

  // Owner names are a supporting read: PropertyDto carries only bossOwnerUserId.
  // Gated so an admin holding property:list but not owner:list gets a dash in
  // that column instead of a 403 on page load.
  const canListOwners = useHasPermission("owner:list");
  const { data: owners, isLoading: ownersLoading } = useOwnerDirectory(undefined, canListOwners);
  const ownerNames = useMemo(() => ownerNameById(owners), [owners]);
  const ownersPending = canListOwners && ownersLoading;

  // Colour lives on the full category DTO, not on the slim ref a property
  // carries — so the badge's dot needs the lookup. Active-only, which is the
  // same cache entry the create dialog fills: a property on a deactivated
  // category simply resolves no colour and shows no dot.
  const { data: categoryList } = usePropertyCategories();
  const categoryColors = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categoryList ?? []) {
      const hex = normalizeHexColor(c.color);
      if (hex) map.set(c.code, hex);
    }
    return map;
  }, [categoryList]);

  // Frozen once per mount: the age bands must not shift under the user
  // mid-session, and `useTableFilters` memoizes on the config's identity.
  const [now] = useState(() => Date.now());

  const [search, setSearch] = useState("");

  const filterConfig = useMemo<TableFilterConfig<PropertyDto>[]>(
    () => [
      { key: "owner",    selector: (p) => p.bossOwnerUserId },
      // The code, not the localized name — the label may change with the locale
      // but a selected filter must survive a language switch.
      { key: "category", selector: (p) => p.category.code },
      { key: "area",     selector: (p) => areaBucket(p.areaSqm) },
      { key: "created",  selector: (p) => createdBucket(p.createdAt, now) },
    ],
    [now],
  );

  const { values, setFilter, reset, filtered } = useTableFilters(properties, filterConfig);

  const filterGroups = useMemo<FilterGroup[]>(() => {
    const ownerIds = new Set<string>();
    const categories = new Map<string, string>();
    const areas = new Set<string>();
    const createds = new Set<string>();

    for (const p of properties) {
      ownerIds.add(p.bossOwnerUserId);
      categories.set(p.category.code, categoryName(p.category, locale));
      areas.add(areaBucket(p.areaSqm));
      createds.add(createdBucket(p.createdAt, now));
    }

    const ownerOptions = [...ownerIds]
      .map((id) => ({ value: id, label: ownerNames.get(id) ?? t("ownerUnknown") }))
      .sort((a, b) => a.label.localeCompare(b.label, locale));

    const categoryOptions = [...categories]
      .map(([code, label]) => ({ value: code, label }))
      .sort((a, b) => a.label.localeCompare(b.label, locale));

    return [
      { key: "owner",    label: t("columns.owner"),     options: ownerOptions },
      { key: "category", label: t("columns.category"),  options: categoryOptions },
      {
        key: "area",
        label: t("columns.area"),
        options: presentOptions(AREA_BUCKETS, areas, (k) =>
          t(AREA_LABEL_KEY[k] as Parameters<typeof t>[0]),
        ),
      },
      {
        key: "created",
        label: t("columns.createdAt"),
        options: presentOptions(CREATED_BUCKETS, createds, (k) =>
          t(CREATED_LABEL_KEY[k] as Parameters<typeof t>[0]),
        ),
      },
    ];
  }, [properties, ownerNames, locale, now, t]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return filtered;
    // Address is searchable without being a column — it is how an admin
    // recognizes a property they only know by street.
    return filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q) ||
        (ownerNames.get(p.bossOwnerUserId) ?? "").toLowerCase().includes(q),
    );
  }, [filtered, search, ownerNames]);

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
    { label: t("columns.owner") },
    { label: t("columns.category") },
    // Right-aligned so the figures line up column-wise, but with its own right
    // padding: `TableCell`'s default `px-2` leaves 8px between a right-aligned
    // number and the left-aligned date beside it, which reads as one run-on
    // value rather than two columns.
    { label: t("columns.area"), className: AREA_COLUMN },
    { label: t("columns.createdAt") },
  ];

  const Header = (
    <div className="flex items-start justify-between gap-3">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
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
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        {Header}
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
        {Header}
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
          <p className="font-semibold">
            {t("errorLoad")}
            {status ? ` (${status})` : ""}
          </p>
          <p className="mt-1 text-destructive/80">{msg}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {Header}

      <DataTableCard
        title={t("list")}
        count={visible.length}
        searchPlaceholder={t("searchPlaceholder")}
        searchValue={search}
        onSearchChange={setSearch}
        filters={
          <FilterBar
            groups={filterGroups}
            values={values}
            onChange={setFilter}
            onReset={reset}
            allLabel={tc("all")}
            clearLabel={tc("clearFilters")}
          />
        }
        columns={columns}
        data={visible}
        renderRow={(p: PropertyDto, index: number) => (
          <TableRow
            key={p.id}
            className="group/row relative cursor-pointer transition-colors duration-150 hover:bg-accent/40"
          >
            <TableCell className="py-3 text-center text-[13px] tabular-nums text-muted-foreground">
              <RowLink href={`/dashboard/properties/${p.id}`} label={p.name} />
              {index + 1}
            </TableCell>

            <TableCell className="py-3">
              <div className="flex flex-col gap-0.5">
                <span className="font-medium leading-tight">{p.name}</span>
                <span className="text-[11px] text-muted-foreground">{p.address}</span>
              </div>
            </TableCell>

            <TableCell className="text-sm text-muted-foreground">
              {ownersPending ? (
                <Skeleton className="h-4 w-24 rounded" />
              ) : (
                (ownerNames.get(p.bossOwnerUserId) ?? "—")
              )}
            </TableCell>

            <TableCell>
              <Badge variant="secondary" className="gap-1.5 font-normal">
                {categoryColors.has(p.category.code) && (
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-full ring-1 ring-inset ring-black/10"
                    style={{ backgroundColor: categoryColors.get(p.category.code) }}
                  />
                )}
                {categoryName(p.category, locale)}
              </Badge>
            </TableCell>

            <TableCell
              className={`${AREA_COLUMN} text-sm tabular-nums text-muted-foreground`}
            >
              {formatArea(p.areaSqm, locale)}
            </TableCell>

            <TableCell className="text-sm text-muted-foreground">
              {formatDate(p.createdAt, locale)}
            </TableCell>
          </TableRow>
        )}
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
