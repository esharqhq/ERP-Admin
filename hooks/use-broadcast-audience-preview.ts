"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { broadcastService } from "@/lib/services/broadcast.service";
import type {
  BroadcastAudience,
  BroadcastAudiencePreviewRequest,
  BroadcastCustomAudienceDto,
} from "@/lib/types/broadcast.types";

/**
 * Debounced so a run of quick selection changes (adding several people in
 * Custom's Pick-people mode, or typing in Match-a-filter's search box)
 * collapses into one call — design decision #10/#04: "fires on selection
 * change, not on every keystroke." Audience itself isn't debounced: picking
 * one of the four mode buttons is already a single discrete click, not a
 * keystroke stream.
 */
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

/**
 * `GET`-free preview (`POST /api/broadcasts/audience/preview`) of how many
 * people a chosen audience reaches. Two rejections this hook must never
 * trigger by construction, both documented in
 * f-01-a-broadcast-core.md §8:
 *
 * - `broadcast_selection_not_allowed` — sending a `selection` alongside
 *   `Workers`/`Owners`/`Both`. So only `Custom` ever includes one.
 * - `broadcast_selection_required` — `Custom` with an empty selection. So
 *   the call is skipped entirely (not sent with `selection: undefined`)
 *   whenever `audience === null` or (`audience === "Custom"` and nothing has
 *   been named or filtered yet) — that state renders the design's own "Pick
 *   an audience to see the reach" panel (§07) instead of an error.
 *
 * B22 ("the plain eligible count for Workers/Owners/Both before anything is
 * picked would take three preview calls") does not apply here: this hook
 * makes exactly one call, on the audience actually chosen. For Workers,
 * Owners and Both, `namedCount` and `eligibleCount` come back equal (§5.1b),
 * so one call already answers what B22 was asking to get more cheaply — the
 * ask is about a hypothetical *all-three-counts-before-picking* screen this
 * phase does not build.
 */
export function useBroadcastAudiencePreview(
  audience: BroadcastAudience | null,
  selection: BroadcastCustomAudienceDto | null,
) {
  const debouncedSelection = useDebouncedValue(selection, 300);

  const request: BroadcastAudiencePreviewRequest | null =
    audience === null
      ? null
      : audience === "Custom"
        ? debouncedSelection === null
          ? null
          : { audience: "Custom", selection: debouncedSelection }
        : { audience };

  return useQuery({
    queryKey: ["broadcast-audience-preview", request],
    queryFn: () => broadcastService.previewAudience(request as BroadcastAudiencePreviewRequest),
    enabled: request !== null,
  });
}
