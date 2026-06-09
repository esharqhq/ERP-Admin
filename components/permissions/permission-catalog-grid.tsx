// components/permissions/permission-catalog-grid.tsx
"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
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
 * Permission selector driven by the live backend registry (GET /api/admin/permissions),
 * grouped by domain. Covers all 143 permissions (the old hardcoded list covered ~50).
 * Labels use the backend `description` (English-only — see permissions backend ask).
 */
export function PermissionCatalogGrid({ selected, onChange, disabled }: Props) {
  const t = useTranslations("permissions");
  const { data: catalog, isLoading, isError } = usePermissionCatalog();
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = (catalog ?? []).filter((p) => {
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.description?.toLowerCase().includes(q) ?? false) ||
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
        groups.map(([domain, perms]) => {
          const allOn = perms.every((p) => selected.has(p.name));
          return (
            <div key={domain} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  {humanizeDomain(domain)}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[11px]"
                  disabled={disabled}
                  onClick={() => toggleDomain(perms, allOn)}
                >
                  {allOn ? t("clearAll") : t("selectAll")}
                </Button>
              </div>
              <div className="flex flex-col divide-y divide-border rounded-xl border border-border px-3">
                {perms.map((perm) => (
                  <div key={perm.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm">{perm.description || perm.name}</span>
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
          );
        })
      )}
    </div>
  );
}
