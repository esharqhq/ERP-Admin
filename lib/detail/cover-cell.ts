import {
  coverNoteKey,
  coverPresentation,
  type CoverNote,
  type CoverPresentation,
  type SubjectCover,
} from "@/lib/onboarding/subject-row";

/** Mirrors `FactTone` in `components/detail/identity-band.tsx`. */
export type CellTone = "neutral" | "warning" | "critical";

export interface CoverCell {
  /** `null` means *still resolving* — the caller renders a skeleton, not a dash. */
  value: string | null;
  hint?: string;
  trailing?: string;
  tone: CellTone;
  /** Elapsed share of the period, 0..1, or `null` when there is nothing to draw. */
  progress: number | null;
}

export interface CoverQuery {
  cover: SubjectCover | null;
  /** `null` = grant set not resolved yet, which is not a refusal. */
  canRead: boolean | null;
  isPending: boolean;
  error: unknown;
}

export interface CoverCopy {
  /** "…are not visible with your permissions" */
  unavailable: () => string;
  /** The read failed — a fault, not a fact about the subject. */
  failed: () => string;
  /** No period has ever been authored. The one outcome that *is* about them. */
  none: () => string;
  /** `docsWorkspace`-relative note: "34 days left", "Starts in 5 days"… */
  note: (note: CoverNote) => string;
  formatDate: (iso: string | null) => string;
}

/** The DS's two rungs, from the file that owns them. */
const TONE: Record<CoverPresentation["tone"], CellTone> = {
  muted: "neutral",
  warning: "warning",
  critical: "critical",
};

/**
 * What a contract period cell shows, for each way the read can land.
 *
 * **Five outcomes, and four of them are not "no contract"** — which is the one
 * thing a bare em dash gets read as. A refused read, a failed read and a period
 * that has genuinely never been authored are three different facts about three
 * different things, and only the last is about the subject.
 *
 * Extracted from the owner hero so the worker's licence-and-contract band cannot
 * disagree with it. Copy is passed in rather than translated here, so this stays
 * a plain function over the hook's result and both callers keep their own
 * namespace.
 */
export function describeCover(
  query: CoverQuery,
  today: number,
  copy: CoverCopy,
): CoverCell {
  if (query.canRead === false)
    return {
      value: "—",
      hint: copy.unavailable(),
      tone: "neutral",
      progress: null,
    };
  // `null` is "not known yet", and a query disabled behind it stays pending
  // forever — both are the same waiting state to a reader.
  if (query.canRead === null || query.isPending)
    return { value: null, tone: "neutral", progress: null };
  if (query.error)
    return {
      value: "—",
      hint: copy.failed(),
      tone: "critical",
      progress: null,
    };
  if (!query.cover)
    return { value: copy.none(), tone: "neutral", progress: null };

  const value = `${copy.formatDate(query.cover.from)} – ${copy.formatDate(query.cover.to)}`;

  // No clock yet (server snapshot) — the dates are still true, the countdown is
  // not, so the period renders without one rather than not at all.
  if (today <= 0) return { value, tone: "neutral", progress: null };

  const pres = coverPresentation(query.cover, today);
  return {
    value,
    trailing: copy.note(coverNoteKey(query.cover.phase, pres)),
    tone: TONE[pres.tone],
    progress: elapsedShare(query.cover, today),
  };
}

/**
 * How much of the period is behind us. `null` for anything that has not started
 * or has no measurable span — a bar drawn from an unparseable date is a lie with
 * a shape.
 */
function elapsedShare(cover: SubjectCover, today: number): number | null {
  const from = Date.parse(cover.from);
  const to = Date.parse(cover.to);
  if (Number.isNaN(from) || Number.isNaN(to) || to <= from) return null;
  return Math.min(1, Math.max(0, (today - from) / (to - from)));
}
