---
name: erp-backend-source
description: Use when work in ERP-Admin touches the Germany ERP backend contract — building or changing a screen that calls the API, "the backend moved", "catch up with the backend", "do a return pass", reading a handoff guide or CHANGELOG entry, updating BACKEND-REVISIONS.md, a response that disagrees with a guide, or any pointer to ../Backend, admin-panel-tasks.md or a handoff doc that does not resolve.
---

# erp-backend-source — working against the Germany ERP backend

**`MY_APP` = `admin-panel`.** Backend checkout: **`$env:GERMANY_ERP`**
(`D:\Victus\Projects\Backend\Germany ERP`, on `main`). The path has a space, so always quote it:
`git -C "$GERMANY_ERP" …` in Bash, `git -C "$env:GERMANY_ERP" …` in PowerShell. `../Backend` does
not exist. Old comments and plans that cite it mean this checkout.

## Where things live — one copy each

| What | Where |
|---|---|
| The contract | `"$GERMANY_ERP/docs/handoff/"` — `README.md` catalog, `guidance.md` route, `CHANGELOG.md` delta, one `<slug>.md` per feature |
| Backend truth, **only where no guide exists** | `"$GERMANY_ERP/index/{controllers,dtos,flows,schemas}/<domain>.md"` |
| Our watermarks, guide table, pass log | `BACKEND-REVISIONS.md` (repo root) — **§1 is the only place** a pass date or HEAD is written |
| Our backend task list | `BACKEND-REVISIONS.md` → §3 *Open work* |
| What we asked the backend for | `BACKEND-ASKS.md` |

## Pick the procedure

- The guide's row in ledger §2 has `Absorbed to = —`, or it has no row: **`references/first-time.md`**.
- "The backend moved" / "catch up" / a new session after a pull: **`references/return-pass.md`**.
- Building or changing one screen:
  1. Grep all of `guidance.md` for the screen's name. Admin rows are not always in §4: the
     *Agency links* row sits in §2.
  2. Read the guides that row names, **as a set** (see below).
  3. Check whether the screen already exists here.
  4. Read the matching §3 *Open work* rows before writing code.

## Rules that hold in every procedure

1. **Two source levels, never mixed.** Use the guide first. It is written to be enough on its own.
   Use `index/` only for a surface with no guide. If a guided surface sends you to `index/` or the
   C#, the guide has a bug: record it in ledger §5.
2. **Read the set, not the file.** Shapes come from the frontmatter (`extends:`, `related:`) and
   README *How they relate*:
   - an **extension** omits auth and the scope gate, so read the guide it `extends:` first;
   - a **companion set** is incomplete alone, so read every guide in the set;
   - **standalone** means exactly that.

   Go **one level** only: the guide, its `extends:` and its `related:`. Don't follow the `related:`
   lists of those guides.
3. **Precedence: live response > guide > `README.md`/`guidance.md`.** If a guide disagrees with a
   real response, the response is right. Report the mismatch upstream (ledger §5). Never patch
   around it silently, because the other two clients hit the same surface.
4. **Reviewed ≠ actioned.** `CHANGELOG reviewed through` moves when you have *read* an entry.
   `Absorbed to` moves only when the entry is *built*, or checked and found to need no change.
   "Bump the dates so we're current" means refresh the `Revision` column and the reviewed-through
   date. It never means moving `Absorbed to`.
5. **Watermarks live only in ledger §1.** When `AGENTS.md`, a comment or a memory repeats a pass date,
   delete that copy rather than updating it.
6. **Cite path-independently in code:** a guide by file name (`f-05-c-worker-agency-link.md §4.2`), an
   index file by backend-relative path (`index/dtos/notifications.md`).

## The five that have bitten someone

`guidance.md` §6 has the full list (~15 items, all mandatory). These five keep coming back:

- **No enum is exhaustive.** Always write a default branch. `onboardingStatus` gained
  `NotApplicable` and an exhaustive `switch` fell through.
- **Read exports by header name, never by column position.** The owner export's column count has gone
  9→10→13→15→16→18, and the worker export's 16→18→17→18→20. It shrank once.
- **An empty-bodied `403` is permissions, not onboarding.** There is no code to branch on.
- **A `200 []` can mean you asked the wrong question.** For example, a sub-account calling a
  BOSS-scoped read gets an empty success.
- **A `500` does not mean the write failed.** Notifications fire after commit. Re-read before any
  retry, because a blind retry can apply the write twice.

## Never

- Code against `docs/mind/`. Briefs and idea cards describe things nobody built.
- `git diff` a guide to find what changed. A diff can't tell a typo fix from a route that now needs a
  body. The CHANGELOG is the delta.
- Trust a field table copied into `README.md`/`guidance.md`, or anywhere in this repo. That copy is a
  docs bug.
- Assume a guide is stale because it looks old. Guides are living documents, corrected in place. The
  `Revision:` date is the only staleness signal.
