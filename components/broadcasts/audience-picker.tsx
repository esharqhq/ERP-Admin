"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Building2, Layers, SlidersHorizontal, Users, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkers } from "@/hooks/use-workers";
import { useOwners } from "@/hooks/use-owners";
import { useHasPermission } from "@/hooks/use-current-permissions";
import {
  ACCOUNT_STATUS_FILTERS,
  WORKER_STATUS_FILTERS,
  type AccountStatusFilter,
  type WorkerStatusFilter,
} from "@/lib/types/onboarding.types";
import type { BroadcastAudience, BroadcastCustomAudienceDto } from "@/lib/types/broadcast.types";
import { cn } from "@/lib/utils";

// Source of truth: assets/Uyer Admin Broadcasts.dc.html §06 (filled) and §07
// (empty/required state) and §08 (audience modes). 4-mode 2×2 grid, none
// preselected; Custom's nested "Pick people"/"Match a filter" sub-tabs.
//
// No purple token exists in globals.css's `--status-*` scale (active/pending
// /cancelled/info/verified — green, orange, red, blue, green; nothing
// violet), and globals.css:150-152 is explicit that even the raw brand ramp
// (let alone an unrelated Tailwind palette colour) must not be reached for
// directly — so, same call Phase 3a made for the Custom badge on the list
// page, the Custom panel below is a plain neutral card (border + muted
// backgrounds) rather than a substitute colour standing in for the design's
// purple.

const AUDIENCE_MODES: { value: BroadcastAudience; icon: typeof Users }[] = [
  { value: "Workers", icon: Users },
  { value: "Owners", icon: Building2 },
  { value: "Both", icon: Layers },
  { value: "Custom", icon: SlidersHorizontal },
];

const CUSTOM_PICK_CAP = 10_000;
const CHIP_VISIBLE_COUNT = 5;

interface PickedPerson {
  id: string;
  kind: "worker" | "owner";
  label: string;
}

/**
 * Prefilled ids (edit/recreate) carry no label from `BroadcastCustomAudienceDto`
 * — it stores ids only. Resolving real names for a prefilled selection is
 * commit 6's job (it's the first commit with anything to prefill from); until
 * then a prefilled chip falls back to a shortened id.
 */
function seedPicked(selection: BroadcastCustomAudienceDto | null): PickedPerson[] {
  const workers = (selection?.workerIds ?? []).map((id) => ({
    id,
    kind: "worker" as const,
    label: id.slice(0, 8),
  }));
  const owners = (selection?.ownerIds ?? []).map((id) => ({
    id,
    kind: "owner" as const,
    label: id.slice(0, 8),
  }));
  return [...workers, ...owners];
}

interface WorkerFilterState {
  search?: string;
  status?: WorkerStatusFilter;
}
interface OwnerFilterState {
  search?: string;
  status?: AccountStatusFilter;
}

function buildSelection(
  picked: PickedPerson[],
  workerFilter: WorkerFilterState,
  ownerFilter: OwnerFilterState,
): BroadcastCustomAudienceDto | null {
  const workerIds = picked.filter((p) => p.kind === "worker").map((p) => p.id);
  const ownerIds = picked.filter((p) => p.kind === "owner").map((p) => p.id);
  const wf = workerFilter.search?.trim() || workerFilter.status ? workerFilter : undefined;
  const of = ownerFilter.search?.trim() || ownerFilter.status ? ownerFilter : undefined;

  const next: BroadcastCustomAudienceDto = {};
  if (workerIds.length) next.workerIds = workerIds;
  if (ownerIds.length) next.ownerIds = ownerIds;
  if (wf) next.workerFilter = wf;
  if (of) next.ownerFilter = of;
  return Object.keys(next).length ? next : null;
}

export interface AudiencePickerProps {
  audience: BroadcastAudience | null;
  selection: BroadcastCustomAudienceDto | null;
  onAudienceChange: (audience: BroadcastAudience) => void;
  onSelectionChange: (selection: BroadcastCustomAudienceDto | null) => void;
}

