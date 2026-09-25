# Return pass — catching up after the backend moved

Do **not** re-read the guides, and do **not** `git diff` them. The CHANGELOG is the delta. It is
newest first and append-only, so an entry you have read never changes under you.

Commands below are Bash (Git Bash). In PowerShell use `"$env:GERMANY_ERP"` instead of `"$GERMANY_ERP"`.

## 0. Pull safely, and short-circuit if the contract did not move

```bash
git -C "$GERMANY_ERP" fetch
git -C "$GERMANY_ERP" log --oneline origin/main..main   # local-only commits: someone's work, not yours to merge over
git -C "$GERMANY_ERP" pull --ff-only                    # never a merge pull; if ff-only fails, stop and ask
LAST=<the newest HEAD in ledger §1 — the "Last HEAD check" cell, else "Last full pass">
git -C "$GERMANY_ERP" log --oneline "$LAST"..HEAD -- docs/handoff
```

If the last command prints nothing, the contract did not move. Update the **Last HEAD check** cell
in ledger §1 (date + HEAD) and stop. Most backend commits are `docs(mind)`, CI or index work.

## 1. List the entries to read

Start from the **oldest `Absorbed to`** in ledger §2, **not** the reviewed-through date. The
reviewed-through date only tells you which of those entries you have already read.

```bash
SINCE=<oldest Absorbed to>   # >= on purpose: several entries can share a date
awk -v since="$SINCE" -v app=admin-panel '
  /^## 2026-/   { d=$2; t=$0; k="" }
  /^- Kind:/    { k=$3 }
  /^- affects:/ { if (d>=since && index($0,app)) print d, k, substr(t,1,100) }
' "$GERMANY_ERP/docs/handoff/CHANGELOG.md"
```

This keeps only entries whose `affects:` names `admin-panel`. The vocabulary is fixed:
`admin-panel` · `owner-app` · `worker-app`. Cross out the entries the pass log (§4) already built and
the ones §3 already records as read. What is left is this pass's reading list.

## 2. Read each entry, acting on its fields in this order

1. **`Became false:`** quotes a sentence you may have coded against. Assume you did, and grep for it.
   It is the only field that breaks a shipped build.
2. **`Gone:`** — delete that handling. A removed error code never comes back under a new name.
3. **`Replaced by:` / `Do this:`** — this is the migration.
4. **`Kind:`**
   - **`breaking`** gets a row in §3.
   - **`removal`** deletes something you may call.
   - **`fix`** still has to be read. One fix withdrew three pieces of standing advice, and the
     2026-09-10 restore doors shipped as a fix **without bumping the guide's Revision**.
   - **`additive`** usually costs nothing, but read its `Became false:` if it has one. A hard-coded
     **count or enumeration** (export columns, enum values, a trigger list) is the recurring trap.
5. Open **only** the guides named in the entry's `Guides:` field, at the section it points to.

## 3. Write it down — the ledger, in this order

1. **§4 Pass log:** a new block at the top, holding what this pass **built**: entry, the half
   actioned, and file:line.
2. **§3 Open work:** every entry read and not built, one row each, saying what is still open. When an
   item gets built, move its row to §4 instead of editing it in place.
3. **§2:** refresh `Revision` from README *How they relate*. That is always safe. Move `Absorbed to` for
   a guide **only** when every entry naming that guide up to that date is built or checked to need
   nothing.
4. **§1:** set the new HEAD and `CHANGELOG reviewed through`. `Actioned through` changes only when §2
   backs it.
5. **`scripts/verify-v2.mjs`:** add a line for every new route or DTO field this panel now calls.
   `npm run verify:api` has to stay green.

Watermarks (HEAD, reviewed-through, actioned-through) live **only** in ledger §1. Don't copy them into
`AGENTS.md`, a comment or a memory.

## Red flags — stop

| Thought | Reality |
|---|---|
| "Bump the dates so we're current" | Refresh `Revision` and reviewed-through. Leave `Absorbed to` alone; moving it hides the unbuilt entries from the next pass. |
| "Start from the last pass date" | Start from the oldest `Absorbed to`. The window since the last pass is not the whole backlog. |
| "It's just a `fix` / `additive`" | Read its `Became false:`. Fixes have withdrawn advice and shipped whole routes. |
| "Faster to diff the guide" | A diff mixes typo fixes with breaking routes. Read the CHANGELOG. |
| "The guide says X but the response says Y, I'll code to Y" | Code to Y and record the guide bug in §5. Doing only one of the two is wrong. |
| "This guide isn't in the table, skip it" | A guide missing from §2 that names `admin-panel` needs a row, with `Absorbed to = —`. |
