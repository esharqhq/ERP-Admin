import { describe, expect, it } from "vitest";
import {
  DEFAULT_PREFS,
  isVisible,
  parsePrefs,
  pickerRows,
  reorderColumns,
  resolveOrder,
  toggleColumn,
  visibleColumns,
  visibleCount,
  type ColumnMeta,
  type ColumnPrefs,
} from "@/lib/ui/table-prefs";

/** The owner queue's real shape: two locked, four on, three off. */
const REGISTRY: ColumnMeta[] = [
  { id: "subject", locked: true },
  { id: "stage", locked: true },
  { id: "files" },
  { id: "waiting" },
  { id: "lastDecision" },
  { id: "contract" },
  { id: "company", defaultVisible: false },
  { id: "submittedAt", defaultVisible: false },
  { id: "rejectReason", defaultVisible: false },
];

function prefs(over: Partial<ColumnPrefs> = {}): ColumnPrefs {
  return { ...DEFAULT_PREFS, ...over };
}

const ids = (cols: ColumnMeta[]) => cols.map((c) => c.id);

describe("resolveOrder", () => {
  it("is the registry order when nothing is stored", () => {
    expect(ids(resolveOrder(REGISTRY, []))).toEqual(ids(REGISTRY));
  });

  it("permutes only the unlocked columns — a locked one cannot be displaced", () => {
    // "waiting" asks to go first. The two locked columns keep slots 0 and 1
    // regardless, so it lands in the first slot the registry left unlocked.
    const order = ["waiting", "files", "lastDecision"];
    expect(ids(resolveOrder(REGISTRY, order)).slice(0, 4)).toEqual([
      "subject",
      "stage",
      "waiting",
      "files",
    ]);
  });

  it("refuses to let a stored order promote a locked column", () => {
    // Even asked for explicitly, "stage" stays at its registry index.
    const resolved = ids(resolveOrder(REGISTRY, ["stage", "waiting"]));
    expect(resolved[0]).toBe("subject");
    expect(resolved[1]).toBe("stage");
  });

  it("drops a stored id the registry no longer has", () => {
    // The queue once had an "avatar" column. An admin's prefs still name it.
    const resolved = resolveOrder(REGISTRY, ["avatar", "waiting", "files"]);
    expect(ids(resolved)).toHaveLength(REGISTRY.length);
    expect(ids(resolved)).not.toContain("avatar");
  });

  it("places a column the stored order predates at its registry position", () => {
    // Prefs saved before "waiting" shipped. Appending it would bury a column the
    // designer put third; it belongs where the registry says.
    const older = ["files", "lastDecision", "contract", "company", "submittedAt", "rejectReason"];
    const resolved = ids(resolveOrder(REGISTRY, older));
    expect(resolved.indexOf("waiting")).toBe(resolved.indexOf("files") + 1);
  });

  it("survives a duplicate id without losing a column", () => {
    const resolved = resolveOrder(REGISTRY, ["files", "files", "waiting"]);
    expect(ids(resolved)).toHaveLength(REGISTRY.length);
    expect(new Set(ids(resolved)).size).toBe(REGISTRY.length);
  });
});

describe("isVisible", () => {
  it("keeps a locked column on even when storage says otherwise", () => {
    const p = prefs({ hidden: ["subject", "stage"] });
    expect(isVisible(REGISTRY[0], p)).toBe(true);
    expect(isVisible(REGISTRY[1], p)).toBe(true);
  });

  it("leaves the registry default in charge of an untouched column", () => {
    expect(isVisible({ id: "files" }, DEFAULT_PREFS)).toBe(true);
    expect(isVisible({ id: "company", defaultVisible: false }, DEFAULT_PREFS)).toBe(false);
  });

  it("lets each delta override its own default, and only its own", () => {
    expect(isVisible({ id: "files" }, prefs({ hidden: ["files"] }))).toBe(false);
    expect(
      isVisible({ id: "company", defaultVisible: false }, prefs({ shown: ["company"] })),
    ).toBe(true);
  });
});

