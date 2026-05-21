"use client";

import { useQuery } from "@tanstack/react-query";
import { auditService } from "@/lib/services/audit.service";
import type { AuditLogFilters } from "@/lib/services/audit.service";

export function useAuditLog(filters?: AuditLogFilters) {
  return useQuery({
    queryKey: ["audit-log", filters],
    queryFn: () => auditService.getAuditLog(filters),
  });
}
