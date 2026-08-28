/**
 * Column visibility, order and density for one table — the part that is pure.
 *
 * These preferences live in `localStorage`, which means they are **older than the
 * code reading them**. An admin who set a queue up in August opens it in November
 * against a registry that has gained a column, lost one, and locked a third. Every
 * function here is written for that: a stored id the registry no longer has is
 * dropped, a registry column the stored order predates appears at the position the
 * registry gives it, and a locked column obeys the registry no matter what is on
 * disk.
 *
 * Kept apart from the React hook so all of that is testable without a DOM.
 */

export type TableDensity = "comfortable" | "compact";

/** The registry facts these functions need. Real columns carry a cell renderer too. */
export interface ColumnMeta {
  id: string;
  /**
   * Carries row identity — the subject and its stage. Never hidden and never
   * reordered; the picker still lists it, greyed, with a lock, so an admin
   * looking for it does not think it is missing.
   */
  locked?: boolean;
  /** Off until the admin asks for it. Defaults to `true`. */
  defaultVisible?: boolean;
}

/**
 * What is stored, and why it is two sets rather than one.
 *
 * A single `hidden` list cannot express "the admin switched on a column that ships
 * off by default", and a single `visible` list cannot express "a column shipped
 * after this was saved" — it would arrive hidden even if it defaults on. Storing
 * both deltas leaves the registry default in charge of every column the admin has
 * never touched, which is the only way a new column behaves as designed for
 * everyone.
 */
export interface ColumnPrefs {
  /** Unlocked column ids in the admin's chosen order. */
  order: string[];
  /** Switched on against a registry default of off. */
  shown: string[];
  /** Switched off against a registry default of on. */
  hidden: string[];
  density: TableDensity;
}

export const DEFAULT_PREFS: ColumnPrefs = {
  order: [],
  shown: [],
  hidden: [],
  density: "comfortable",
};

/**
 * The registry, permuted **only among unlocked columns**.
 *
 * A locked column keeps its registry index exactly. The unlocked ones are poured
 * back into the slots the registry left them, in the admin's order — so moving
 * "Waiting" ahead of "Files" cannot displace "Subject", whatever the stored order
 * claims.
 */
export function resolveOrder<C extends ColumnMeta>(
  registry: C[],
  order: string[],
): C[] {
  const unlocked = registry.filter((c) => !c.locked).map((c) => c.id);
  const known = new Set(unlocked);

  // Stored first, de-duplicated, ignoring ids the registry no longer has.
  const seen = new Set<string>();
  const arranged: string[] = [];
  for (const id of order) {
    if (!known.has(id) || seen.has(id)) continue;
    arranged.push(id);
    seen.add(id);
  }

  /**
   * Then anything the stored order predates, at the index the registry gives it
   * rather than appended. A column designed to sit third reads as third for an
   * admin who has never reordered anything, which is the common case.
   */
  unlocked.forEach((id, registryIndex) => {
    if (seen.has(id)) return;
    arranged.splice(Math.min(registryIndex, arranged.length), 0, id);
    seen.add(id);
  });

  const byId = new Map(registry.map((c) => [c.id, c]));
  let next = 0;
  return registry.map((c) => (c.locked ? c : byId.get(arranged[next++])!));
}

/** Whether one column is on, with the registry default in charge until it is touched. */
export function isVisible(column: ColumnMeta, prefs: ColumnPrefs): boolean {
  if (column.locked) return true;
  if (prefs.shown.includes(column.id)) return true;
  if (prefs.hidden.includes(column.id)) return false;
  return column.defaultVisible !== false;
}

/** The columns the table actually draws, in order. */
export function visibleColumns<C extends ColumnMeta>(
  registry: C[],
  prefs: ColumnPrefs,
): C[] {
  return resolveOrder(registry, prefs.order).filter((c) => isVisible(c, prefs));
}

/**
 * Every column, in order, with its on/off state — what the picker lists.
 *
 * Locked columns are included. The design is explicit that they are *"shown greyed
 * with a lock, never hidden from the picker"*: a picker that silently omits them
 * teaches an admin that Subject can be turned off somewhere they have not found.
 */
export function pickerRows<C extends ColumnMeta>(
  registry: C[],
  prefs: ColumnPrefs,
): { column: C; visible: boolean }[] {
  return resolveOrder(registry, prefs.order).map((column) => ({
    column,
    visible: isVisible(column, prefs),
  }));
}

/** Turn one column on or off. A locked id is a no-op rather than an error. */
export function toggleColumn<C extends ColumnMeta>(
  registry: C[],
  prefs: ColumnPrefs,
  id: string,
): ColumnPrefs {
  const column = registry.find((c) => c.id === id);
  if (!column || column.locked) return prefs;

  const next = !isVisible(column, prefs);
  // Written to whichever set disagrees with the registry default, and cleared
  // from both first — a column must never appear in `shown` and `hidden` at once.
  const shown = prefs.shown.filter((x) => x !== id);
  const hidden = prefs.hidden.filter((x) => x !== id);
  const defaultOn = column.defaultVisible !== false;

  return {
    ...prefs,
    shown: next && !defaultOn ? [...shown, id] : shown,
    hidden: !next && defaultOn ? [...hidden, id] : hidden,
  };
}

/**
 * Move a column to a new slot among the unlocked ones.
 *
 * Both indices are positions in the **picker's list**, which includes the locked
 * rows — that is what a drag reports. They are mapped back onto the unlocked-only
 * order here, and a drag onto a locked row is refused rather than silently
 * snapping somewhere unexpected.
 */
export function reorderColumns<C extends ColumnMeta>(
  registry: C[],
  prefs: ColumnPrefs,
  fromId: string,
  toId: string,
): ColumnPrefs {
  if (fromId === toId) return prefs;
  const ordered = resolveOrder(registry, prefs.order);
  const from = ordered.find((c) => c.id === fromId);
  const to = ordered.find((c) => c.id === toId);
  if (!from || !to || from.locked || to.locked) return prefs;

  const unlocked = ordered.filter((c) => !c.locked).map((c) => c.id);
  const fromIndex = unlocked.indexOf(fromId);
  const toIndex = unlocked.indexOf(toId);
  unlocked.splice(fromIndex, 1);
  unlocked.splice(toIndex, 0, fromId);

  return { ...prefs, order: unlocked };
}

/**
 * Parse what came out of storage.
 *
 * Anything unreadable resolves to the defaults rather than throwing: a corrupt
 * value is one admin's stale preference, and it must not be the reason a queue
 * fails to render.
 */
export function parsePrefs(raw: string | null | undefined): ColumnPrefs {
  if (!raw) return DEFAULT_PREFS;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return DEFAULT_PREFS;
    const p = parsed as Partial<Record<keyof ColumnPrefs, unknown>>;
    return {
      order: stringArray(p.order),
      shown: stringArray(p.shown),
      hidden: stringArray(p.hidden),
      density: p.density === "compact" ? "compact" : "comfortable",
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((x): x is string => typeof x === "string") : [];
}

/** `"6 / 10"` for the picker's trigger — how many of the registry are on. */
export function visibleCount(registry: ColumnMeta[], prefs: ColumnPrefs): number {
  return registry.filter((c) => isVisible(c, prefs)).length;
}
