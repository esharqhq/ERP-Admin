import { describe, expect, it } from "vitest";
import {
  applyClientPipeline,
  looseIncludes,
  type ClientPipelineInput,
} from "@/lib/ui/table-rows";

interface Row {
  id: string;
  name: string;
  stage: string;
  waiting: number;
}

const ROWS: Row[] = [
  { id: "a", name: "Katrin Vogel", stage: "Review", waiting: 3 },
  { id: "b", name: "Tomas Becker", stage: "Review", waiting: 9 },
  { id: "c", name: "Sabine Mayer", stage: "Review", waiting: 1 },
  { id: "d", name: "Amir Kaya", stage: "Rejected", waiting: 0 },
  { id: "e", name: "Lena Wirth", stage: "Approved", waiting: 0 },
  { id: "f", name: "Jonas Hoffmann", stage: "Contract", waiting: 0 },
];

function run(over: Partial<ClientPipelineInput<Row>> = {}) {
  return applyClientPipeline<Row>({
    rows: ROWS,
    search: "",
    filters: {},
    sort: null,
    page: 1,
    pageSize: 25,
    matches: (row, needle) => looseIncludes(row.name, needle),
    filter: (row, values) =>
      !values.stage || values.stage.split(",").includes(row.stage),
    comparators: {
      waiting: (a, b) => a.waiting - b.waiting,
      name: (a, b) => a.name.localeCompare(b.name),
    },
    ...over,
  });
}

const ids = (rows: Row[]) => rows.map((r) => r.id);

describe("applyClientPipeline", () => {
  it("passes everything through when nothing is asked of it", () => {
    const result = run();
    expect(ids(result.rows)).toEqual(["a", "b", "c", "d", "e", "f"]);
    expect(result.total).toBe(6);
  });

  it("narrows on search, and the total follows the narrowing", () => {
    // The total is what every count on screen reads. If it stayed at 6 the
    // pagination would offer pages that do not exist.
    const result = run({ search: "vogel" });
    expect(ids(result.rows)).toEqual(["a"]);
    expect(result.total).toBe(1);
  });

  it("ignores a search term that is only whitespace", () => {
    expect(run({ search: "   " }).total).toBe(6);
  });

  it("hands the whole values bag to one predicate, so filters can interact", () => {
    const result = run({ filters: { stage: "Review,Rejected" } });
    expect(ids(result.rows)).toEqual(["a", "b", "c", "d"]);
  });

  it("sorts ascending and descending off one comparator", () => {
    expect(ids(run({ sort: { key: "waiting", dir: "asc" } }).rows).slice(0, 2)).toEqual([
      "d",
      "e",
    ]);
    expect(ids(run({ sort: { key: "waiting", dir: "desc" } }).rows)[0]).toBe("b");
  });

  it("never sorts the caller's array in place", () => {
    // `rows` is a memoized query result. Sorting it would reorder the cache for
    // every other consumer, including the detail page's prev/next.
    const rows = [...ROWS];
    run({ rows, sort: { key: "waiting", dir: "desc" } });
    expect(ids(rows)).toEqual(ids(ROWS));
  });

  it("leaves the order alone when the column has no comparator", () => {
    const result = run({ sort: { key: "lastDecision", dir: "asc" } });
    expect(ids(result.rows)).toEqual(ids(ROWS));
  });

  it("pages, and reports the total across all pages", () => {
    const result = run({ pageSize: 2, page: 2 });
    expect(ids(result.rows)).toEqual(["c", "d"]);
    expect(result.total).toBe(6);
    expect(result.page).toBe(2);
  });

  it("clamps a page the narrowed set no longer has", () => {
    // `?page=3` survives in the address while a filter cuts the set to one page.
    // Slicing past the end would render an empty table that reads as "nothing
    // matches" over a set that has a match.
    const result = run({ filters: { stage: "Approved" }, pageSize: 2, page: 3 });
    expect(result.page).toBe(1);
    expect(ids(result.rows)).toEqual(["e"]);
    expect(result.total).toBe(1);
  });

  it("clamps a page below one, and survives an empty set", () => {
    expect(run({ page: 0 }).page).toBe(1);
    const none = run({ rows: [], pageSize: 2, page: 4 });
    expect(none).toMatchObject({ rows: [], total: 0, page: 1 });
  });

  it("applies search before filters before sort before paging", () => {
    // All four at once: the page must be cut from the sorted, narrowed set —
    // not the set narrowed from a page.
    const result = run({
      search: "e",
      filters: { stage: "Review" },
      sort: { key: "waiting", dir: "desc" },
      pageSize: 1,
      page: 1,
    });
    // "Katrin Vogel", "Tomas Becker", "Sabine Mayer" all contain an "e" and are
    // in Review; the longest wait leads.
    expect(result.total).toBe(3);
    expect(ids(result.rows)).toEqual(["b"]);
  });
});

describe("looseIncludes", () => {
  it("ignores case", () => {
    expect(looseIncludes("Katrin Vogel", "VOGEL")).toBe(true);
  });

  it("finds a name typed without its umlaut", () => {
    expect(looseIncludes("Jürgen Müller", "muller")).toBe(true);
    expect(looseIncludes("Jürgen Müller", "jurgen")).toBe(true);
  });

  it("expands ß, which NFD alone does not", () => {
    expect(looseIncludes("Torstraße 88", "strasse")).toBe(true);
  });

  it("is false for null and for a miss, not an error", () => {
    expect(looseIncludes(null, "x")).toBe(false);
    expect(looseIncludes(undefined, "x")).toBe(false);
    expect(looseIncludes("Katrin", "becker")).toBe(false);
  });
});
