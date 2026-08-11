import { describe, expect, it } from "vitest";
import { parseOptionalNumber } from "@/lib/properties/form-fields";

const int = { max: 500, integer: true };
const dec = { max: 1_000_000, integer: false };

describe("parseOptionalNumber", () => {
  // The three optional property measures are nullable server-side, and the
  // backend treats null as "no value" rather than zero — so an empty input must
  // clear the field, not submit 0.
  it("treats an empty or whitespace input as null, and accepts it", () => {
    expect(parseOptionalNumber("", int)).toEqual({ ok: true, value: null });
    expect(parseOptionalNumber("   ", int)).toEqual({ ok: true, value: null });
  });

  it("accepts a value inside the range", () => {
    expect(parseOptionalNumber("12", int)).toEqual({ ok: true, value: 12 });
    expect(parseOptionalNumber("1234.56", dec)).toEqual({ ok: true, value: 1234.56 });
  });

  it("accepts both range boundaries", () => {
    expect(parseOptionalNumber("0", int)).toEqual({ ok: true, value: 0 });
    expect(parseOptionalNumber("500", int)).toEqual({ ok: true, value: 500 });
  });

  it("rejects values outside the range", () => {
    expect(parseOptionalNumber("501", int).ok).toBe(false);
    expect(parseOptionalNumber("-1", int).ok).toBe(false);
  });

  // floorCount and roomCount are `int` server-side; sending 2.5 would be a 400
  // from model binding rather than a friendly message.
  it("rejects a fractional value only where the field is an integer", () => {
    expect(parseOptionalNumber("2.5", int).ok).toBe(false);
    expect(parseOptionalNumber("2.5", dec)).toEqual({ ok: true, value: 2.5 });
  });

  it("rejects text that is not a number", () => {
    expect(parseOptionalNumber("abc", int).ok).toBe(false);
    expect(parseOptionalNumber("12abc", int).ok).toBe(false);
  });

  // Number("") is 0 and Number("Infinity") is finite-looking to a naive check —
  // both would sail through a `Number.isNaN` guard alone.
  it("rejects infinity rather than letting it read as a huge value", () => {
    expect(parseOptionalNumber("Infinity", dec).ok).toBe(false);
    expect(parseOptionalNumber("-Infinity", dec).ok).toBe(false);
  });

  it("reports null on a rejected value so a caller cannot submit it by mistake", () => {
    expect(parseOptionalNumber("501", int).value).toBeNull();
  });
});
