// components/roles/role-history-dialog.tsx
"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight, MinusCircle, PlusCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuditLog } from "@/hooks/use-audit";
import { usePermissionCatalog } from "@/hooks/use-permissions";
import type { AuditLogEntryDto } from "@/lib/services/audit.service";
import type { RoleDto } from "@/lib/types/admin-user.types";

interface Props {
  open: boolean;
  onClose: () => void;
  role: RoleDto;
}

const PERMISSION_ACTIONS = new Set([
  "ROLE_PERMISSION_ADDED",
  "ROLE_PERMISSION_REMOVED",
]);

/**
 * Backend Metadata is a raw nullable JSON string with no fixed contract — try
 * the likely keys for the permission code, else fall back to the raw payload.
 */
function extractPermission(metadata: string | null): string | null {
  if (!metadata) return null;
  try {
    const parsed: unknown = JSON.parse(metadata);
    if (typeof parsed === "string") return parsed;
    if (parsed && typeof parsed === "object") {
      const obj = parsed as Record<string, unknown>;
      for (const key of ["permissionName", "permission", "name", "code"]) {
        if (typeof obj[key] === "string") return obj[key] as string;
      }
    }
    return metadata;
  } catch {
    return metadata;
  }
}

function shortId(id: string | null) {
  if (!id) return "—";
  return id.slice(0, 8) + "…";
}

/**
 * Timeline of ROLE_PERMISSION_ADDED/REMOVED audit entries for one role — "who
 * granted/revoked what, when". Requires `system:audit:read` (the opener button
 * is gated with <Can>); the audit endpoint enforces it server-side regardless.
 */
export function RoleHistoryDialog({ open, onClose, role }: Props) {
  const t = useTranslations("roles.history");
  const locale = useLocale();

  const { data: logs, isLoading, isError } = useAuditLog({
    targetEntity: "Role",
    targetId: role.id,
  });
  const { data: catalog } = usePermissionCatalog();

  const entries = useMemo(() => {
    const byNewest = (a: AuditLogEntryDto, b: AuditLogEntryDto) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return (logs ?? []).filter((l) => PERMISSION_ACTIONS.has(l.action)).sort(byNewest);
  }, [logs]);

  const describe = (code: string | null): string | null => {
    if (!code || !catalog) return null;
    const p = catalog.find((c) => c.name === code);
    if (!p) return null;
    return (locale.startsWith("de") ? p.descriptionDe || p.description : p.description) ?? null;
  };

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString(locale, {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex max-h-[85vh] w-full sm:max-w-xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border px-6 pt-6 pb-4">
          <DialogTitle>{t("title", { name: role.name })}</DialogTitle>
          <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : isError ? (
            <p className="py-8 text-center text-sm text-destructive">{t("error")}</p>
          ) : entries.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <div className="flex flex-col divide-y divide-border rounded-xl border border-border px-3">
              {entries.map((entry) => {
                const added = entry.action === "ROLE_PERMISSION_ADDED";
                const permission = extractPermission(entry.metadata);
                const label = describe(permission);
                return (
                  <div key={entry.id} className="flex items-start gap-3 py-3">
                    {added ? (
                      <PlusCircle className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                    ) : (
                      <MinusCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                    )}
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={added ? "default" : "destructive"} className="text-[10px]">
                          {added ? t("added") : t("removed")}
                        </Badge>
                        {permission ? (
                          <span className="truncate font-mono text-xs">{permission}</span>
                        ) : null}
                      </div>
                      {label ? (
                        <span className="truncate text-xs text-muted-foreground">{label}</span>
                      ) : null}
                      <span className="text-[11px] text-muted-foreground">
                        {formatDate(entry.createdAt)}
                        {" · "}
                        {t("actor", { actor: `${entry.actorType} ${shortId(entry.actorId)}` })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-border px-6 py-3">
          <Link
            href="/dashboard/settings/audit"
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("openAudit")}
            <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
