import { apiClient } from "@/lib/http/client";
import type {
  CreateProfessionRequest,
  ProfessionDto,
  UpdateProfessionRequest,
} from "@/lib/types/profession.types";

export const professionService = {
  /** Auth-any — every profession, ordered by name server-side. */
  list: async (): Promise<ProfessionDto[]> => {
    const { data } = await apiClient.get<ProfessionDto[]>("/api/professions");
    return data;
  },

  /** profession:create — 400 `code_exists` if the (upper-cased) code already exists. */
  create: async (body: CreateProfessionRequest): Promise<ProfessionDto> => {
    const { data } = await apiClient.post<ProfessionDto>(
      "/api/professions",
      body,
    );
    return data;
  },

  /** profession:update — Name/Description only (Code immutable); 404 if not found. */
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

  /** profession:delete — 400 `profession_in_use` if referenced by a worker/task group. */
  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/professions/${id}`);
  },
};
