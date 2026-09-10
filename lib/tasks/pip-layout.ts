/**
 * How a staffing fraction should be drawn — **and nothing about what colour it
 * is.**
 *
 * This module used to return literal hexes (`#1C6B4C`, `#E7B769`, `#B22B2B`)
 * straight from the v2 design, and `StaffingPipMeter` fed them to inline
 * `style=`. That made the meter the one element on a board of semantic tokens
 * that could not follow the theme: on a dark page it kept painting the light
 * palette. The design's colours were never new — they are the `status-active` /
 * `status-pending` / `status-cancelled` families `globals.css` already ships,
 * with dark values — so the fix is to stop naming colours here at all.
 *
 * The rule this file now keeps: **it decides shape and meaning, the component
 * decides appearance.** Nothing below may name a colour.
 */

/** One seat on the strip. `over` is the seat beyond `required` — legal, see below. */
export type PipKind = "filled" | "missing" | "over";

/**
 * What the fraction *means*, for a component to colour.
 *
 * `urgent` and `short` are both "a body is missing"; they differ on **time**, not
 * on staffing, which is why `urgent` is an argument rather than something this
 * module could derive.
 */
export type StaffingTone = "covered" | "short" | "urgent";

export type StaffingLayout =
  | {
      mode: "pips";
      pips: PipKind[];
      /**
       * Carried through because a `missing` seat reads differently on a task
       * starting today than on one next week, and the pip itself cannot know.
       */
      urgent: boolean;
    }
  | { mode: "fraction-only"; text: string; tone: StaffingTone }
  | { mode: "dash" };

/** Above five seats a strip of bars reads as noise — see `computeStaffingLayout`. */
const MAX_PIPS = 5;

function tone(filled: number, required: number, urgent: boolean): StaffingTone {
  if (filled >= required) return "covered";
  if (filled === 0 && urgent) return "urgent";
  return "short";
}

/**
 * Above `MAX_PIPS` seats the strip is dropped for a fraction —
 * `Uyer_Admin_Tasks_v2` §04's own reasoning: *"a strip of twelve bars reads as
 * noise."*
 *
 * `required === 0` with nobody on it is a dash rather than an empty strip: a
 * cancelled or zero-seat task has no staffing story, and drawing an empty
 * container invites the reader to count it as "0 of something".
 *
 * ⚠ **Over-staffing is real and is drawn.** The server permits `filled` above
 * `required` — `PATCH /api/tasks/{taskId}` can lower `workerLimit` under the
 * assigned count with no guard — so 4-of-3 renders three `filled` seats plus one
 * `over`, not a clamped 3-of-3. The v2 design's legend lists five readings and
 * omits this one; the code has always drawn six.
 */
export function computeStaffingLayout(
  filled: number,
  required: number,
  urgent: boolean,
): StaffingLayout {
  if (required === 0 && filled === 0) {
    return { mode: "dash" };
  }

  if (required > MAX_PIPS) {
    return {
      mode: "fraction-only",
      text: `${filled} / ${required}`,
      tone: tone(filled, required, urgent),
    };
  }

  const pips: PipKind[] = [];
  for (let i = 0; i < required; i++) {
    pips.push(i < filled ? "filled" : "missing");
  }
  if (filled > required) {
    pips.push("over");
  }

  return { mode: "pips", pips, urgent };
}
