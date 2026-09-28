/**
 * A stable dot colour per profession name.
 *
 * The design gives Cleaner / Gardener / Windows / Handyman four fixed hues, none
 * of which exists on this deployment — the seeded table is `GENERAL` alone. So the
 * hue is **derived from the name** instead of enumerated: whatever professions an
 * admin creates get distinct, stable dots, and nothing has to be edited here when
 * they do. The palette is the design's four, in its order.
 */
const SKILL_HUES = ["#1C6B4C", "#2F6FED", "#12A594", "#7A5AF8", "#C2410C"];

export function professionHue(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return SKILL_HUES[Math.abs(hash) % SKILL_HUES.length];
}
