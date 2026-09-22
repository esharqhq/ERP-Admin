import { describe, expect, it } from "vitest";
import { collectPaths, scanSource } from "@/lib/i18n/message-keys";

/** The fixtures below are multi-line sources; this is what joins their lines. */
const NEWLINE = "\n";

/** `ns.key` for each scanned key, flattening the alternatives a rebound name carries. */
const flat = (src: string) =>
  scanSource(src).keys.flatMap(({ key, namespaces }) =>
    namespaces.map((ns) => `${ns}.${key}`),
  );

describe("scanSource", () => {
  it("reads a key through the namespace its variable was bound to", () => {
    const src = `
      const t = useTranslations("workers");
      const tCommon = useTranslations("common");
      export function X() { return <p>{t("columns.worker")}{tCommon("cancel")}</p>; }
    `;
    expect(flat(src)).toEqual(["workers.columns.worker", "common.cancel"]);
  });

  it("catches the key that actually shipped", () => {
    // ⚠ The regression this module exists for. `workers.columns.name` does not
    // exist — the workers table calls that column `worker` — and the header
    // printed the key itself in front of an admin on 2026-09-22.
    const src = `
      const t = useTranslations("workers");
      <TableHead>{t("columns.name")}</TableHead>
    `;
    expect(flat(src)).toContain("workers.columns.name");
  });

  it("reads the server-side and awaited form", () => {
    const src = `const t = await getTranslations('login'); t("title");`;
    expect(flat(src)).toEqual(["login.title"]);
  });

  it("reads the .rich variant, which takes the key in the same place", () => {
    const src = `const t = useTranslations("forbidden"); t.rich("body", {});`;
    expect(flat(src)).toEqual(["forbidden.body"]);
  });

  it("keeps the static head of a dynamic key", () => {
    const src = "const t = useTranslations(\"owners\"); t(`work.status.${s}`);";
    const out = scanSource(src);
    expect(out.prefixes).toEqual([
      { prefix: "work.status", namespaces: ["owners"] },
    ]);
    expect(out.keys).toEqual([]);
  });

  it("reports a key with no static head instead of counting it verified", () => {
    // `` t(`${tile.id}.title`) `` — nothing here can be looked up, and saying so
    // is worth more than a green number that covers less than it claims.
    const src = "const t = useTranslations(\"owners.summary\"); t(`${tile.id}.title`, { count });";
    const out = scanSource(src);
    expect(out.unresolvable).toBe(1);
    expect(out.prefixes).toEqual([]);
  });

  it("ignores a translator it did not bind itself", () => {
    // A `t` arriving as a prop has a namespace defined somewhere else; guessing
    // it would fail code that is perfectly fine.
    const src = `function Row({ t }: { t: Translate }) { return t("anything.at.all"); }`;
    expect(flat(src)).toEqual([]);
  });
});

describe("collectPaths", () => {
  it("records leaves and the groups above them", () => {
    const paths = collectPaths({ a: { b: "x", c: { d: "y" } } });
    expect(paths.get("a")).toBe("group");
    expect(paths.get("a.b")).toBe("leaf");
    expect(paths.get("a.c")).toBe("group");
    expect(paths.get("a.c.d")).toBe("leaf");
  });
});

describe("what the scanner must not mistake for a call", () => {
  it("ignores a key quoted inside a doc comment", () => {
    // `file-viewer.tsx` explains that its header would otherwise read
    // `t("type.<doc.type>")`. That sentence is prose, and reading it as a call
    // produced a failure nobody could act on.
    const src = [
      "/**",
      ' * Without it the header reads `t("type.<doc.type>")` out of the enum.',
      " */",
      'const t = useTranslations("docsWorkspace.detail");',
      't("uploadedOn");',
    ].join(NEWLINE);
    expect(flat(src)).toEqual(["docsWorkspace.detail.uploadedOn"]);
  });

  it("carries both namespaces when one file rebinds the same name", () => {
    // `attendance/page.tsx` binds `t` to `attendance` in one component and to
    // `attendance.states` in four others. A regex cannot tell them apart, so the
    // key counts as found under either — sound, and never a false failure.
    const src = [
      'function A() { const t = useTranslations("attendance"); return t("k"); }',
      'function B() { const t = useTranslations("attendance.states"); return t("k"); }',
    ].join(NEWLINE);
    expect(scanSource(src).keys[0].namespaces).toEqual([
      "attendance",
      "attendance.states",
    ]);
  });

  it("drops a name that is also a declared parameter", () => {
    // The translator arrives from the caller here, so its namespace is not this
    // file's to assume.
    const src = [
      'const t = useTranslations("tasks");',
      "function label(reason: string, t: (k: string) => string) {",
      "  return t(`reasons.${reason}`);",
      "}",
    ].join(NEWLINE);
    const out = scanSource(src);
    expect(out.keys).toEqual([]);
    expect(out.prefixes).toEqual([]);
  });
});
