import { describe, expect, it } from "vitest";
import {
  idsToFetch,
  requesterIdentity,
  requesterKind,
  requesterProfilePath,
  requesterProfilePermission,
  requesterReadPermission,
  shortId,
} from "@/lib/support/requester";

describe("requesterKind", () => {
  it("reads the wire codes", () => {
    expect(requesterKind("OWNER_USER")).toBe("owner");
    expect(requesterKind("WORKER")).toBe("worker");
    expect(requesterKind("ADMIN")).toBe("admin");
  });

  it("accepts the friendly form", () => {
    expect(requesterKind("Owner")).toBe("owner");
    expect(requesterKind("Worker")).toBe("worker");
  });

  it("falls back to unknown on anything new or missing", () => {
    expect(requesterKind("AGENCY_USER")).toBe("unknown");
    expect(requesterKind("")).toBe("unknown");
    expect(requesterKind(null)).toBe("unknown");
  });
});

describe("requesterProfilePath", () => {
  it("points owners and workers at their detail page", () => {
    expect(requesterProfilePath("owner", "abc")).toBe("/dashboard/owners/abc");
    expect(requesterProfilePath("worker", "abc")).toBe("/dashboard/workers/abc");
  });

  it("has no page for admins, unknown kinds or a missing id", () => {
    expect(requesterProfilePath("admin", "abc")).toBeNull();
    expect(requesterProfilePath("unknown", "abc")).toBeNull();
    expect(requesterProfilePath("owner", "")).toBeNull();
  });
});

describe("permissions", () => {
  it("gates the link on the page's own route gate", () => {
    expect(requesterProfilePermission("/dashboard/owners/abc")).toBe("owner:list");
    expect(requesterProfilePermission("/dashboard/workers/abc")).toBe("worker:list");
    expect(requesterProfilePermission(null)).toBeNull();
  });

  it("reads a profile with the per-id grant", () => {
    expect(requesterReadPermission("owner")).toBe("owner:read");
    expect(requesterReadPermission("worker")).toBe("worker:read");
    expect(requesterReadPermission("admin")).toBeNull();
  });
});

describe("requesterIdentity", () => {
  it("takes the name and prefers email over phone", () => {
    expect(
      requesterIdentity({ fullName: " Anna Weber ", email: "a@x.de", phoneNumber: "+49" }),
    ).toEqual({ name: "Anna Weber", contact: "a@x.de" });
  });

  it("falls back to the phone, and treats blanks as missing", () => {
    expect(requesterIdentity({ fullName: "  ", email: "", phoneNumber: "+49 1" })).toEqual({
      name: null,
      contact: "+49 1",
    });
  });

  it("is empty when the profile was not read", () => {
    expect(requesterIdentity(undefined)).toEqual({ name: null, contact: null });
  });
});

describe("idsToFetch", () => {
  const refs = [
    { id: "o1", type: "OWNER_USER" },
    { id: "o1", type: "OWNER_USER" },
    { id: "o2", type: "OWNER_USER" },
    { id: "w1", type: "WORKER" },
    { id: "w1", type: "WORKER" },
    { id: "a1", type: "ADMIN" },
  ];

  it("dedupes, and skips owners the directory already named", () => {
    expect(idsToFetch(refs, new Set(["o1"]))).toEqual({ owners: ["o2"], workers: ["w1"] });
  });

  it("reads every owner when there is no directory", () => {
    expect(idsToFetch(refs, null)).toEqual({ owners: ["o1", "o2"], workers: ["w1"] });
  });
});

describe("shortId", () => {
  it("keeps the first eight characters", () => {
    expect(shortId("3f2a1e10-aaaa")).toBe("3f2a1e10");
    expect(shortId(null)).toBe("");
  });
});
