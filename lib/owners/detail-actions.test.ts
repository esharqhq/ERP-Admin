import { describe, expect, it } from "vitest";
import {
  buildOwnerUpdateBody,
  ownerDetailActions,
} from "@/lib/owners/detail-actions";

const WALK_IN = "00000000-0000-0000-0000-00000000dead";
const REGULAR = "11111111-1111-1111-1111-111111111111";

describe("ownerDetailActions", () => {
  it("refuses everything on the walk-in account, and wins over the KYC read", () => {
    // The server returns owner_is_system ahead of every other check, so a
    // 404 from the KYC read must not reclassify this as a sub-account.
    expect(
      ownerDetailActions({
        ownerId: WALK_IN,
        walkInId: WALK_IN,
        kycRead: "absent",
        onboardingStatus: null,
      }),
    ).toEqual({
      isWalkIn: true,
      canEdit: false,
      canDelete: false,
      nameLock: "system",
    });
  });

  it("hides edit but keeps delete when no profile row exists", () => {
    expect(
      ownerDetailActions({
        ownerId: REGULAR,
        walkInId: WALK_IN,
        kycRead: "absent",
        onboardingStatus: null,
      }),
    ).toEqual({
      isWalkIn: false,
      canEdit: false,
      canDelete: true,
      nameLock: "no-profile",
    });
  });

  it("hides edit with no message when the KYC read is forbidden", () => {
    // Without the read there is nothing to prefill and no way to know whether
    // the name is editable, so there is nothing truthful to say.
    expect(
      ownerDetailActions({
        ownerId: REGULAR,
        walkInId: WALK_IN,
        kycRead: "forbidden",
        onboardingStatus: null,
      }),
    ).toEqual({
      isWalkIn: false,
      canEdit: false,
      canDelete: true,
      nameLock: null,
    });
  });

  it.each(["Kyc", "Rejected"])(
    "locks the name at %s because the owner can still fix it themselves",
    (status) => {
      expect(
        ownerDetailActions({
          ownerId: REGULAR,
          walkInId: WALK_IN,
          kycRead: "visible",
          onboardingStatus: status,
        }),
      ).toEqual({
        isWalkIn: false,
        canEdit: true,
        canDelete: true,
        nameLock: "self-editable",
      });
    },
  );

  it.each(["Review", "Approved", "Contract", "Active"])(
    "opens the name at %s, where the owner is frozen out",
    (status) => {
      expect(
        ownerDetailActions({
          ownerId: REGULAR,
          walkInId: WALK_IN,
          kycRead: "visible",
          onboardingStatus: status,
        }),
      ).toEqual({
        isWalkIn: false,
        canEdit: true,
        canDelete: true,
        nameLock: null,
      });
    },
  );

  it("still hides edit for the walk-in account when walkInId is unknown", () => {
    // The lookup 403s or the environment is unseeded. The walk-in account has
    // no onboarding record either way, so the KYC 404 catches it — Edit stays
    // hidden with a message that is still true. Only Delete is exposed.
    const a = ownerDetailActions({
      ownerId: WALK_IN,
      walkInId: null,
      kycRead: "absent",
      onboardingStatus: null,
    });
    expect(a.canEdit).toBe(false);
    expect(a.nameLock).toBe("no-profile");
    expect(a.canDelete).toBe(true);
  });

  it("treats an unrecognised status as editable", () => {
    // The two locking stages are a closed, named set. A stage added later is
    // far likelier to be a later one, where admin edit is legal — and the
    // server still refuses with 409 if that guess is wrong.
    expect(
      ownerDetailActions({
        ownerId: REGULAR,
        walkInId: WALK_IN,
        kycRead: "visible",
        onboardingStatus: "SomethingNew",
      }).nameLock,
    ).toBeNull();
  });
});

describe("buildOwnerUpdateBody", () => {
  it("sends both names with the reason", () => {
    expect(
      buildOwnerUpdateBody({
        firstName: "Hans",
        lastName: "Schmidt",
        reason: "Ticket #4412",
      }),
    ).toEqual({ firstName: "Hans", lastName: "Schmidt", reason: "Ticket #4412" });
  });

  it("omits a blank field rather than sending an empty string", () => {
    // "" is read as "leave unchanged", so sending it is harmless — but omitting
    // it keeps the request honest about what is being changed.
    expect(
      buildOwnerUpdateBody({ firstName: "Hans", lastName: "   ", reason: "typo" }),
    ).toEqual({ firstName: "Hans", reason: "typo" });
  });

  it("trims before deciding a field is blank", () => {
    expect(
      buildOwnerUpdateBody({ firstName: "  Hans  ", lastName: "", reason: "  typo  " }),
    ).toEqual({ firstName: "Hans", reason: "typo" });
  });

  it("refuses a blank reason", () => {
    // Validated in the service, not by model attributes — a blank one is a
    // 400 reason_required. Refuse before the round trip.
    expect(
      buildOwnerUpdateBody({ firstName: "Hans", lastName: "Schmidt", reason: "  " }),
    ).toBeNull();
  });

  it("refuses a body with no name at all", () => {
    // Two blanks would change nothing, write no audit entry, and still return
    // 200 — a silent no-op that reads as success.
    expect(
      buildOwnerUpdateBody({ firstName: "", lastName: "", reason: "typo" }),
    ).toBeNull();
  });
});
