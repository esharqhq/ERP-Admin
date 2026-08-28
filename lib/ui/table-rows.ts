/**
 * Search → filter → sort → page, for a table whose endpoint does none of it.
 *
 * The owner documents queue reads `GET /api/admin/kyc?status=`, which returns a
 * **bare array with no paging, search or sort parameters at all**, while the
 * worker queue reads a paged, server-filtered, server-sorted endpoint. One table
 * shell serves both, and the difference is dangerous in exactly one direction:
 * running this pipeline over a *server page* would search, filter and count the
 * current 25 rows and present the answer as if it were the whole set.
 *
 * So this is the client half, kept separate and tested, and the shell reaches it
 * only through `mode: "client"`. There is no code path from a server page to
 * here — see `applyClientPipeline`'s only caller.
 */

export interface ClientPipelineInput<Row> {
  rows: Row[];
  search: string;
  filters: Record<string, string>;
  sort: { key: string; dir: "asc" | "desc" } | null;
  /** 1-based. */
  page: number;
  pageSize: number;
  /** Free-text predicate. Absent means search narrows nothing. */
  matches?: (row: Row, needle: string) => boolean;
  /** Filter predicate over the whole values bag. Absent means filters narrow nothing. */
  filter?: (row: Row, values: Record<string, string>) => boolean;
  /** Comparators by column id, ascending. The pipeline reverses for `desc`. */
  comparators?: Record<string, (a: Row, b: Row) => number>;
}

export interface ClientPipelineResult<Row> {
  /** The rows this page shows. */
  rows: Row[];
  /** How many survived narrowing — the number every count on screen must use. */
  total: number;
  /**
   * The page actually shown. Filtering down to fewer pages than the URL asks for
   * lands here rather than on an empty table over a full set.
   */
  page: number;
}

export function applyClientPipeline<Row>(
  input: ClientPipelineInput<Row>,
): ClientPipelineResult<Row> {
  const { rows, search, filters, sort, pageSize, matches, filter, comparators } = input;

  const needle = search.trim().toLowerCase();
  let out = rows;

  if (needle && matches) out = out.filter((row) => matches(row, needle));

  // Called once with the whole bag rather than once per key: a screen's filters
  // are frequently interdependent (a city only means something under a country),
  // and per-key predicates cannot express that.
  if (filter && Object.keys(filters).length > 0) {
    out = out.filter((row) => filter(row, filters));
  }

  const compare = sort ? comparators?.[sort.key] : undefined;
  if (sort && compare) {
    // Copied before sorting — `rows` is a memoized query result, and sorting it
    // in place mutates the cache every other consumer reads.
    out = [...out].sort(
      sort.dir === "asc" ? compare : (a, b) => compare(b, a),
    );
  }

  const total = out.length;

  /**
   * Clamped, not trusted. `?page=5` survives in the address while a filter cuts
   * the set to one page, and slicing past the end would render an empty table
   * that looks exactly like "nothing matches" over a set that has plenty.
   */
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, input.page), pageCount);
  const start = (page - 1) * pageSize;

  return { rows: out.slice(start, start + pageSize), total, page };
}

/**
 * A case- and diacritic-insensitive substring test for the common search cell.
 *
 * German is the console's second language and its operators type `Muller` for
 * `Müller` — and `Straße` normalises to `strasse` only if the `ß` is expanded,
 * which `NFD` alone does not do.
 */
export function looseIncludes(
  haystack: string | null | undefined,
  needle: string,
): boolean {
  if (!haystack) return false;
  return fold(haystack).includes(fold(needle));
}

function fold(value: string): string {
  return value
    .toLowerCase()
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}
