# First-time read — a guide (or the whole contract) this panel has never absorbed

Use this when a guide's row in `BACKEND-REVISIONS.md` §2 says `Absorbed to = —`, when the guide has no
row, or when you are starting on a surface for the first time.

## 1. `guidance.md`, once per session that builds against it

Pull first (`references/return-pass.md` step 0). Then read these sections of
`"$GERMANY_ERP/docs/handoff/guidance.md"`:

- **§4 Admin panel**: our route. Each row names its guide(s) and what the guide is "worth knowing".
- **§5 Boundaries**: enforced by real `403`s and `404`s.
- **§2's signature-pad box**: a client obligation. It is hard *because* the server does not check it.
- **§6 Known behaviour**: ~15 items, all mandatory.
- **§7, both halves**: what shipped with no guide (read `index/` for those), and what **does not
  exist** (don't build against the briefs).
- The closing *lessons* section. For example, a guard written as a refusal-list silently admits
  every state added after it, so write guards as allowlists.

## 2. The guide, as its whole set

Get the shape from README *How they relate* and the guide's frontmatter (`extends:`, `related:`):

- **extension** → read the guide it `extends:` **first**. The extension omits auth and the scope gate.
  (`f-05-a`, `f-05-b` and `f-05-c` all extend `f-05-0-agency-user-type.md`.)
- **companion set** → read every guide in `related:`. None of them is complete on its own.
- **standalone** → just this one.

## 3. Check the code against it, then record it

1. Grep the repo for the guide's routes, DTO fields and error codes. Citing a guide in a comment is
   **not** evidence that it was absorbed. Verify behaviour.
2. Set its ledger §2 row:
   - `Revision` = the guide's `revision:`;
   - `Absorbed to` = that same date, and only if everything it describes for `admin-panel` is built
     or checked;
   - `State` = ✅ yes / ⚠ partly (say what is missing in Notes).
3. Everything read and not built becomes a row in §3 *Open work*.
4. Add `scripts/verify-v2.mjs` lines for any route or field the panel now depends on.
