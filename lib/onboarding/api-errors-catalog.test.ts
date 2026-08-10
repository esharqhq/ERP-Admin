import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import de from "@/messages/de.json";

/**
 * Guards the defect class from Task 10's second commit: `apiErrors.validation`
 * held the ICU placeholder `"{detail}"`, and ~9 call sites format this
 * namespace with a bare `t(\`apiErrors.${labelKey}\`)` and no `values`
 * argument. That doesn't throw — next-intl silently renders the literal key
 * path (`onboarding.apiErrors.validation`) to the admin instead of a message.
 * The fix was to make every value in this namespace argument-free rather than
 * to guard every caller, so this test asserts that invariant directly against
 * the message files — it protects all keys, not just the one that broke, and
 * it fails at `npm run test` instead of in front of an admin.
 *
 * Placed under lib/onboarding/ (not messages/) so it's picked up by
 * vitest.config.mts's existing `include: ["lib/**\/*.test.ts", ...]` glob
 * without widening it — a messages/ location would need a config change.
 */
const NAMESPACE = "apiErrors";

function apiErrors(locale: Record<string, unknown>): Record<string, string> {
  const onboarding = locale.onboarding as Record<string, unknown> | undefined;
  const errors = onboarding?.[NAMESPACE] as Record<string, string> | undefined;
  if (!errors) throw new Error(`onboarding.${NAMESPACE} is missing from this locale file`);
  return errors;
}

describe("onboarding.apiErrors — no ICU arguments", () => {
  it.each([
    ["en", en],
    ["de", de],
  ])("has no %s value containing an ICU placeholder", (_locale, locale) => {
    const errors = apiErrors(locale as Record<string, unknown>);
    for (const [key, value] of Object.entries(errors)) {
      expect(
        value,
        `onboarding.apiErrors.${key} contains "{" or "}". An apiErrors value with an ` +
          `ICU placeholder requires every caller to pass it, and most call sites do not — ` +
          `keep these strings argument-free (see Task 10, commit d9a688f).`,
      ).not.toMatch(/[{}]/);
    }
  });
});

describe("onboarding.apiErrors — locale parity", () => {
  it("has identical key sets in en and de", () => {
    const enKeys = Object.keys(apiErrors(en as Record<string, unknown>)).sort();
    const deKeys = Object.keys(apiErrors(de as Record<string, unknown>)).sort();
    // A key present in one locale and not the other renders a raw key path
    // for that language only — the same failure this suite guards, in a
    // narrower case.
    expect(deKeys).toEqual(enKeys);
  });
});