describe("toggleColumn", () => {
  it("writes a default-on column into hidden, and back out again", () => {
    const off = toggleColumn(REGISTRY, DEFAULT_PREFS, "files");
    expect(off.hidden).toContain("files");
    expect(off.shown).not.toContain("files");

    const on = toggleColumn(REGISTRY, off, "files");
    expect(on.hidden).not.toContain("files");
    expect(on.shown).not.toContain("files");
  });

  it("writes a default-off column into shown, and back out again", () => {
    const on = toggleColumn(REGISTRY, DEFAULT_PREFS, "company");
    expect(on.shown).toContain("company");

    const off = toggleColumn(REGISTRY, on, "company");
    expect(off.shown).not.toContain("company");
    expect(off.hidden).not.toContain("company");
  });

  it("never leaves an id in both sets", () => {
    // A hand-edited or half-migrated value can arrive contradicting itself.
    const contradictory = prefs({ shown: ["files"], hidden: ["files"] });
    const next = toggleColumn(REGISTRY, contradictory, "files");
    expect(next.shown.includes("files") && next.hidden.includes("files")).toBe(false);
  });

  it("is a no-op on a locked column and on an id the registry has never had", () => {
    expect(toggleColumn(REGISTRY, DEFAULT_PREFS, "subject")).toBe(DEFAULT_PREFS);
    expect(toggleColumn(REGISTRY, DEFAULT_PREFS, "avatar")).toBe(DEFAULT_PREFS);
  });
});

describe("reorderColumns", () => {
  it("moves a column to the target's slot", () => {
    const next = reorderColumns(REGISTRY, DEFAULT_PREFS, "contract", "files");
    expect(ids(resolveOrder(REGISTRY, next.order)).slice(0, 4)).toEqual([
      "subject",
      "stage",
      "contract",
      "files",
    ]);
  });

  it("refuses a drag onto a locked row rather than snapping somewhere else", () => {
    expect(reorderColumns(REGISTRY, DEFAULT_PREFS, "contract", "stage")).toBe(DEFAULT_PREFS);
    expect(reorderColumns(REGISTRY, DEFAULT_PREFS, "subject", "contract")).toBe(DEFAULT_PREFS);
  });

  it("is a no-op when a column is dropped on itself", () => {
    expect(reorderColumns(REGISTRY, DEFAULT_PREFS, "files", "files")).toBe(DEFAULT_PREFS);
  });

  it("keeps every column after a move — nothing is lost in the splice", () => {
    const next = reorderColumns(REGISTRY, DEFAULT_PREFS, "rejectReason", "files");
    expect(new Set(ids(resolveOrder(REGISTRY, next.order))).size).toBe(REGISTRY.length);
  });
});

describe("visibleColumns and the picker", () => {
  it("draws the on columns in order, and lists every column in the picker", () => {
    expect(ids(visibleColumns(REGISTRY, DEFAULT_PREFS))).toEqual([
      "subject",
      "stage",
      "files",
      "waiting",
      "lastDecision",
      "contract",
    ]);
    // The picker keeps the locked rows — "shown greyed with a lock, never hidden
    // from the picker". An admin must be able to see that Subject exists and why
    // it cannot be switched off.
    expect(pickerRows(REGISTRY, DEFAULT_PREFS)).toHaveLength(REGISTRY.length);
    expect(pickerRows(REGISTRY, DEFAULT_PREFS)[0]).toMatchObject({ visible: true });
  });

  it("counts what the trigger says — 6 of 9 here", () => {
    expect(visibleCount(REGISTRY, DEFAULT_PREFS)).toBe(6);
    expect(visibleCount(REGISTRY, prefs({ shown: ["company"] }))).toBe(7);
  });
});

describe("parsePrefs", () => {
  it("returns the defaults for nothing, for rubbish, and for the wrong shape", () => {
    for (const raw of [null, undefined, "", "{oops", "[]", '"a string"', "42"]) {
      expect(parsePrefs(raw)).toEqual(DEFAULT_PREFS);
    }
  });

  it("keeps a good value and drops non-strings inside the arrays", () => {
    const raw = JSON.stringify({
      order: ["files", 7, null, "waiting"],
      shown: ["company"],
      hidden: "not-an-array",
      density: "compact",
    });
    expect(parsePrefs(raw)).toEqual({
      order: ["files", "waiting"],
      shown: ["company"],
      hidden: [],
      density: "compact",
    });
  });

  it("falls back to comfortable for an unknown density", () => {
    expect(parsePrefs(JSON.stringify({ density: "tiny" })).density).toBe("comfortable");
  });
});
