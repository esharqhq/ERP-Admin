/**
 * The attention strip's model, shared by Owner detail and Worker detail.
 *
 * The strip answers one question — *what is waiting on this account* — from
 * several independent reads, any of which can refuse. That is why a source
 * resolves to one of **three** states rather than to a nullable flag:
 *
 * - `clear`   — the source answered, and nothing is waiting.
 * - `flag`    — the source answered, and something is.
 * - `unknown` — the source refused, failed, or is still resolving.
 *
 * `unknown` is the state a boolean would lose. An admin without `kyc:review`
 * must not be shown a clean strip that implies the documents are fine; they
 * must be told that slot is unreadable. Both design files state this twice, and
 * the natural implementation (`slots.filter(Boolean)`) gets it wrong — which is
 * why the count below counts *known* sources and never assumes zero.
 */

export type AttentionTone = "critical" | "warning";

export interface AttentionFlag {
  /** Stable across renders — used as the React key. */
  id: string;
  tone: AttentionTone;
  /** One line, the finding itself. */
  title: string;
  /** One line under it, the evidence. */
  detail: string;
  /**
   * The verb, and where it is done. Omitted when nothing on this panel can act
   * on the finding — a chip with a dead verb is worse than a chip with none.
   */
  action?: { label: string; href: string };
  /**
   * The finding stops work rather than merely warning about it — an expired
   * licence, not one expiring. Turns the strip's headline into "Blocking".
   */
  blocking?: boolean;
}

export interface AttentionUnknown {
  id: string;
  /** What is unreadable, e.g. "Document state unknown". */
  title: string;
  /** Why, in the admin's terms — "you cannot read worker documents". */
  detail: string;
}

export type AttentionSource =
  | { state: "clear" }
  | ({ state: "flag" } & AttentionFlag)
  | ({ state: "unknown" } & AttentionUnknown);

export interface AttentionSummary {
  flags: AttentionFlag[];
  unknowns: AttentionUnknown[];
  /** Sources that answered — the denominator the count is honest about. */
  known: number;
  total: number;
  /** Nothing waiting **and** nothing unreadable. The one all-clear condition. */
  allClear: boolean;
  /** At least one flag stops work. */
  blocking: boolean;
}

export function summariseAttention(
  sources: AttentionSource[],
): AttentionSummary {
  const flags: AttentionFlag[] = [];
  const unknowns: AttentionUnknown[] = [];

  for (const source of sources) {
    if (source.state === "flag") {
      const { id, tone, title, detail, action, blocking } = source;
      flags.push({ id, tone, title, detail, action, blocking });
    } else if (source.state === "unknown") {
      const { id, title, detail } = source;
      unknowns.push({ id, title, detail });
    }
  }

  // Critical before warning, and otherwise in the order the caller listed them —
  // both designs order the slots by who is already waiting, so the caller's
  // sequence is meaningful and a full sort would destroy it.
  flags.sort((a, b) => toneRank(a) - toneRank(b));

  return {
    flags,
    unknowns,
    known: sources.length - unknowns.length,
    total: sources.length,
    allClear: flags.length === 0 && unknowns.length === 0,
    blocking: flags.some((f) => f.blocking),
  };
}

function toneRank(flag: AttentionFlag): number {
  return flag.tone === "critical" ? 0 : 1;
}

// ── Deriving the sources ─────────────────────────────────────────────────────

const DAY_MS = 86_400_000;

/**
 * Whole days from the start of today to a date-only deadline. `null` when the
 * value is absent or unparseable, which callers must treat as "no statement"
 * rather than as "expired" — the two are opposite facts.
 *
 * Both boundaries are snapped to the start of their day for the same reason
 * `coverPresentation` does it: comparing a raw instant against a day-start
 * rounds the hours already elapsed today into a whole extra day.
 */
export function daysUntil(
  iso: string | null | undefined,
  today: number,
): number | null {
  if (!iso || today <= 0) return null;
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return null;
  return Math.round((Math.floor(at / DAY_MS) * DAY_MS - today) / DAY_MS);
}
