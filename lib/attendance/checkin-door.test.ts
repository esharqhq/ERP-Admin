import { describe, expect, it } from "vitest";
import { checkinDoorKind, coordsAreScanners } from "@/lib/attendance/checkin-door";

/**
 * The door is a plain `string | null` on the wire and the three names are our
 * reading of `CheckinDoor` in `GermanyERP.Domain/Enums/TaskEnums.cs`. The cases
 * that matter are the ones a live day rarely shows: the ambiguous `null`, and a
 * fourth door the backend adds later — neither may crash or borrow a label.
 */
describe("checkinDoorKind", () => {
  it("maps the three PascalCase wire names", () => {
    expect(checkinDoorKind("WorkerTapped")).toBe("tapped");
    expect(checkinDoorKind("WorkerScannedDisplay")).toBe("display");
    expect(checkinDoorKind("OwnerScannedWorker")).toBe("scanned");
  });

  it("is case- and whitespace-tolerant", () => {
    expect(checkinDoorKind("workertapped")).toBe("tapped");
    expect(checkinDoorKind(" OWNERSCANNEDWORKER ")).toBe("scanned");
  });

  it("reads null, undefined and an empty string as no door", () => {
    expect(checkinDoorKind(null)).toBeNull();
    expect(checkinDoorKind(undefined)).toBeNull();
    expect(checkinDoorKind("")).toBeNull();
  });

  it("returns null for a door it does not know, rather than guessing one", () => {
    expect(checkinDoorKind("Kiosk")).toBeNull();
    // `index/` spells the values this way; the wire does not. It must not match.
    expect(checkinDoorKind("WORKER_TAPPED")).toBeNull();
  });
});

describe("coordsAreScanners", () => {
  it("is true only for a staff scan", () => {
    expect(coordsAreScanners("OwnerScannedWorker")).toBe(true);
    expect(coordsAreScanners("WorkerTapped")).toBe(false);
    expect(coordsAreScanners("WorkerScannedDisplay")).toBe(false);
  });

  it("is false for null and for an unknown door", () => {
    expect(coordsAreScanners(null)).toBe(false);
    expect(coordsAreScanners(undefined)).toBe(false);
    expect(coordsAreScanners("Kiosk")).toBe(false);
  });
});
