import { describe, expect, it } from "vitest";
import {
  buildCreateLocation,
  buildEditLocation,
  locationName,
  propertyLocationErrorKey,
  sentLocation,
} from "@/lib/properties/location-fields";

const DE = "country-de";
const AT = "country-at";
const BERLIN = "city-berlin";
const VIENNA = "city-vienna";

describe("buildCreateLocation", () => {
  // f-02c §4.1a: "neither" is the documented way to ask for the BOSS's own pair.
  it("sends neither id when both are blank, so the server uses the owner's city", () => {
    expect(buildCreateLocation({ countryId: "", cityId: "" })).toEqual({ ok: true, fields: {} });
  });

  it("sends both ids once a city is chosen", () => {
    expect(buildCreateLocation({ countryId: DE, cityId: BERLIN })).toEqual({
      ok: true,
      fields: { countryId: DE, cityId: BERLIN },
    });
  });

  // The picker never produces this (the city select is idle without a country),
  // but a city alone is a legal body — the server fills its country.
  it("sends a city on its own without inventing a country", () => {
    expect(buildCreateLocation({ countryId: "", cityId: BERLIN })).toEqual({
      ok: true,
      fields: { cityId: BERLIN },
    });
  });

  // `countryId` without `cityId` is `400 city_required` — refused here first.
  it("refuses a country without a city", () => {
    expect(buildCreateLocation({ countryId: DE, cityId: "" })).toEqual({
      ok: false,
      reason: "cityRequired",
    });
  });

  it("sends another country's city as picked", () => {
    expect(buildCreateLocation({ countryId: AT, cityId: VIENNA })).toEqual({
      ok: true,
      fields: { countryId: AT, cityId: VIENNA },
    });
  });
});

describe("buildEditLocation", () => {
  const stored = { countryId: DE, cityId: BERLIN };

  // Omitting both keeps the stored value — and keeps a city that was
  // deactivated after it was set, because validation runs only on a change.
  it("sends neither id when the pair is unchanged", () => {
    expect(buildEditLocation({ countryId: DE, cityId: BERLIN }, stored)).toEqual({
      ok: true,
      fields: {},
    });
  });

  it("sends both ids when the pair changed", () => {
    expect(buildEditLocation({ countryId: AT, cityId: VIENNA }, stored)).toEqual({
      ok: true,
      fields: { countryId: AT, cityId: VIENNA },
    });
  });

  it("sends both ids when only the city changed", () => {
    expect(buildEditLocation({ countryId: DE, cityId: "city-munich" }, stored)).toEqual({
      ok: true,
      fields: { countryId: DE, cityId: "city-munich" },
    });
  });

  it("refuses a new country whose city has not been picked yet", () => {
    expect(buildEditLocation({ countryId: AT, cityId: "" }, stored)).toEqual({
      ok: false,
      reason: "cityRequired",
    });
  });

  // ⚠ There is no "clear" on the wire: an omitted pair means "keep". Sending
  // nothing would save the old city while the form showed it removed.
  it("refuses clearing a stored pair", () => {
    expect(buildEditLocation({ countryId: "", cityId: "" }, stored)).toEqual({
      ok: false,
      reason: "cannotClear",
    });
  });

  // The walk-in placeholder, or a property whose BOSS had no location.
  it("sends nothing for a property that has no city and still has none", () => {
    expect(
      buildEditLocation({ countryId: "", cityId: "" }, { countryId: null, cityId: null }),
    ).toEqual({ ok: true, fields: {} });
  });

  it("sends a first city for a property that had none", () => {
    expect(
      buildEditLocation({ countryId: DE, cityId: BERLIN }, { countryId: null, cityId: null }),
    ).toEqual({ ok: true, fields: { countryId: DE, cityId: BERLIN } });
  });

  it("refuses a country alone for a property that had no city", () => {
    expect(
      buildEditLocation({ countryId: DE, cityId: "" }, { countryId: null, cityId: null }),
    ).toEqual({ ok: false, reason: "cityRequired" });
  });
});

describe("locationName", () => {
  const berlin = { id: BERLIN, nameDe: "Berlin", nameEn: "Berlin" };
  const munich = { id: "city-munich", nameDe: "München", nameEn: "Munich" };

  it("reads the German name on de and the English one otherwise", () => {
    expect(locationName(munich, "de")).toBe("München");
    expect(locationName(munich, "en")).toBe("Munich");
    expect(locationName(berlin, "en")).toBe("Berlin");
  });

  it("falls back to the other name when the preferred one is blank", () => {
    expect(locationName({ ...munich, nameDe: "" }, "de")).toBe("Munich");
  });

  // The walk-in placeholder, or a property whose BOSS had no location.
  it("returns null for a property without a location", () => {
    expect(locationName(null, "de")).toBeNull();
    expect(locationName(undefined, "en")).toBeNull();
  });
});

describe("sentLocation", () => {
  it("is true only when the body carries an id", () => {
    expect(sentLocation(undefined)).toBe(false);
    expect(sentLocation({})).toBe(false);
    expect(sentLocation({ cityId: BERLIN })).toBe(true);
    expect(sentLocation({ countryId: DE, cityId: BERLIN })).toBe(true);
  });
});

describe("propertyLocationErrorKey", () => {
  it("returns null for codes that are not about the location", () => {
    expect(propertyLocationErrorKey(null, { sent: true })).toBeNull();
    expect(propertyLocationErrorKey("property_not_found", { sent: true })).toBeNull();
    expect(propertyLocationErrorKey("walkin_city_required", { sent: true })).toBeNull();
  });

  it("maps the codes that can only be about what was sent", () => {
    for (const sent of [true, false]) {
      expect(propertyLocationErrorKey("city_not_found", { sent })).toBe("cityNotFound");
      expect(propertyLocationErrorKey("country_not_found", { sent })).toBe("countryNotFound");
      expect(propertyLocationErrorKey("city_country_mismatch", { sent })).toBe(
        "cityCountryMismatch",
      );
    }
  });

  // §4.1a: on create the pair may be the BOSS's default, which can be missing
  // or deactivated — the copy must tell the admin to pick one, not "choose
  // another" about a choice they never made.
  it("words the default-derived failures as being about the owner's city", () => {
    expect(propertyLocationErrorKey("city_required", { sent: false })).toBe("ownerHasNoCity");
    expect(propertyLocationErrorKey("city_inactive", { sent: false })).toBe("ownerCityInactive");
    expect(propertyLocationErrorKey("country_inactive", { sent: false })).toBe(
      "ownerCountryInactive",
    );
  });

  it("words the same codes as being about the admin's pick when one was sent", () => {
    expect(propertyLocationErrorKey("city_required", { sent: true })).toBe("cityRequired");
    expect(propertyLocationErrorKey("city_inactive", { sent: true })).toBe("cityInactive");
    expect(propertyLocationErrorKey("country_inactive", { sent: true })).toBe("countryInactive");
  });
});
