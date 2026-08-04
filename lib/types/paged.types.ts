import type { SortDir } from "@/lib/types/onboarding.types";

/**
 * FND-3 paged envelope. A deliberate, documented exception to this API's
 * "no envelope" rule, scoped to the admin owner/worker tables and their exports.
 */
export interface PagedResult<T> {
  items: T[] | null;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PagedQuery {
  /** 1-based; the server clamps to >= 1. */
  page?: number;
  /** The server clamps to [1,100] silently — 500 becomes 100, not an error. */
  pageSize?: number;
  /** Per-table whitelist; anything else is `400 invalid_sort_column`. */
  sortBy?: string;
  dir?: SortDir;
}

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

/** Empty envelope for `useQuery` placeholders so consumers never see `undefined.items`. */
export function emptyPage<T>(pageSize = DEFAULT_PAGE_SIZE): PagedResult<T> {
  return { items: [], total: 0, page: 1, pageSize, totalPages: 0 };
}
