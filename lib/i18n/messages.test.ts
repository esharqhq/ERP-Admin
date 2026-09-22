import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { collectPaths, scanSource } from "@/lib/i18n/message-keys";

/** `""` is the catalogue root — a translator bound with no namespace takes absolute keys. */
const path = (ns: string, key: string) => (ns ? `${ns}.${key}` : key);

/**
 * The standing gate for message keys.
 *
 * ⚠ `next-intl` resolves keys at runtime, so a missing one is invisible to
 * `tsc`, to ESLint and to every other test in this suite: the component renders,
 * the build passes, and the key prints itself on screen. `workers.columns.name`
 * did exactly that in a table header on 2026-09-22. This file is the reason it
 * cannot happen quietly again.
 *
 * Three checks, in order of how much they cover:
 *
 * 1. **Locale parity** — `en` and `de` carry the same keys. Catches the common
 *    half-done addition, and needs no source parsing at all.
 * 2. **Every static key that is asked for exists** — and resolves to a string,
 *    not to a group. This is the one that would have caught the shipped bug.
 * 3. **The static head of a dynamic key exists as a group.** Partial by nature;
 *    the count of keys with no static head at all is asserted separately so the
 *    gap stays visible rather than passing as covered.
 */

const ROOT = join(__dirname, "..", "..");
const LOCALES = ["en", "de"] as const;
const SCAN_DIRS = ["app", "components", "hooks", "lib"];

function messages(locale: string): unknown {
  return JSON.parse(readFileSync(join(ROOT, "messages", `${locale}.json`), "utf-8"));
}

function sourceFiles(dir: string, out: string[] = []): string[] {
  const abs = join(ROOT, dir);
  for (const entry of readdirSync(abs)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(abs, entry);
    if (statSync(full).isDirectory()) sourceFiles(join(dir, entry), out);
    else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

/**
 * Files this gate does not judge, each with the reason it cannot.
 *
 * ⚠ An exemption is a debt, not a decision. Every entry is checked to still
 * exist below, so deleting the file forces the entry out with it and the list
 * cannot quietly outlive what it was excusing.
 */
const EXEMPT: { file: string; why: string }[] = [
  {
    file: join("app", "[locale]", "dashboard", "chat", "page.tsx"),
    why:
      "An unwired prototype: its conversations are a hardcoded array of invented " +
      "messages, it is absent from `lib/nav-items.ts`, and the working feature is " +
      "`/dashboard/support`. All seven of its keys are missing, so the page renders " +
      "them raw — found by this gate on its first run. Translating a mockup would " +
      "dress it up as a feature; it wants deleting or building, and that is a " +
      "product call rather than this file's.",
  },
];

const FILES = SCAN_DIRS.flatMap((d) => sourceFiles(d)).filter(
  (f) => !EXEMPT.some((e) => relative(ROOT, f) === e.file),
);
const PATHS = Object.fromEntries(
  LOCALES.map((l) => [l, collectPaths(messages(l))] as const),
);

describe("message catalogue", () => {
  it("scans a real number of files, so a broken walk cannot pass as clean", () => {
    // Without this, a bad path or a changed layout turns the whole gate into a
    // loop over nothing that reports success.
    expect(FILES.length).toBeGreaterThan(100);
  });

  it("keeps no exemption for a file that is gone", () => {
    // An exemption that outlives its file is a hole nobody can see any more.
    for (const { file } of EXEMPT) {
      expect(() => statSync(join(ROOT, file)), `stale exemption: ${file}`).not.toThrow();
    }
  });

  it("carries the same keys in every locale", () => {
    const [base, ...rest] = LOCALES;
    for (const other of rest) {
      const missing = [...PATHS[base].keys()].filter((k) => !PATHS[other].has(k));
      const extra = [...PATHS[other].keys()].filter((k) => !PATHS[base].has(k));
      expect({ locale: other, missing, extra }).toEqual({
        locale: other,
        missing: [],
        extra: [],
      });
    }
  });
});

describe("every key the app asks for", () => {
  const scanned = FILES.map((f) => ({
    file: relative(ROOT, f),
    ...scanSource(readFileSync(f, "utf-8")),
  }));

  it("exists in every locale, and is a string rather than a group", () => {
    const problems: string[] = [];
    for (const { file, keys } of scanned) {
      for (const { key, namespaces } of keys) {
        for (const locale of LOCALES) {
          const kinds = namespaces.map((ns) => PATHS[locale].get(path(ns, key)));
          // Found under any of the name's bindings is found: a regex cannot tell
          // which component a call sits in, and the check must not invent a
          // failure for a key that plainly exists.
          if (kinds.some((k) => k === "leaf")) continue;
          const where = namespaces.map((ns) => path(ns, key)).join(" | ");
          problems.push(
            kinds.some((k) => k === "group")
              ? `${locale}: ${where} — is a group, not a message (${file})`
              : `${locale}: ${where} — missing (${file})`,
          );
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it("has a real branch behind every dynamic key's static head", () => {
    const problems: string[] = [];
    for (const { file, prefixes } of scanned) {
      for (const { prefix, namespaces } of prefixes) {
        for (const locale of LOCALES) {
          const found = namespaces.some(
            (ns) => PATHS[locale].get(path(ns, prefix)) === "group",
          );
          if (found) continue;
          const where = namespaces.map((ns) => path(ns, prefix)).join(" | ");
          problems.push(`${locale}: ${where} — no such group (${file})`);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it("finds keys at all — an empty scan is a broken scan, not a clean one", () => {
    const total = scanned.reduce((n, s) => n + s.keys.length, 0);
    expect(total).toBeGreaterThan(500);
  });
});
