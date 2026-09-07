export type Pip = {
  kind: "filled" | "missing" | "over";
  bg: string;
  ring: string | null;
};

export type StaffingLayout =
  | { mode: "pips"; pips: Pip[]; fraction?: { text: string; fg: string } }
  | { mode: "fraction-only"; text: string; fg: string }
  | { mode: "dash" };

const FILLED_BG = "#1C6B4C";
const OVER_BG = "#7ED957";
const OVER_RING = "inset 0 0 0 1.5px #1C6B4C";
const MISSING_RING_URGENT = "inset 0 0 0 1.5px rgba(220,59,59,0.65)";
const MISSING_RING_CALM = "inset 0 0 0 1.5px #E7B769";

function fractionColor(filled: number, required: number, urgent: boolean): string {
  if (filled >= required) return "#1C6B4C";
  if (filled === 0 && urgent) return "#B22B2B";
  return "#9A5E00";
}

/**
 * Above 5 seats the pip strip is dropped for a fraction — Uyer_Admin_Tasks_v2
 * §04's own reasoning: "a strip of twelve bars reads as noise."
 */
export function computeStaffingLayout(
  filled: number,
  required: number,
  urgent: boolean,
): StaffingLayout {
  if (required === 0 && filled === 0) {
    return { mode: "dash" };
  }

  if (required > 5) {
    return {
      mode: "fraction-only",
      text: `${filled} / ${required}`,
      fg: fractionColor(filled, required, urgent),
    };
  }

  const missingRing = urgent ? MISSING_RING_URGENT : MISSING_RING_CALM;
  const pips: Pip[] = [];
  for (let i = 0; i < required; i++) {
    pips.push(
      i < filled
        ? { kind: "filled", bg: FILLED_BG, ring: null }
        : { kind: "missing", bg: "#FFFFFF", ring: missingRing },
    );
  }
  if (filled > required) {
    pips.push({ kind: "over", bg: OVER_BG, ring: OVER_RING });
  }

  return { mode: "pips", pips };
}
