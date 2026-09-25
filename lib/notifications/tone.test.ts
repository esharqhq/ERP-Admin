import { describe, expect, it } from "vitest";
import { notificationTone } from "@/lib/notifications/tone";

describe("notificationTone", () => {
  it("marks the six-hour staffing rung critical", () => {
    expect(notificationTone("TaskStaffingCritical")).toBe("critical");
  });

  it("marks the 24-hour staffing rung a warning", () => {
    expect(notificationTone("TaskStaffingWarning")).toBe("warning");
  });

  it("keeps rendering the retired kind 19 rows a user already holds", () => {
    expect(notificationTone("TaskUnderstaffed")).toBe("warning");
  });

  it("leaves every other kind plain", () => {
    expect(notificationTone("TaskComplaintRaised")).toBeNull();
    expect(notificationTone("KycSubmitted")).toBeNull();
    expect(notificationTone("SomethingAddedLater")).toBeNull();
  });
});
