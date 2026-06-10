import { apiClient } from "@/lib/http/client";

// Mirrors AuditLogEntryDto as PROJECTED by AdminController.GetAuditLog:
// new AuditLogEntryDto(Id, ActorId, ActorType.ToString(), Action.ToString(),
//                      TargetEntity, TargetId, Metadata, CreatedAt).
// NOTE: the backend sends actorType (the actor's user-type string), NOT a full
// name, and Metadata is a nullable raw string — not an object.
export interface AuditLogEntryDto {
  id: string;
  actorId: string;
  actorType: string;
  action: string;
  targetEntity: string;
  targetId: string;
  metadata: string | null;
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
