// components/admins/admin-access-section.tsx
"use client";

import { useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissionCatalog } from "@/hooks/use-permissions";
import type { PermissionCatalogDto } from "@/lib/services/permission.service";

interface Props {
  /** Human label of the admin's current preset/role. */
  presetLabel: string;
  /** Effective granted permission codes. */
  permissionNames: string[];
}

/** PascalCase enum value → spaced label ("TaskGroup" → "Task Group"). */
function humanizeDomain(domain: string): string {
  return domain.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
}

/**
 * Read-only inline view of an admin's effective permissions, grouped by
 * domain. Replaces the old RolePermissionsDialog on the detail page so the
 * current access is always visible without opening anything.
 */
export function AdminAccessSection({ presetLabel, permissionNames }: Props) {
  const t = useTranslations("admins");
  const tPerms = useTranslations("rolePermissions");
  const locale = useLocale();
  const { data: catalog, isLoading } = usePermissionCatalog();

  const describe = (p: PermissionCatalogDto): string | null =>
    (locale.startsWith("de") ? p.descriptionDe || p.description : p.description) ?? null;

  const groups = useMemo(() => {
    const granted = new Set(permissionNames);
    const byDomain = new Map<string, { code: string; label: string | null }[]>();

    if (catalog?.length) {
      for (const p of catalog) {
        if (!granted.has(p.name)) continue;
        const arr = byDomain.get(p.domain) ?? [];
        arr.push({ code: p.name, label: describe(p) });
        byDomain.set(p.domain, arr);
        granted.delete(p.name);
      }
    }
    // Codes the catalog doesn't know (or the whole set, if catalog unreadable).
    if (granted.size > 0) {
      byDomain.set(
        "__other__",
        Array.from(granted).map((code) => ({ code, label: null })),
      );
    }
    return Array.from(byDomain.entries());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, permissionNames, locale]);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">{t("detail.accessSection")}</p>
          <Badge variant="secondary" className="gap-1">
            <ShieldCheck className="size-3" />
            {presetLabel}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {tPerms("count", { count: permissionNames.length })}
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded-lg" />
            ))}
          </div>
        ) : permissionNames.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{tPerms("empty")}</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {groups.map(([domain, perms]) => (
              <div key={domain} className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  {domain === "__other__" ? tPerms("otherDomain") : humanizeDomain(domain)}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {perms.map((perm) => (
                    <span
                      key={perm.code}
                      title={perm.code}
                      className="rounded-md border border-border bg-accent/30 px-2 py-0.5 text-[11px]"
                    >
                      {perm.label ?? perm.code}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
