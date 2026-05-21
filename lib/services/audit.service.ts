import { apiClient } from "@/lib/http/client";

export interface AuditLogEntryDto {
  id: string;
  actorId: string;
  actorFullName: string | null;
  action: string;
  targetEntity: string | null;
  targetId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AuditLogFilters {
  action?: string;
  targetEntity?: string;
  actorId?: string;
  fromUtc?: string;
  toUtc?: string;
}

export const auditService = {
  getAuditLog: async (filters?: AuditLogFilters): Promise<AuditLogEntryDto[]> => {
    const { data } = await apiClient.get<AuditLogEntryDto[]>("/api/admin/audit-log", {
      params: filters,
    });
    return data;
  },
};
