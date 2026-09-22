/**
 * Finding every message key a source file asks for, so a key that does not exist
 * fails a test instead of printing itself on screen.
 *
 * ## Why this exists
 *
 * `next-intl` resolves keys at runtime. A missing one is invisible to `tsc`, to
 * ESLint and to every unit test — the component renders, the build passes, and
 * the literal string `workers.columns.name` appears in a table header in front
 * of an admin. That shipped on 2026-09-22.
 *
 * ## What it cannot see
 *
 * A fully dynamic key (`` t(`${tile.id}.title`) ``) has no static prefix, so
 * nothing about it can be checked here. `scanSource` reports those separately
 * rather than silently counting them as verified — an honest gap is worth more
 * than a green number that covers less than it claims.
 */

/**
 * A translator variable bound by `useTranslations` / `getTranslations`.
 *
 * ⚠ The namespace argument is **optional**. `dashboard-header.tsx:110` calls
 * `useTranslations()` with none, which binds the catalogue root and makes its
 * keys absolute (`t("layout.sidebar.expand")`). Requiring the argument made the
 * scanner fall back to an earlier binding in the same file and report a path
 * that exists nowhere.
 */
const DECLARATION =
  /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\s*\(\s*(?:["'`]([^"'`]+)["'`]\s*)?\)/g;

export interface ScannedKeys {
  /**
   * Fully static keys. Each carries **every** namespace its variable is bound to
   * in that file, and the key counts as found when it resolves under any one of
   * them.
   *
   * ⚠ A file may bind the same name twice — `attendance/page.tsx` has `const t =
   * useTranslations("attendance")` in one component and
   * `useTranslations("attendance.states")` in four others. A regex cannot tell
   * which component a call sits in, so the alternatives are carried and the
   * check stays sound: it can still only pass a key that exists somewhere, and
   * it cannot invent a failure for one that does.
   */
  keys: { key: string; namespaces: string[] }[];
  /**
   * The static head of a dynamic key — `ns.a.b` from `` t(`a.b.${x}`) ``. The
   * branch must exist and must be a group, not a leaf.
   */
  prefixes: { prefix: string; namespaces: string[] }[];
  /** Calls with no static head at all. Counted, never assumed correct. */
  unresolvable: number;
}

/**
 * ⚠ Only variables this file itself binds are followed. A `t` arriving as a prop
 * or a parameter has a namespace that lives somewhere else, and guessing it
 * would produce false failures on code that is fine.
 */
export function scanSource(source: string): ScannedKeys {
  // ⚠ Comments first. A doc comment that *quotes* a key as an example —
  // `file-viewer.tsx` explains what its header would read as `t("type.<doc.type>")`
  // — is prose, not a call, and reading it as one produces a failure nobody can
  // act on. Block comments and whole-line `//` comments go; a trailing comment
  // after code is left alone, since stripping it needs to know what is inside a
  // string literal and a wrong guess there would hide a real key.
  source = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[ 	]*\/\/.*$/gm, "");

  const namespaces = new Map<string, string[]>();
  for (const m of source.matchAll(DECLARATION)) {
    // `""` is the root: a call with no namespace takes absolute keys.
    const ns = m[2] ?? "";
    const known = namespaces.get(m[1]) ?? [];
    if (!known.includes(ns)) known.push(ns);
    namespaces.set(m[1], known);
  }

  // ⚠ A name that is also a declared PARAMETER is not this file's translator at
  // every call site — several helpers here take the translator as an argument
  // (`function closureReasonLabel(reason: string, t: (k: string) => string)`),
  // and inside those the namespace belongs to whoever called them. Such a name
  // is dropped rather than guessed at: a gate that invents failures gets
  // switched off, and then it guards nothing.
  const PARAMETER = /[(,]\s*([A-Za-z_$][\w$]*)\s*:/g;
  const parameters = new Set(
    [...source.matchAll(PARAMETER)].map((m) => m[1]),
  );
  for (const name of [...namespaces.keys()]) {
    if (parameters.has(name)) namespaces.delete(name);
  }

  const keys: ScannedKeys["keys"] = [];
  const prefixes: ScannedKeys["prefixes"] = [];
  let unresolvable = 0;

  // One pass, one static pattern: any identifier used as a call whose first
  // argument opens with a quote. A per-variable regex built by interpolation
  // would need its own escaping, and a template literal turns `\b` into a
  // backspace rather than a word boundary — which is how the first draft of
  // this file threw `Unterminated group` instead of scanning anything.
  const CALL = /\b([A-Za-z_$][\w$]*)(?:\.(?:rich|raw|markup))?\(\s*(["'`])/g;

  for (const m of source.matchAll(CALL)) {
    const ns = namespaces.get(m[1]);
    if (!ns) continue;

    const quote = m[2];
    const rest = source.slice((m.index ?? 0) + m[0].length);

    if (quote !== "`") {
      const end = rest.indexOf(quote);
      if (end > 0) {
        keys.push({ key: rest.slice(0, end), namespaces: ns });
      }
      continue;
    }

    const end = rest.indexOf("`");
    if (end < 0) continue;
    const head = rest.slice(0, end).split("${")[0].replace(/\.$/, "");
    // No static head — `` t(`${tile.id}.title`) `` has nothing to look up, and
    // saying so is worth more than a green number that covers less than it claims.
    if (!head) unresolvable += 1;
    else prefixes.push({ prefix: head, namespaces: ns });
  }

  return { keys, prefixes, unresolvable };
}

/** Every dotted path in a message tree, leaves and groups alike. */
export function collectPaths(
  node: unknown,
  prefix = "",
  out = new Map<string, "leaf" | "group">(),
): Map<string, "leaf" | "group"> {
  if (node !== null && typeof node === "object" && !Array.isArray(node)) {
    if (prefix) out.set(prefix, "group");
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      collectPaths(v, prefix ? `${prefix}.${k}` : k, out);
    }
  } else if (prefix) {
    out.set(prefix, "leaf");
  }
  return out;
}