export function AudiencePicker({
  audience,
  selection,
  onAudienceChange,
  onSelectionChange,
}: AudiencePickerProps) {
  const t = useTranslations("broadcasts.compose.audience");
  const tAudience = useTranslations("broadcasts.audienceLabels");

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {t("label")} <span className="text-destructive">*</span>
      </span>

      <div className="grid grid-cols-2 gap-1.5">
        {AUDIENCE_MODES.map(({ value, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => onAudienceChange(value)}
            className={cn(
              "flex h-[38px] items-center gap-2 rounded-lg px-2.5 text-sm font-medium ring-1 ring-inset transition-colors",
              audience === value
                ? "bg-primary text-primary-foreground ring-primary"
                : "text-foreground ring-border hover:bg-muted",
            )}
          >
            <Icon className="size-4" />
            {tAudience(value)}
          </button>
        ))}
      </div>

      {audience === null && (
        <p className="text-xs leading-relaxed text-muted-foreground text-pretty">
          {t("noneSelectedNote")}
        </p>
      )}

      {audience === "Custom" && (
        <CustomAudiencePanel selection={selection} onSelectionChange={onSelectionChange} />
      )}
    </div>
  );
}

function CustomAudiencePanel({
  selection,
  onSelectionChange,
}: {
  selection: BroadcastCustomAudienceDto | null;
  onSelectionChange: (selection: BroadcastCustomAudienceDto | null) => void;
}) {
  const t = useTranslations("broadcasts.compose.audience");
  const [subMode, setSubMode] = useState<"pick" | "filter">("pick");

  const [picked, setPicked] = useState<PickedPerson[]>(() => seedPicked(selection));
  const [workerFilter, setWorkerFilter] = useState<WorkerFilterState>(
    () => selection?.workerFilter ?? {},
  );
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilterState>(
    () => selection?.ownerFilter ?? {},
  );

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  const canListWorkers = useHasPermission("worker:list");
  const canListOwners = useHasPermission("owner:list");
  const searchActive = debouncedSearch.trim().length > 0;

  const workersQuery = useWorkers(
    { search: debouncedSearch, pageSize: 8 },
    searchActive && canListWorkers,
  );
  const ownersQuery = useOwners(
    { search: debouncedSearch, pageSize: 8 },
    searchActive && canListOwners,
  );

  const pickedIds = useMemo(() => new Set(picked.map((p) => p.id)), [picked]);
  const atCap = picked.length >= CUSTOM_PICK_CAP;

  const results = useMemo<PickedPerson[]>(() => {
    const workers = (workersQuery.data?.items ?? []).map((w) => ({
      id: w.id,
      kind: "worker" as const,
      label: w.fullName ?? w.email ?? w.id.slice(0, 8),
    }));
    const owners = (ownersQuery.data?.items ?? []).map((o) => ({
      id: o.id,
      kind: "owner" as const,
      label: o.fullName || o.email || o.id.slice(0, 8),
    }));
    return [...workers, ...owners].filter((p) => !pickedIds.has(p.id));
  }, [workersQuery.data, ownersQuery.data, pickedIds]);

  const addPerson = (person: PickedPerson) => {
    if (atCap) return;
    const next = [...picked, person];
    setPicked(next);
    setSearch("");
    onSelectionChange(buildSelection(next, workerFilter, ownerFilter));
  };

  const removePerson = (id: string) => {
    const next = picked.filter((p) => p.id !== id);
    setPicked(next);
    onSelectionChange(buildSelection(next, workerFilter, ownerFilter));
  };

  const updateWorkerFilter = (patch: Partial<WorkerFilterState>) => {
    const next = { ...workerFilter, ...patch };
    setWorkerFilter(next);
    onSelectionChange(buildSelection(picked, next, ownerFilter));
  };

  const updateOwnerFilter = (patch: Partial<OwnerFilterState>) => {
    const next = { ...ownerFilter, ...patch };
    setOwnerFilter(next);
    onSelectionChange(buildSelection(picked, workerFilter, next));
  };

  const visibleChips = picked.slice(0, CHIP_VISIBLE_COUNT);
  const overflowCount = picked.length - visibleChips.length;
  const noSearchAccess = !canListWorkers && !canListOwners;

  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex items-center gap-2">
        <div className="flex gap-1 rounded-md bg-muted p-0.5">
          <button
            type="button"
            onClick={() => setSubMode("pick")}
            className={cn(
              "rounded px-2.5 py-1 text-xs font-medium transition-colors",
              subMode === "pick"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t("pickPeopleTab")}
          </button>
          <button
            type="button"
            onClick={() => setSubMode("filter")}
            className={cn(
              "rounded px-2.5 py-1 text-xs font-medium transition-colors",
              subMode === "filter"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t("matchFilterTab")}
          </button>
        </div>
        <div className="flex-1" />
        <span
          className={cn(
            "font-mono text-[11px] font-semibold",
            atCap ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {t("capCounter", { count: picked.length })}
        </span>
      </div>

      {subMode === "pick" ? (
        <div className="flex flex-col gap-2.5">
          {noSearchAccess ? (
            <p className="text-xs text-destructive">
              {t("noSearchAccessWorkers")} {t("noSearchAccessOwners")}
            </p>
          ) : (
            <>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="h-9"
                disabled={atCap}
              />
              {atCap && <p className="text-xs text-destructive">{t("capReached")}</p>}
              {searchActive && (
                <div className="flex max-h-40 flex-col gap-0.5 overflow-y-auto rounded-lg border border-border bg-background p-1">
                  {workersQuery.isFetching || ownersQuery.isFetching ? (
                    <span className="px-2 py-1.5 text-xs text-muted-foreground">
                      {t("searching")}
                    </span>
                  ) : results.length === 0 ? (
                    <span className="px-2 py-1.5 text-xs text-muted-foreground">
                      {t("noResults")}
                    </span>
                  ) : (
                    results.map((r) => (
                      <button
                        key={`${r.kind}:${r.id}`}
                        type="button"
                        onClick={() => addPerson(r)}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted"
                      >
                        <span className="truncate">{r.label}</span>
                        <span className="ml-auto flex-none text-[10px] font-medium text-muted-foreground">
                          {r.kind === "worker" ? t("workerBadge") : t("ownerBadge")}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </>
          )}

          <div className="flex flex-wrap gap-1.5">
            {visibleChips.map((p) => (
              <span
                key={p.id}
                className="flex h-[26px] max-w-full items-center gap-1.5 rounded-full bg-background px-2.5 text-xs ring-1 ring-inset ring-border"
              >
                <span className="max-w-[140px] truncate">{p.label}</span>
                <button
                  type="button"
                  onClick={() => removePerson(p.id)}
                  className="flex size-4 flex-none items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground"
                >
                  <X className="size-2.5" />
                </button>
              </span>
            ))}
            {overflowCount > 0 && (
              <span className="flex h-[26px] items-center rounded-full bg-muted px-2.5 text-xs font-semibold text-muted-foreground">
                {t("overflowChip", { count: overflowCount })}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-background p-2.5">
            <span className="text-xs font-semibold text-foreground">{t("workerFilterLabel")}</span>
            <Input
              value={workerFilter.search ?? ""}
              onChange={(e) => updateWorkerFilter({ search: e.target.value || undefined })}
              placeholder={t("filterSearchPlaceholder")}
              className="h-8 text-xs"
            />
            <Select
              value={workerFilter.status ?? "any"}
              onValueChange={(v) =>
                updateWorkerFilter({ status: v === "any" ? undefined : (v as WorkerStatusFilter) })
              }
              items={[
                { value: "any", label: t("filterStatusAny") },
                ...WORKER_STATUS_FILTERS.map((s) => ({ value: s, label: s })),
              ]}
            >
              <SelectTrigger size="sm" className="w-full">
                <SelectValue placeholder={t("filterStatusLabel")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">{t("filterStatusAny")}</SelectItem>
                {WORKER_STATUS_FILTERS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2 rounded-lg border border-border bg-background p-2.5">
            <span className="text-xs font-semibold text-foreground">{t("ownerFilterLabel")}</span>
            <Input
              value={ownerFilter.search ?? ""}
              onChange={(e) => updateOwnerFilter({ search: e.target.value || undefined })}
              placeholder={t("filterSearchPlaceholder")}
              className="h-8 text-xs"
            />
            <Select
              value={ownerFilter.status ?? "any"}
              onValueChange={(v) =>
                updateOwnerFilter({ status: v === "any" ? undefined : (v as AccountStatusFilter) })
              }
              items={[
                { value: "any", label: t("filterStatusAny") },
                ...ACCOUNT_STATUS_FILTERS.map((s) => ({ value: s, label: s })),
              ]}
            >
              <SelectTrigger size="sm" className="w-full">
                <SelectValue placeholder={t("filterStatusLabel")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">{t("filterStatusAny")}</SelectItem>
                {ACCOUNT_STATUS_FILTERS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-muted-foreground">{t("filterPreviewNote")}</p>
        </div>
      )}

      <div className="flex items-start gap-1.5 border-t border-border pt-2">
        <span className="text-[11px] leading-relaxed text-muted-foreground text-pretty">
          {t("freezeNote")}
        </span>
      </div>
    </div>
  );
}
