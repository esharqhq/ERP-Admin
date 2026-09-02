import { apiClient } from "@/lib/http/client";
import type {
  CreateProfessionRequest,
  ProfessionDto,
  UpdateProfessionRequest,
} from "@/lib/types/profession.types";

export const professionService = {
  /**
   * Auth-any, no permission. A bare array, ordered by `nameEn` ascending — **not**
   * by code and not by creation date, so a German screen sorts by the English name
   * unless it re-sorts itself.
   *
   * `includeInactive` is honoured **only for callers holding `profession:update`**;
   * for anyone else it is silently ignored and the active list comes back, which is
   * the safe direction.
   */
  list: async (includeInactive = false): Promise<ProfessionDto[]> => {
    const { data } = await apiClient.get<ProfessionDto[]>("/api/professions", {
      params: includeInactive ? { includeInactive: true } : undefined,
    });
    return data;
  },

  /** profession:create — 400 `code_exists` if the (upper-cased) code already exists. */
  create: async (body: CreateProfessionRequest): Promise<ProfessionDto> => {
    const { data } = await apiClient.post<ProfessionDto>("/api/professions", body);
    return data;
  },

  /**
   * profession:update — names, description and `isActive`. `code` is immutable.
   *
   * ⚠ This is also the **deactivate** door: `{ isActive: false }` is what replaced
   * `DELETE`. Deactivating `GENERAL` is `400 profession_protected`.
   */
  update: async (
    id: string,
    body: UpdateProfessionRequest,
  ): Promise<ProfessionDto> => {
    const { data } = await apiClient.put<ProfessionDto>(
      `/api/professions/${id}`,
      body,
    );
    return data;
  },
};
