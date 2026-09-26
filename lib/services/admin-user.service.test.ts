import { beforeEach, describe, expect, it, vi } from "vitest";

const post = vi.fn();
vi.mock("@/lib/http/client", () => ({ apiClient: { post } }));

const { adminUserService } = await import("@/lib/services/admin-user.service");

/**
 * Both routes are `[Idempotent]`. `assignRole` used to mint `crypto.randomUUID()`
 * per call and `deactivateAdmin` sent no key at all — either way a retry was a
 * new request. The key must be the caller's, byte for byte, on every attempt.
 */
describe("adminUserService idempotency keys", () => {
  beforeEach(() => {
    post.mockReset();
    post.mockResolvedValue({ data: {} });
  });

  const sentKeys = () =>
    post.mock.calls.map((call) => call[2]?.headers?.["X-Idempotency-Key"]);

  it("assignRole sends the caller's key, the same one on a retry", async () => {
    await adminUserService.assignRole("a1", { roleCode: "MODERATOR" }, "key-1");
    await adminUserService.assignRole("a1", { roleCode: "MODERATOR" }, "key-1");
    expect(sentKeys()).toEqual(["key-1", "key-1"]);
  });

  it("deactivateAdmin sends the caller's key, the same one on a retry", async () => {
    await adminUserService.deactivateAdmin("a1", { reason: "left" }, "key-2");
    await adminUserService.deactivateAdmin("a1", { reason: "left" }, "key-2");
    expect(sentKeys()).toEqual(["key-2", "key-2"]);
  });
});
