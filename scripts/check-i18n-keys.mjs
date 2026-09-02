/**
 * Every literal `t("…")` in the app, resolved against `messages/en.json` and
 * `messages/de.json`.
 *
 * Why this exists: next-intl resolves keys at **runtime**, so a key that does not
 * exist renders its own path string on the screen instead of failing the build.
 * `tsc` cannot see it and no test renders every component. This is the cheap
 * check that does.
 *
 * ⚠ **A file may bind several namespaces to the same name.** `workers-matrix.tsx`
 * has `const t = useTranslations("workers.matrix")` in one component and
 * `const t = useTranslations("workers.matrix.legend")` in another, both called
 * `t`. Static analysis cannot tell which scope a call sits in, so a key counts as
 * present when it resolves under **any** namespace the file binds — that is a
 * deliberate under-report: it misses a key that exists in the wrong namespace, and
 * it never cries wolf, which is what makes the check worth running.
 *
 * Template keys (`t(`sort.${id}`)`) cannot be resolved statically and are listed
 * separately so they get an eye rather than a pass.
 *
 * Run: `node scripts/check-i18n-keys.mjs`
 */
import fs from "node:fs";
import path from "node:path";

const ROOTS = ["app", "components", "hooks", "lib"];
const LOCALES = ["en", "de"];

const messages = Object.fromEntries(
  LOCALES.map((l) => [
    l,
    JSON.parse(fs.readFileSync(path.join("messages", `${l}.json`), "utf8")),
  ]),
);

const lookup = (tree, dotted) =>
  dotted.split(".").reduce((o, k) => (o == null ? undefined : o[k]), tree);

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      yield full;
    }
  }
}

let missing = 0;
const templates = [];

for (const root of ROOTS) {
  if (!fs.existsSync(root)) continue;
  for (const file of walk(root)) {
    const src = fs.readFileSync(file, "utf8");

    // fn name → every namespace this file binds to it.
    const bound = new Map();
    for (const m of src.matchAll(
      /const\s+(\w+)\s*=\s*useTranslations\(\s*"([^"]+)"\s*\)/g,
    )) {
      if (!bound.has(m[1])) bound.set(m[1], []);
      bound.get(m[1]).push(m[2]);
    }
    if (bound.size === 0) continue;

    for (const m of src.matchAll(/\b(t[A-Za-z]*)\(\s*"([^"]*)"/g)) {
      const [, fn, key] = m;
      const namespaces = bound.get(fn);
      if (!namespaces) continue;

      for (const locale of LOCALES) {
        const found = namespaces.some(
          (ns) => typeof lookup(messages[locale], `${ns}.${key}`) === "string",
        );
        if (!found) {
          console.log(
            `MISSING [${locale}] ${namespaces.join("|")}.${key}   (${file})`,
          );
          missing++;
        }
      }
    }

    for (const m of src.matchAll(/\b(t[A-Za-z]*)\(\s*`([^`]*\$\{[^`]*)`/g)) {
      if (bound.has(m[1])) {
        templates.push(
          `${bound.get(m[1]).join("|")}.${m[2].replace(/\s+/g, " ")}   (${file})`,
        );
      }
    }
  }
}

if (templates.length > 0) {
  console.log("\nTemplate keys — resolve these by eye:");
  for (const t of [...new Set(templates)].sort()) console.log("  " + t);
}

console.log(
  `\n${missing} missing literal key${missing === 1 ? "" : "s"}, ` +
    `${new Set(templates).size} template key${new Set(templates).size === 1 ? "" : "s"}.`,
);
process.exit(missing > 0 ? 1 : 0);
