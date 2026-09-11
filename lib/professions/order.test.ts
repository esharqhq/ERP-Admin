import { describe, expect, it } from "vitest";
import { orderProfessions } from "@/lib/professions/order";
import type { ProfessionDto } from "@/lib/types/profession.types";

function row(
  code: string,
  nameEn: string,
  nameDe: string,
  isActive = true,
): ProfessionDto {
  return { id: code, code, nameEn, nameDe, description: null, isActive };
}

/**
 * The server orders by `nameEn` (`ProfessionService.cs:42`), so a German screen
 * receives German labels in English alphabetical order. These fixtures are chosen
 * so the two orders disagree.
 */
const ROWS = [
  row("WINDOW", "Window Cleaning", "Fensterreinigung"),
  row("GARDEN", "Gardening", "Gartenarbeit"),
  row("GENERAL", "General Worker", "Allgemeine Reinigungskraft"),
];

describe("orderProfessions", () => {
  it("orders by the English name for a non-German locale", () => {
    expect(orderProfessions(ROWS, "en").map((p) => p.code)).toEqual([
      "GARDEN", // Gardening
      "GENERAL", // General Worker
      "WINDOW", // Window Cleaning
    ]);
  });

  /** The finding this function exists for: the German order is genuinely different. */
  it("orders by the German name for the German locale", () => {
    expect(orderProfessions(ROWS, "de").map((p) => p.code)).toEqual([
      "GENERAL", // Allgemeine Reinigungskraft
      "WINDOW", // Fensterreinigung
      "GARDEN", // Gartenarbeit
    ]);
  });

  /**
   * `localeCompare` rather than `<`: German collates "Ärzte" with the As, while a
   * codepoint comparison would exile every umlaut to the end of the list.
   */
  it("collates umlauts with their base letter in German", () => {
    const rows = [
      row("B", "B", "Bäcker"),
      row("A_UML", "A", "Ärztlich"),
      row("A", "C", "Allgemein"),
    ];
    expect(orderProfessions(rows, "de").map((p) => p.code)).toEqual([
      "A", // Allgemein
      "A_UML", // Ärztlich
      "B", // Bäcker
    ]);
  });

  it("ignores case differences rather than sorting capitals first", () => {
    const rows = [row("B", "beta", "beta"), row("A", "Alpha", "Alpha")];
    expect(orderProfessions(rows, "en").map((p) => p.code)).toEqual(["A", "B"]);
  });

  /** Called inside a render path, so it must not reorder the query cache's array. */
  it("does not mutate its input", () => {
    const input = [...ROWS];
    orderProfessions(input, "de");
    expect(input.map((p) => p.code)).toEqual(["WINDOW", "GARDEN", "GENERAL"]);
  });

  it("leaves deactivated rows in the same alphabetical run", () => {
    const rows = [
      row("B", "Bravo", "Bravo"),
      row("A", "Alpha", "Alpha", false),
    ];
    // Deactivated is a visual state (the row dims), not a sort key — the server
    // interleaves them too.
    expect(orderProfessions(rows, "en").map((p) => p.code)).toEqual(["A", "B"]);
  });
});
