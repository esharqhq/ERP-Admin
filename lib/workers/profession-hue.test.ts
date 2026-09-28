import { describe, expect, it } from "vitest";
import { professionHue } from "@/lib/workers/profession-hue";

describe("professionHue", () => {
  it("is stable per name and one of the palette", () => {
    expect(professionHue("Cleaner")).toBe(professionHue("Cleaner"));
    expect(["#1C6B4C", "#2F6FED", "#12A594", "#7A5AF8", "#C2410C"]).toContain(professionHue("Gardener"));
  });
});
