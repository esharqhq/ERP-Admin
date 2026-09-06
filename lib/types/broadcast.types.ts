// Source of truth:
//   - Backend/docs/handoff/CHANGELOG.md (2026-08-31)
//   - Backend/index/dtos/notifications.md
//   - Backend/GermanyERP.Domain/Models/Notifications/Broadcast.cs (enums)
//
// Note: Backend/docs/handoff/f-01-a-broadcast-core.md §5.2 lists 11/16
// keys without namedCount. That table is stale per its own CHANGELOG
// entry. Filed upstream as B15.
//
// If this file disagrees with a live response, the live response wins —
// fix at the source, do not patch here.

import type { WorkerListQuery } from "@/lib/types/worker.types";
import type { OwnerListQuery } from "@/lib/types/owner.types";

export type BroadcastAudience = "Workers" | "Owners" | "Both" | "Custom";

export type BroadcastStatus =
  | "Scheduled"
  | "Sending"
  | "Sent"
  | "Cancelled"
  | "Missed";

export interface BroadcastCustomAudienceDto {
  workerIds?: string[];
  ownerIds?: string[];
  workerFilter?: WorkerListQuery;
  ownerFilter?: OwnerListQuery;
}

export interface CreateBroadcastRequest {
  titleDe: string;
  bodyDe: string;
  titleEn: string;
  bodyEn: string;
  audience: BroadcastAudience | null;
  scheduledAtUtc?: string;
  imageStorageKey?: string;
  selection?: BroadcastCustomAudienceDto;
}

export type UpdateBroadcastRequest = CreateBroadcastRequest;

export interface BroadcastRowDto {
  id: string;
  titleDe: string;
  titleEn: string;
  audience: BroadcastAudience;
  status: BroadcastStatus;
  scheduledAtUtc: string | null;
  completedAtUtc: string | null;
  recipientCount: number;
  failedCount: number;
  namedCount: number | null;
  hasImage: boolean;
  createdAt: string;
}

export interface BroadcastDetailDto {
  id: string;
  titleDe: string;
  bodyDe: string;
  titleEn: string;
  bodyEn: string;
  imageUrl: string | null;
  audience: BroadcastAudience;
  status: BroadcastStatus;
  scheduledAtUtc: string | null;
  startedAtUtc: string | null;
  completedAtUtc: string | null;
  recipientCount: number;
  failedCount: number;
  namedCount: number | null;
  readCount: number;
  createdByAdminId: string;
  createdAt: string;
}

export interface BroadcastAudiencePreviewRequest {
  audience: BroadcastAudience;
  selection?: BroadcastCustomAudienceDto;
}

export interface BroadcastAudiencePreviewDto {
  namedCount: number;
  eligibleCount: number;
}
