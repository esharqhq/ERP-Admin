/** A gap in the page list, drawn as an ellipsis. */
export const GAP = "gap" as const;

export type PageSlot = number | typeof GAP;

/**
 * Which page numbers a pager shows.
 *
 * Always the first and the last, plus the current one and its neighbours, with a
 * gap wherever the run breaks. The first and last are never elided because they
 * are the two an operator jumps to by name — "back to the top of the queue" and
 * "how deep does this go" — and a pager that hides them turns both into a series
 * of Next clicks.
 *
 * Page 1 of 6 gives `1 2 … 6`, which is what the design draws.
 */
export function pageWindow(current: number, pageCount: number): PageSlot[] {
  if (pageCount <= 1) return [1];

  const page = Math.min(Math.max(1, current), pageCount);
  const wanted = new Set<number>([1, pageCount, page - 1, page, page + 1]);

  const pages = [...wanted]
    .filter((n) => n >= 1 && n <= pageCount)
    .sort((a, b) => a - b);

  const slots: PageSlot[] = [];
  for (const [i, n] of pages.entries()) {
    // A gap of exactly one page is spelled out rather than hidden behind an
    // ellipsis: "1 … 3" costs the same width as "1 2 3" and buys nothing.
    const previous = pages[i - 1];
    if (previous !== undefined && n - previous > 1) {
      slots.push(n - previous === 2 ? n - 1 : GAP);
    }
    slots.push(n);
  }
  return slots;
}

/** `1–6 of 36` — the range this page covers, 1-based and inclusive. */
export function pageRange(
  page: number,
  pageSize: number,
  total: number,
): { from: number; to: number } {
  if (total === 0) return { from: 0, to: 0 };
  const from = (page - 1) * pageSize + 1;
  return { from, to: Math.min(page * pageSize, total) };
}

export function pageCountFor(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
}
