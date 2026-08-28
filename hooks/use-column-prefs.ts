"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useAuthStore } from "@/store/auth.store";
import {
  DEFAULT_PREFS,
  parsePrefs,
  reorderColumns,
  toggleColumn,
  type ColumnMeta,
  type ColumnPrefs,
  type TableDensity,
} from "@/lib/ui/table-prefs";

/**
 * Which columns a queue shows, in what order, at what density — per admin, per
 * queue, in `localStorage`.
 *
 * Deliberately **not** in the URL, where the tab, search, filters, sort and page
 * live (`use-table-url-state.ts`). Those describe *what the admin is looking at*
 * and belong in a shareable address; these describe *how they like to look*, and
 * carrying them along would mean pasting a queue to a colleague silently
 * rearranged their table.
 *
 * Scoped by admin id because a shared workstation is a real thing on an operations
 * floor, and one operator's hidden columns must not follow the next one in.
 */

const PREFIX = "uyer.table";

// ── The store ────────────────────────────────────────────────────────────────

const listeners = new Map<string, Set<() => void>>();

/**
 * `useSyncExternalStore` compares snapshots by identity and re-renders forever if
 * a new object comes back every call, so a fresh parse per read is not an option.
 * The last raw string is kept beside its parsed value and re-parsed only when the
 * string actually differs — which also makes a write from another tab land.
 */
const cache = new Map<string, { raw: string | null; value: ColumnPrefs }>();

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    // Private mode, a blocked origin, or storage disabled by policy. A table that
    // cannot remember its columns still has to draw them.
    return null;
  }
}

function snapshot(key: string): ColumnPrefs {
  const raw = read(key);
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value;
  const value = parsePrefs(raw);
  cache.set(key, { raw, value });
  return value;
}

function emit(key: string) {
  listeners.get(key)?.forEach((fn) => fn());
}

function subscribe(key: string, onChange: () => void) {
  let set = listeners.get(key);
  if (!set) listeners.set(key, (set = new Set()));
  set.add(onChange);

  // Another tab. `localStorage` fires `storage` only in *other* documents, which
  // is exactly why the same-tab write below has to emit for itself.
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === key) onChange();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    set!.delete(onChange);
    if (set!.size === 0) listeners.delete(key);
    window.removeEventListener("storage", onStorage);
  };
}

function persist(key: string, prefs: ColumnPrefs) {
  try {
    window.localStorage.setItem(key, JSON.stringify(prefs));
  } catch {
    // Quota, or storage disabled. The in-memory cache below still updates, so the
    // change holds for this session and is simply not remembered for the next.
  }
  cache.set(key, { raw: read(key), value: prefs });
  emit(key);
}

// ── The hook ─────────────────────────────────────────────────────────────────

export interface ColumnPrefsApi {
  prefs: ColumnPrefs;
  toggle: (id: string) => void;
  /** Drop `fromId` onto `toId`'s slot. Locked columns refuse both roles. */
  move: (fromId: string, toId: string) => void;
  setDensity: (density: TableDensity) => void;
  /** Back to the registry's own defaults. */
  reset: () => void;
}

export function useColumnPrefs(
  /** Stable identifier for this queue, e.g. `"owner-documents"`. */
  scope: string,
  registry: ColumnMeta[],
): ColumnPrefsApi {
  const adminId = useAuthStore((s) => s.adminMe?.id);
  const key = `${PREFIX}.${adminId ?? "anon"}.${scope}`;

  /**
   * `DEFAULT_PREFS` is the server snapshot — a constant, so the first client paint
   * matches the markup and React does not tear. The stored preferences arrive on
   * the pass after hydration, which costs one re-render of the header row and
   * never a mismatch.
   */
  const prefs = useSyncExternalStore(
    useCallback((onChange: () => void) => subscribe(key, onChange), [key]),
    useCallback(() => snapshot(key), [key]),
    () => DEFAULT_PREFS,
  );

  return useMemo(
    () => ({
      prefs,
      toggle: (id: string) => persist(key, toggleColumn(registry, prefs, id)),
      move: (fromId: string, toId: string) =>
        persist(key, reorderColumns(registry, prefs, fromId, toId)),
      setDensity: (density: TableDensity) => persist(key, { ...prefs, density }),
      reset: () => persist(key, DEFAULT_PREFS),
    }),
    [key, prefs, registry],
  );
}
