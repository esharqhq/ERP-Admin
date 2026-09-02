"use client";

import { useMemo, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import type { FilterField } from "@/components/ui/filter-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Camera, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { SummaryStrip } from "@/components/properties/summary-strip";
import { PropertiesToolbar } from "@/components/properties/properties-toolbar";
import {
  useProperties,
  useCreateAdminProperty,
  useDeletedProperties,
} from "@/hooks/use-properties";
import { useOwnerDirectory } from "@/hooks/use-owners";
import { usePropertyCategories } from "@/hooks/use-lookups";
import { useHasPermission } from "@/hooks/use-current-permissions";
import { useTableUrlState } from "@/hooks/use-table-url-state";
import { normalizeHexColor } from "@/lib/properties/category-color";
import {
  SUMMARY_FILTER_KEYS,
  matchesSummaryFilter,
  summarise,
} from "@/lib/properties/summary";
import { initials } from "@/lib/ui/initials";
import { matchesAny, withinDay, withinNumber } from "@/lib/ui/filter-predicates";
import { looseIncludes } from "@/lib/ui/table-rows";
import { cn } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";
import { Can } from "@/components/auth/can";
import { PropertyCreateDialog } from "@/components/properties/property-create-dialog";
import { describeApiError, isGateRefusal, isPermissionDenied } from "@/lib/onboarding/errors";
import { categoryName, ownerNameById } from "@/lib/properties/table-rows";
import type { PropertyDto } from "@/lib/types/property.types";

/**
 * The four dropdown dimensions, plus the three the summary tiles own.
 *
 * The tiles write into the same bag rather than a mode of their own, so a tile
 * click is a shareable link and `resetFilters` clears it — a narrowing no control
 * can see or undo is the one thing a filtered table must never have.
 */
const FILTER_KEYS = [
  "owner",
  "category",
  "addedFrom",
  "addedTo",
  "areaMin",
  "areaMax",
  ...SUMMARY_FILTER_KEYS,
];

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
 * ⚠ `media` is `null` when the read did not carry `?withMedia=true`, which is
 * "not asked for" rather than "none". This page always asks, so a null here is a
 * bug rather than a state — it counts as zero and the column shows it, which is
 * how the mistake would surface instead of hiding.
 */
function photoCount(p: PropertyDto): number {
  return p.media?.length ?? 0;
}

/** Nulls last in **both** directions — an unknown is not a small value. */
function compareNullable(a: number | null, b: number | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a - b;
}

/**
 * The properties table, on the shared table shell.
 *
 * **Client mode**, unlike the owners table beside it. `GET /api/properties`
 * returns a bare, unpaged array and takes no query parameters, so the shell owns
 * the search → filter → sort → page pipeline over the whole set. That is also what
 * makes the columns genuinely sortable here: every row is in the browser, so a
 * sort orders the table rather than one page of it.
 *
 * **No stage tabs.** A property has no stage. Soft-deleted ones live behind their
 * own route with their own permission (`property:restore`) and their own restore
 * action, so folding them in as a tab would be a feature, not a migration.
 */
export default function PropertiesPage() {
  const t = useTranslations("properties");
  const tOnboarding = useTranslations("onboarding");
  const locale = useLocale();
  const router = useRouter();

  // `withMedia` is what fills the Photos column and the "no photos" tile. It is
  // one extra query param on a read this page already makes, not a second request.
  const { data: properties = [], isLoading, isError, error } = useProperties(true, true);

  const state = useTableUrlState({ filterKeys: FILTER_KEYS });

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

  /**
   * The bin count, for the strip's third tile. Gated on `property:restore` —
   * the backend forces `includeDeleted` false without it, so an ungated read
   * would return the live list and the tile would report every property as
   * deleted.
   */
  const canRestore = useHasPermission("property:restore");
  const { data: deleted } = useDeletedProperties(canRestore === true);

  /** Active-only, so "not in it" is the retired-category predicate. */
  const activeCategoryCodes = useMemo(
    () => new Set((categoryList ?? []).filter((c) => c.isActive).map((c) => c.code)),
    [categoryList],
  );

  const summary = useMemo(
    () => summarise(properties, activeCategoryCodes, deleted?.length ?? 0),
    [properties, activeCategoryCodes, deleted],
  );

  /**
   * The band's dimensions, in the control shapes the design draws.
   *
   * ⚠ **Every option here is derived from the rows on screen**, not from a lookup
   * endpoint, and that is deliberate: an option then always matches at least one
   * row, and a property carrying a *deactivated* category stays filterable —
   * deactivation is never applied retroactively, so such rows genuinely exist and
   * would be unreachable if the list came from the active-only lookup.
   *
   * The counts beside each option come from the same pass, so the number an admin
   * reads is the number of rows they will get.
   */
  const fields = useMemo<FilterField[]>(() => {
    const ownerCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};
    const categories = new Map<string, string>();

    for (const p of properties) {
      ownerCounts[p.bossOwnerUserId] = (ownerCounts[p.bossOwnerUserId] ?? 0) + 1;
      categoryCounts[p.category.code] = (categoryCounts[p.category.code] ?? 0) + 1;
      categories.set(p.category.code, categoryName(p.category, locale));
    }

    const ownerOptions = Object.keys(ownerCounts)
      .map((id) => ({ value: id, label: ownerNames.get(id) ?? t("ownerUnknown") }))
      .sort((a, b) => a.label.localeCompare(b.label, locale));

    const categoryOptions = [...categories]
      .map(([code, label]) => ({ value: code, label }))
      .sort((a, b) => a.label.localeCompare(b.label, locale));

    return [
      {
        // Searchable, which also picks the shape: a bordered checkbox list with
        // counts rather than a chip row, because an owner list is long.
        kind: "multiSelect",
        key: "owner",
        label: t("columns.owner"),
        searchable: true,
        searchPlaceholder: t("filters.ownerSearch"),
        options: ownerOptions,
        counts: ownerCounts,
      },
      {
        // Few enough to read as chips, which is how the design draws a short
        // multi-select.
        kind: "multiSelect",
        key: "category",
        label: t("columns.category"),
        options: categoryOptions,
        counts: categoryCounts,
      },
      {
        /*
          A real date range with 7/30/90-day presets, replacing a select of
          fixed age buckets. The buckets could only answer the four questions
          somebody had chosen in advance; the presets answer those **and** leave
          Custom for the rest. Nothing on the wire changes — `GET /api/properties`
          takes no date parameter either way, and both are client-side over
          `createdAt`.
        */
        kind: "dateRange",
        fromKey: "addedFrom",
        toKey: "addedTo",
        label: t("columns.createdAt"),
      },
      {
        // Real bounds instead of five fixed bands, for the same reason as the
        // dates. ⚠ The design draws a two-thumb slider beside these; the numbers
        // are the honest half of it and the slider is deferred — see the spec.
        kind: "numberRange",
        minKey: "areaMin",
        maxKey: "areaMax",
        label: t("filters.areaSqm"),
        hint: t("filters.areaSqmHint"),
      },
      /*
        The three the summary tiles set, as switches under one heading.

        **Two states each, not three** — and that is a different judgement from the
        owners table's `neverOrdered`, which stays a three-way select. There,
        `false` is a real question ("owners who HAVE ordered") and sending it is
        not the same as omitting it. Here each dimension **is** a defect: "only the
        ones with no photos". Its `false` would mean "only the ones with photos",
        which nobody asked for. Off clears the param.

        One `booleanGroup` rather than three `boolean` fields: three separate
        fields each took a grid cell with its own column heading, which spread a
        short list across the whole band. It also counts as **one** dimension in
        the Filters badge, which is what an admin reasons about.
      */
      {
        kind: "booleanGroup",
        label: t("summaryFilters.heading"),
        items: [
          { key: "noPhotos", label: t("summaryFilters.photosNone") },
          { key: "noArea", label: t("summaryFilters.areaMissing") },
          { key: "retired", label: t("summaryFilters.categoryRetired") },
        ],
      },
    ];
  }, [properties, ownerNames, locale, t]);

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

  /**
   * `name` is locked: a property row reduced to an owner and a category names
   * nothing an admin can act on.
   *
   * The old **`#` column is gone.** It printed the row's 1-based position, which
   * is not a fact about the property — it changed under every filter and would
   * now change under every sort as well, so it read as an id that was never one.
   */
  /**
   * The design's column set and widths.
   *
   * `name` is locked: a property row reduced to an owner and a category names
   * nothing an admin can act on.
   *
   * ⚠ **`#` is back**, and registered rather than hardcoded. It prints the row's
   * 1-based position, which is not a fact about the property — it moves under
   * every filter and every sort. It returns because the design draws it, and it
   * is a *column* because the design puts it behind a `rowNumbers` toggle: the
   * picker owns it, default on, exactly as drawn.
   */
  const columns = useMemo<DataColumn<PropertyDto>[]>(
    () => [
      {
        id: "index",
        label: "#",
        className: "w-[30px]",
        // The shell passes the row's 1-based position, offset by the page — the
        // only thing that reads `index`, and the only column that may.
        cell: (_p, i) => (
          <span className="font-mono text-[11px] text-muted-foreground/60">{i}</span>
        ),
      },
      {
        id: "name",
        label: t("columns.name"),
        locked: true,
        className: "min-w-[220px]",
        compare: (a, b) => a.name.localeCompare(b.name, locale),
        cell: (p) => (
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-8 flex-none items-center justify-center rounded-lg bg-accent text-primary">
              <Building2 className="size-4" />
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate font-medium leading-tight" title={p.name}>
                {p.name}
              </span>
              {/* Searchable without being its own column — it is how an admin
                  recognizes a property they only know by street. */}
              <span
                className="truncate text-[11px] text-muted-foreground"
                title={p.address}
              >
                {p.address}
              </span>
            </div>
          </div>
        ),
      },
      {
        id: "owner",
        label: t("columns.owner"),
        className: "w-[176px]",
        compare: (a, b) =>
          (ownerNames.get(a.bossOwnerUserId) ?? "").localeCompare(
            ownerNames.get(b.bossOwnerUserId) ?? "",
            locale,
          ),
        cell: (p) => {
          if (ownersPending) return <Skeleton className="h-4 w-24 rounded" />;
          const name = ownerNames.get(p.bossOwnerUserId);
          return (
            <div className="flex min-w-0 items-center gap-2">
              <Avatar className="size-6 flex-none">
                <AvatarFallback className="bg-accent text-[9px] font-semibold text-primary">
                  {initials(name)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-sm text-muted-foreground" title={name}>
                {name ?? "—"}
              </span>
            </div>
          );
        },
      },
      {
        id: "category",
        label: t("columns.category"),
        className: "w-[168px]",
        compare: (a, b) =>
          categoryName(a.category, locale).localeCompare(
            categoryName(b.category, locale),
            locale,
          ),
        cell: (p) => (
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
        ),
      },
      {
        id: "area",
        label: t("columns.area"),
        // Right-aligned and mono so the figures stack into one vertical line —
        // §08 · Table. The shell owns the alignment on both the header and the
        // cells, which is what the old hand-tuned `pr-26` was compensating for.
        align: "right",
        className: "w-[104px]",
        compare: (a, b) => compareNullable(a.areaSqm, b.areaSqm),
        cell: (p) => (
          <span className="font-mono text-sm text-muted-foreground">
            {formatArea(p.areaSqm, locale)}
          </span>
        ),
      },
      {
        id: "photos",
        label: t("columns.photos"),
        className: "w-[84px]",
        compare: (a, b) => photoCount(a) - photoCount(b),
        cell: (p) => {
          const n = photoCount(p);
          return (
            <span
              className={cn(
                "flex items-center gap-1.5 font-mono text-sm",
                // A gallery-less property is the strip's first tile. Amber here
                // too, so the row and the tile agree without a second legend.
                n === 0 ? "text-status-pending-deep" : "text-muted-foreground",
              )}
            >
              <Camera className="size-3.5" />
              {n}
            </span>
          );
        },
      },
      {
        id: "createdAt",
        label: t("columns.createdAt"),
        className: "w-[124px]",
        compare: (a, b) => a.createdAt.localeCompare(b.createdAt),
        cell: (p) => (
          <span className="font-mono text-sm text-muted-foreground">
            {formatDate(p.createdAt, locale)}
          </span>
        ),
      },
      {
        id: "go",
        label: "",
        className: "w-[24px]",
        cell: () => (
          <ChevronRight aria-hidden className="size-4 text-muted-foreground/50" />
        ),
      },
    ],
    [t, locale, ownerNames, ownersPending, categoryColors],
  );

  /**
   * The heading the design puts on the toolbar: the picked category's name when
   * one is chosen, otherwise the page's own. It says what you are looking at
   * rather than what the screen is called.
   */
  const heading = useMemo(() => {
    const code = state.filters.category;
    if (!code) return t("list");
    const match = properties.find((p) => p.category.code === code);
    return match ? categoryName(match.category, locale) : t("list");
  }, [state.filters.category, properties, locale, t]);

  const sortOptions = useMemo(
    () => [
      { value: "name:asc", label: t("sort.nameAsc") },
      { value: "name:desc", label: t("sort.nameDesc") },
      { value: "createdAt:desc", label: t("sort.newest") },
      { value: "createdAt:asc", label: t("sort.oldest") },
      { value: "area:desc", label: t("sort.areaDesc") },
      { value: "photos:asc", label: t("sort.photosAsc") },
    ],
    [t],
  );

  return (
    <div className="flex grow flex-col gap-5">
      {/* The page header, with the design's right-hand action group. Export CSV
          is deliberately absent: no export route exists anywhere in this API. */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-bold leading-tight tracking-tight">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex flex-none items-center gap-2">
          {/* Only for an admin who can actually restore — the count comes from a
              read the backend refuses them, so the link would lead to an empty
              screen it is not their place to see. */}
          {canRestore && (
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              className="gap-1.5"
              render={<Link href="/dashboard/properties/deleted" />}
            >
              <Trash2 className="size-4" />
              {t("deleted.link", { count: summary.inBin })}
            </Button>
          )}
          <Can permission="property:create_any">
            <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              {t("create.new")}
            </Button>
          </Can>
        </div>
      </div>

      <SummaryStrip
        summary={summary}
        isLoading={isLoading}
        active={state.filters}
        // A tile toggles its own key off when it is already on, so the strip can
        // clear what it set without reaching for the Clear button.
        onToggle={(key) =>
          state.setFilter(key, state.filters[key] === "true" ? "" : "true")
        }
        binHref={canRestore ? "/dashboard/properties/deleted" : undefined}
        onOpenBin={() => router.push("/dashboard/properties/deleted")}
      />

      <DataTable
        state={state}
        scope="properties"
        columns={columns}
        source={{
          mode: "client",
          rows: properties,
          isLoading,
          isError,
          isForbidden: isPermissionDenied(error),
          matches: (p, needle) =>
            looseIncludes(p.name, needle) ||
            looseIncludes(p.address, needle) ||
            looseIncludes(ownerNames.get(p.bossOwnerUserId), needle),
          filter: (p, values) =>
            matchesAny(values.owner, p.bossOwnerUserId) &&
            // The category **code**, not its localized name: a selected filter
            // must survive a language switch.
            matchesAny(values.category, p.category.code) &&
            withinDay(p.createdAt, values.addedFrom, values.addedTo) &&
            withinNumber(p.areaSqm, values.areaMin, values.areaMax) &&
            // The three defect switches, in the same bag as everything else.
            matchesSummaryFilter(p, values, activeCategoryCodes),
        }}
        rowKey={(p) => p.id}
        rowHref={(p) => `/dashboard/properties/${p.id}`}
        rowLabel={(p) => p.name}
        title={t("list")}
        // The design's own two-row toolbar, in place of the shell's three.
        toolbar={({ state: s, total, filtersTrigger, columnPicker }) => (
          <PropertiesToolbar
            state={s}
            total={properties.length}
            matched={total}
            heading={heading}
            filtersTrigger={filtersTrigger}
            columnPicker={columnPicker}
            sortOptions={sortOptions}
          />
        )}
        fields={fields}
        searchPlaceholder={t("searchPlaceholder")}
        empty={{ title: t("emptyTitle"), body: t("emptyBody") }}
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
