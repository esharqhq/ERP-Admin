// components/permissions/permission-catalog-grid.tsx
"use client";

import { useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Search } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { usePermissionCatalog } from "@/hooks/use-permissions";
import type { PermissionCatalogDto } from "@/lib/services/permission.service";

interface Props {
  selected: Set<string>;
  onChange: (updated: Set<string>) => void;
  disabled?: boolean;
}

/** PascalCase enum value → spaced label ("TaskGroup" → "Task Group"). */
function humanizeDomain(domain: string): string {
  return domain.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
}

/**
 * Permission selector driven by the live backend registry (GET /api/admin/permissions).
 * Domains are shown as a tab bar; selecting a tab reveals only that domain's
 * permissions below, so the list stays short instead of one long scroll.
 * Search narrows which tabs appear. Labels use the locale-appropriate backend
 * description (EN `description` / DE `descriptionDe`), falling back to the raw code.
 */
export function PermissionCatalogGrid({ selected, onChange, disabled }: Props) {
  const t = useTranslations("permissions");
  const locale = useLocale();
  const { data: catalog, isLoading, isError } = usePermissionCatalog();
  const [query, setQuery] = useState("");
  const [activeDomain, setActiveDomain] = useState<string | null>(null);

  /** Locale-appropriate description; falls back to EN, then nothing. */
  const describe = (p: PermissionCatalogDto): string | null =>
    (locale.startsWith("de") ? p.descriptionDe || p.description : p.description) ?? null;

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = (catalog ?? []).filter((p) => {
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.description?.toLowerCase().includes(q) ?? false) ||
        (p.descriptionDe?.toLowerCase().includes(q) ?? false) ||
        p.domain.toLowerCase().includes(q)
      );
    });
    const byDomain = new Map<string, PermissionCatalogDto[]>();
    for (const p of filtered) {
      const arr = byDomain.get(p.domain) ?? [];
      arr.push(p);
      byDomain.set(p.domain, arr);
    }
    return Array.from(byDomain.entries());
  }, [catalog, query]);

  // Active tab: keep the user's choice while it still has matches, else fall
  // back to the first available domain (handles search narrowing the list).
  const domains = groups.map(([d]) => d);
  const active =
    activeDomain && domains.includes(activeDomain) ? activeDomain : domains[0] ?? null;
  const activePerms = groups.find(([d]) => d === active)?.[1] ?? [];
  const activeAllOn =
    activePerms.length > 0 && activePerms.every((p) => selected.has(p.name));

  function toggle(name: string) {
    const next = new Set(selected);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    onChange(next);
  }

  function toggleDomain(perms: PermissionCatalogDto[], allOn: boolean) {
    const next = new Set(selected);
    for (const p of perms) {
      if (allOn) next.delete(p.name);
      else next.add(p.name);
    }
    onChange(next);
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <p className="text-sm text-destructive">{t("catalogError")}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="pl-9"
        />
      </div>

      {groups.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{t("noMatches")}</p>
      ) : (
        <>
          <div
            role="tablist"
            className="flex flex-row flex-nowrap gap-1 overflow-x-auto border-b border-border pb-px"
          >
            {groups.map(([domain, perms]) => {
              const count = perms.filter((p) => selected.has(p.name)).length;
              const isActive = domain === active;
              return (
                <button
                  key={domain}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveDomain(domain)}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium uppercase tracking-[0.06em] transition-colors",
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {humanizeDomain(domain)}
                  {count > 0 && (
                    <Badge
                      variant={isActive ? "default" : "secondary"}
                      className="h-4 min-w-4 justify-center px-1 text-[10px] tabular-nums"
                    >
                      {count}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>

          {active && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  {humanizeDomain(active)}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[11px]"
                  disabled={disabled}
                  onClick={() => toggleDomain(activePerms, activeAllOn)}
                >
                  {activeAllOn ? t("clearAll") : t("selectAll")}
                </Button>
              </div>
              <div className="flex flex-col divide-y divide-border rounded-xl border border-border px-3">
                {activePerms.map((perm) => (
                  <div key={perm.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm">{describe(perm) || perm.name}</span>
                      <span className="truncate font-mono text-[10px] text-muted-foreground">
                        {perm.name}
                      </span>
                    </div>
                    <Switch
                      checked={selected.has(perm.name)}
                      disabled={disabled}
                      onCheckedChange={() => toggle(perm.name)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
