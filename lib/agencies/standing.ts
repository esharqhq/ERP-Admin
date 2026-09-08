import type { AgencyDto, AgencyStanding } from "@/lib/types/agency.types";

/**
 * ⚠ **Badge tones, not `SummaryTone`.** `components/ui/badge.tsx` ships
 * `success`/`warning`/`danger`/`primary`/`info`/`neutral`;
 * `components/ui/summary-strip.tsx` ships only `warning`/`critical`/`neutral`.
 * The strip's three tiles carry their own tones — a single union of both would
 * type-check and emit an undefined class.
 *
 * Kept as a literal rather than derived from `badgeVariants`, so `lib/` does not
 * import a component module into its own test run. If badge's tone keys ever
 * change, this union is the place to follow.
 */
export type AgencyTone = "success" | "warning" | "info" | "danger" | "neutral";

/**
 * How each standing reads.
 *
 * ⚠ **Three of the four cannot log in, and they mean three different things** — a
 * normal new partner waiting on paper, a scheduled future start, and a finished
 * relationship. One red/green treatment would destroy that distinction, and
 * telling them apart is the operator's whole job on this screen.
 */
export function standingTone(standing: AgencyStanding): AgencyTone {
  switch (standing) {
    case "Active":
      return "success";
    // Normal for a freshly approved agency — but it is work, and someone owns it.
    case "AwaitingContract":
      return "warning";
    // Nothing is wrong and nobody needs to act.
    case "NotYetActive":
      return "info";
    case "Expired":
      return "danger";
    default:
      return "neutral";
  }
}

/**
 * Sort order for the Standing column: **attention first**, not alphabetical.
 * Somebody sorting a status column is trying to bring work up, not to read it in
 * dictionary order.
 */
export function standingRank(standing: AgencyStanding): number {
  switch (standing) {
    case "AwaitingContract":
      return 0;
    case "Expired":
      return 1;
    case "NotYetActive":
      return 2;
    case "Active":
      return 3;
    default:
      return 4;
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

function daysFrom(today: number, iso: string | null): number | null {
  if (!iso) return null;
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return null;
  return Math.round((at - today) / DAY_MS);
}

/**
 * Day counts for copy such as *"ends in 12 days"*. Negative once a date has
 * passed; `null` for a date that is absent.
 *
 * ⚠ **It returns no phase, deliberately.** The phase is `standing`, derived
 * server-side in one expression so `isActive` and `standing` can never disagree.
 * A second derivation here would eventually contradict it — most obviously on a
 * row carrying an end date and no start date, which the server calls
 * `AwaitingContract` and naive arithmetic calls expired.
 */
export function contractDays(
  agency: Pick<AgencyDto, "signedOn" | "validUntil">,
  today: number,
): { untilStart: number | null; untilEnd: number | null } {
  return {
    untilStart: daysFrom(today, agency.signedOn),
    untilEnd: daysFrom(today, agency.validUntil),
  };
}

/**
 * Order for the Contract column, over **three** states rather than two.
 *
 * ⚠ `validUntil === null` covers two opposite facts, and a plain nulls-last
 * comparator interleaves them:
 *
 * - **no dates at all** — the partner cannot sign in (`AwaitingContract`);
 * - **open-ended** — a signed contract with no end, i.e. *unlimited* access.
 *
 * Sorting a column whose cell draws three states over two orderings would leave
 * a partner who is switched off sitting among partners with the most access
 * there is. So the rule is stated once, here, and tested: real end dates first
 * (soonest to latest, which is what someone sorting this column is hunting),
 * then open-ended, then no dates at all.
 *
 * The Standing column separates the same two cases by tone, but that does not
 * make this ordering optional — an operator sorting by Contract is not
 * simultaneously reading Standing.
 */
export function compareContractEnd(
  a: Pick<AgencyDto, "signedOn" | "validUntil">,
  b: Pick<AgencyDto, "signedOn" | "validUntil">,
): number {
  const rank = (x: Pick<AgencyDto, "signedOn" | "validUntil">) =>
    x.validUntil ? 0 : x.signedOn ? 1 : 2;
  const ra = rank(a);
  const rb = rank(b);
  if (ra !== rb) return ra - rb;
  if (ra !== 0) return 0;
  return Date.parse(a.validUntil!) - Date.parse(b.validUntil!);
}
