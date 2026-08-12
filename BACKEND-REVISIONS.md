# Backend contract revisions — what this panel is current against

`MY_APP` for this repo is **`admin-panel`**.

Every guide in `Germany-ERP/docs/handoff/` carries a `Revision:` date that moves **only on a
client-visible change**. This file records the date we last absorbed, per guide. Nothing pushes those
dates to us and the catch-up loop depends on them — "when we last pulled" is not a substitute,
because a pull moves on typo fixes too.

## The loop

1. `git pull` in the backend checkout, open `docs/handoff/CHANGELOG.md` — newest first, append-only.
2. Read from the **oldest `Absorbed to` date in the table below** downwards.
3. Skip every entry whose `affects:` does not name `admin-panel`.
4. Act in order: **`Became false:`** (quotes a sentence we may have coded against — assume we did)
   → **`Gone:`** (delete that handling) → **`Replaced by:` / `Do this:`**.
   `Kind: additive` still needs its `Became false:` read — a **count or enumeration we hard-coded**
   (export columns, enum values, a trigger list) is the recurring trap.
5. Open only the guides that entry names, at the section it points to.
6. Update the table below, and add a line to `scripts/verify-v2.mjs` for anything new we now call.

Precedence: **live response > guide > `README.md`/`guidance.md`**. Never read the C# to answer a
question a guide answers — if a guided surface forces you into `index/`, the guide has a bug, so
[open an issue](https://github.com/esharqhq/Germany-ERP/issues) rather than working around it.

## Guides this panel consumes

Reviewed 2026-08-12. Two separate dates, and confusing them defeats the point of the file:

- **Revision** — the date the *guide* carries upstream. Copied from the backend's catalog table.
- **Absorbed to** — the date *we* are current to. Start the CHANGELOG read from the oldest of these.

`State` is what we have actually verified, not what we assume.

| Guide | Revision | Absorbed to | State | Notes |
|---|---|---|---|---|
| `f-02-4-owner-table-filters.md` | 2026-08-12 | — | ❌ **no** | Company city, last-ordered, task count — with 3 columns, 3 sort keys, 3 export columns. Not started. The largest outstanding gap. |
| `fnd-3-table-query.md` | 2026-08-12 | 2026-08-11 | ⚠ partly | The owners/workers tables use it. F-02 #4's three new sort keys and three export columns are not built; `invalid_filter_value` went from 3 triggers to 6. |
| `f-02b-6-default-owner-walk-in-orders.md` | 2026-08-12 | 2026-08-12 | ✅ yes | The walk-in page (PR #21). Its Revision moved to 08-12 via F-02 #4's Owners-table changes, not via anything in the order-filing flow. |
| `contract-lifecycle.md` | 2026-08-11 | 2026-08-11 | ⚠ partly | §7.7 `ownerLegalName`/`workerLegalName` modelled and carried on `RegistryRow` as `partyLegalName`. **Nothing renders it yet** — the registry itself is unbuilt, so whoever builds it must show both names and render nothing when the legal one is null. |
| `onboarding-and-active-gate.md` | 2026-08-11 | 2026-08-11 | ⚠ partly | §10.3 `prefill.legalName` modelled. Our authoring flow has no contracting-party name field — the admin uploads a PDF — so there is currently nowhere to use it. |
| `f-02a-1-admin-task-list-filters.md` | 2026-08-10 | 2026-08-10 | ⚠ partly | The conditional row cap is understood and documented at the call site. **None of the four filters** (`propertyId`, `scheduledFrom`, `scheduledTo`, repeatable `status`) are built, so the dispatch page still sends no window and 500 is the live bound. |
| `f-02b-7-admin-owner-edit.md` | 2026-08-10 | 2026-08-10 | ✅ yes | Verified: `owner_has_open_tasks` handled, dead `boss_has_active_properties` documented as removed. |
| `f-03-1-structured-document-data.md` | 2026-08-10 | 2026-08-10 | ✅ yes | v2 phases. Gated by `verify-v2.mjs`. |
| `f-02c-property-rework.md` | 2026-08-07 | 2026-08-07 | ✅ yes | Verified: `category` FK object, no `docsStatus`, property entries in `verify-v2.mjs`. |
| `fnd-1-configurable-lookups.md` | 2026-08-07 | 2026-08-07 | ✅ yes | v2 phase 4. |
| `notification-bell.md` | 2026-08-05 | 2026-08-05 | ✅ yes | v2 phase 4. |
| `fnd-2-admin-initiated-ticket.md` | 2026-08-03 | 2026-08-03 | ✅ yes | Gated by `verify-v2.mjs` (`AdminOpenTicketRequest`). |
| `support-ticket-followup-fix.md` | 2026-07-01 | 2026-07-01 | ✅ assumed | Not re-verified today. |
| `task-cancel-lifecycle-guards.md` | 2026-07-01 | 2026-07-01 | ✅ assumed | Not re-verified today. |
| `worker-doc-approved-delete-guard.md` | 2026-07-01 | 2026-07-01 | ✅ assumed | Not re-verified today. |

Guides whose `Consumers:` do not include `admin-panel` are deliberately absent: the four
`worker-chat*` guides and `admin-assigned-group-visibility.md`. `who-builds-what.md` and
`worker-chat.md` are superseded stubs.

## Known guide bug, unreported

`bossOwnerName` on `PropertyDto` exists only in `index/dtos/properties.md:156`;
`f-02c-property-rework.md` still shows a `bossOwnerUserId`-only response. Per the precedence rule this
is an issue to open on the backend repo, not something to work around here.
