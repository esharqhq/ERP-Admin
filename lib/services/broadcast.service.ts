import { apiClient } from "@/lib/http/client";
import { idempotent, newIdempotencyKey } from "@/lib/http/idempotency";
import type { PagedResult } from "@/lib/types/paged.types";
import type {
  BroadcastAudiencePreviewDto,
  BroadcastAudiencePreviewRequest,
  BroadcastDetailDto,
  BroadcastRowDto,
  BroadcastStatus,
  CreateBroadcastRequest,
  UpdateBroadcastRequest,
} from "@/lib/types/broadcast.types";

export const broadcastService = {
  /**
   * `idempotencyKey` should be minted once per user-initiated attempt and
   * held by the caller (compose-form.tsx does this in form state) so a retry
   * of the same attempt replays instead of authoring a second broadcast.
   * Minting it in here on every call — the previous behaviour — gave every
   * retry, including a double-click, a fresh key, which meant the header
   * protected against nothing. Omitting it keeps that fallback for any other
   * call site that genuinely doesn't care.
   */
  create: async (
    body: CreateBroadcastRequest,
    idempotencyKey?: string,
  ): Promise<BroadcastDetailDto> => {
    const key = idempotencyKey ?? newIdempotencyKey();
    const { data } = await apiClient.post<BroadcastDetailDto>(
      "/api/broadcasts",
      body,
      idempotent(key),
    );
    return data;
  },

  previewAudience: async (
    body: BroadcastAudiencePreviewRequest,
  ): Promise<BroadcastAudiencePreviewDto> => {
    const { data } = await apiClient.post<BroadcastAudiencePreviewDto>(
      "/api/broadcasts/audience/preview",
      body,
    );
    return data;
  },

  list: async (params: {
    status?: BroadcastStatus;
    page?: number;
    pageSize?: number;
  } = {}): Promise<PagedResult<BroadcastRowDto>> => {
    const { data } = await apiClient.get<PagedResult<BroadcastRowDto>>(
      "/api/broadcasts",
      { params },
    );
    return data;
  },

  getById: async (id: string): Promise<BroadcastDetailDto> => {
    const { data } = await apiClient.get<BroadcastDetailDto>(`/api/broadcasts/${id}`);
    return data;
  },

  update: async (
    id: string,
    body: UpdateBroadcastRequest,
  ): Promise<BroadcastDetailDto> => {
    const { data } = await apiClient.put<BroadcastDetailDto>(`/api/broadcasts/${id}`, body);
    return data;
  },

  cancel: async (id: string): Promise<void> => {
    await apiClient.post(`/api/broadcasts/${id}/cancel`);
  },
};
