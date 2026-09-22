import { describe, expect, it } from "vitest";
import {
  finalizeProfessionCode,
  normalizeProfessionCode,
} from "@/lib/professions/code";

describe("normalizeProfessionCode", () => {
  /** The server does `Trim().ToUpperInvariant()`, so the field should show that. */
  it("upper-cases as you type", () => {
    expect(normalizeProfessionCode("plumber")).toBe("PLUMBER");
  });

  /**
   * The guide calls this an UPPER_SNAKE machine handle, but **nothing server-side
   * enforces it** — a space survives into a value no route can ever edit. This is
   * the only place that can prevent it.
   */
  it("turns spaces into underscores", () => {
    expect(normalizeProfessionCode("window cleaning")).toBe("WINDOW_CLEANING");
  });

  it("collapses a run of whitespace into one underscore", () => {
    expect(normalizeProfessionCode("window   cleaning")).toBe("WINDOW_CLEANING");
    expect(normalizeProfessionCode("window\tcleaning")).toBe("WINDOW_CLEANING");
  });

  /** A leading space must not become a leading underscore. */
  it("drops leading whitespace rather than encoding it", () => {
    expect(normalizeProfessionCode("  plumber")).toBe("PLUMBER");
  });

  /**
   * A trailing underscore is kept while typing — it is how the next word gets
   * started. `finalizeProfessionCode` removes it at submit.
   */
  it("keeps a trailing underscore so the next word can be typed", () => {
    expect(normalizeProfessionCode("window ")).toBe("WINDOW_");
  });

  it("leaves an already-normalised code untouched", () => {
    expect(normalizeProfessionCode("WINDOW_CLEANING")).toBe("WINDOW_CLEANING");
  });

  it("handles an empty field", () => {
    expect(normalizeProfessionCode("")).toBe("");
  });
});

describe("finalizeProfessionCode", () => {
  it("removes the trailing underscore left by typing", () => {
    expect(finalizeProfessionCode("WINDOW_")).toBe("WINDOW");
  });

  it("leaves an internal underscore alone", () => {
    expect(finalizeProfessionCode("WINDOW_CLEANING")).toBe("WINDOW_CLEANING");
  });

  it("trims surrounding whitespace too, like the server does", () => {
    expect(finalizeProfessionCode("  PLUMBER  ")).toBe("PLUMBER");
  });

  it("handles an empty field", () => {
    expect(finalizeProfessionCode("")).toBe("");
    expect(finalizeProfessionCode("___")).toBe("");
  });
});
