# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

ERP-Admin is the **super-admin panel** (`MY_APP = admin-panel`) of the Germany ERP backend. It is one
of three clients; the owner and worker mobile apps are the others. Everything it shows comes from that
backend. Load the `erp-backend-source` skill before any work that touches the API contract.

## Commands

```bash
npm run dev            # next dev on :3000 — needs NEXT_PUBLIC_API_URL (see .env.local)
npm run build          # production build (output: "standalone", used by the Dockerfile)
npm run lint           # eslint (next core-web-vitals + typescript)
npx tsc --noEmit       # typecheck — no npm script; this is how components are verified
npm test               # vitest run (whole suite)
npx vitest run lib/tasks/order.test.ts        # one file
npx vitest run lib/tasks/order.test.ts -t "title"   # by describe/it name
npm run verify:api     # contract check against the LIVE swagger (ERP_API overrides https://api.uyer.app)
```

`verify:api` (`scripts/verify-v2.mjs`) checks two things against the live API: that our TS unions
still match its enums, and that the DTO fields we read still exist. When the panel starts calling a new
route or field, add a line for it there.

## Architecture

**Routing:** everything lives under `app/[locale]/…`. The locales are `en` and `de`, and the prefix is
always present. The dashboard's route groups `(owner)` and `(worker)` only organise folders; they add
nothing to the URL.
- The middleware file is **`proxy.ts`**, exporting `proxy()`. This is Next 16's name for it, not
  `middleware.ts`.
- `proxy.ts` gates on the `auth-token` cookie and redirects to `/{locale}/login`.
- It also handles `MAINTENANCE_MODE=1`, by rewriting to `/maintenance` with a 503. That check runs
  before auth, on purpose.
- After those checks it hands off to next-intl.

**The data path is layered, one layer per folder:**

| Layer | Where | Rule |
|---|---|---|
| DTO types | `lib/types/*.types.ts` | Mirror the backend DTOs. Doc comments cite the handoff guide by file name (`f-05-c-worker-agency-link.md §4.2`) |
| HTTP | `lib/http/client.ts` | One axios `apiClient`. It adds the Bearer token (read from the persisted zustand store, `localStorage["auth-storage"]`). On a 401 it refreshes once and replays the queued requests, but never for the login/session-minting endpoints |
| Services | `lib/services/*.service.ts` | Plain objects of async functions around `apiClient`. No React |
| Hooks | `hooks/use-*.ts` | TanStack Query wrappers around services. They own query keys and invalidation |
| Pure logic | `lib/<domain>/*.ts` (`tasks`, `owners`, `workers`, `complaints`, …) | Request builders, status vocabularies, error-code → message maps, derived state. **This is where the behaviour lives, and it is what the tests cover** |
| UI | `components/<domain>/`, `components/ui/` | Pages in `app/` stay thin |

**Tests:** vitest runs in the `node` environment and only picks up `lib/**/*.test.ts` and
`hooks/**/*.test.ts`, with each test next to the file it tests. There are no component tests on purpose;
components are checked by `tsc`, `build` and looking at them. That is why client-side refusals belong in
a `lib/` builder, not in a disabled button. For example, `buildWalkInOrder` refuses a missing location,
so the refusal has a test.

**Errors:** backend errors come in three shapes, and the handler has to cover all of them:
1. `{ error: "<code>" }`, read with `getApiErrorCode`;
2. ASP.NET problem-details with no `error` field (a `[Required]` or enum binding failure), read with
   `getValidationMessage`;
3. a `403` with an empty body, which means permissions.

Map in that order, then fall back to a generic message. The helpers are in `lib/http/api-error.ts`;
per-domain code maps live in `lib/<domain>/*-errors.ts`.

**Idempotency:** routes marked `[Idempotent]` take the `X-Idempotency-Key` header. Mint the key
**once per user intent** with `newIdempotencyKey()` and hold it in a ref for every retry of that intent,
then pass it through `idempotent(key)` (`lib/http/idempotency.ts`). A fresh key per request turns a
retry into a duplicate.

**Permissions:** the JWT carries only the role code. The real grant set comes from
`GET /api/admin/me/permissions`, through `useCurrentPermissions()`:
- it polls, refetches on focus, and is seeded from the persisted store;
- `null` means unknown, and the UI must treat unknown as **hide** (fail closed);
- gate UI with `<Can permission="…">` (`components/auth/can.tsx`).

There are two built-in roles plus custom ones: `SUPER_ADMIN`, `MODERATOR` (a subset) and
`custom_<uuid>`. Never assume a moderator can write.

Nav entries in `lib/nav-items.ts` carry their permission code, and route gating reuses the same codes:
`resolveRouteGate` matches by path prefix, so a detail route is covered by its list's gate. An entry the
admin lacks is shown dimmed with a lock and links to `/forbidden?permission=<code>`. It is never hidden.

⚠ Some comments cite `lib/http/on-forbidden.ts` (a 403-triggered refetch). That file never existed; see
`BACKEND-REVISIONS.md` §6.1.

**Realtime:** SignalR is used in two places:
- `providers/notification-provider.tsx`, the notification bell hub, mounted in the dashboard layout;
- `hooks/use-conversation-hub.ts`, for support chat.

Push notifications go through OneSignal (`providers/onesignal-provider.tsx`, `NEXT_PUBLIC_ONESIGNAL_APP_ID`).

**i18n:** next-intl, with messages in `messages/en.json` and `messages/de.json`. The two files are kept
key-for-key identical, so a UI string change edits both. `labelKey`s in `nav-items.ts` point into them.

**UI kit:** shadcn with style `base-nova`, which is built on **`@base-ui/react`, not Radix**. Its
component APIs differ from the shadcn docs you know, so check `components/ui/` before using a
primitive. Tables use `components/ui/data-table`. URL-synced table state lives in
`hooks/use-table-url-state.ts`.

**Environment:**
- `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_ONESIGNAL_APP_ID` are inlined at build time.
- `HEALTH_URL`, `DEPLOY_REGION`, `MAINTENANCE_MODE` and `MAINTENANCE_UNTIL` are server-only and read at
  runtime, so an operator can change them without rebuilding.

Deploy uses `Dockerfile`, `docker-compose*.yml` and `nginx/`.

## Repo-root documents

| File | What it is |
|---|---|
| `BACKEND-REVISIONS.md` | Contract ledger: watermarks, the guide table, **§3 Open work** (the backend task list), pass log |
| `BACKEND-ASKS.md` | What this panel asked the backend for, and the status of each ask |
| `FRONTEND-HANDOFF.md` | The contract for asks #1–6 and (a)–(f), all shipped. It is older than the `docs/handoff/` guides, which win where they disagree |
| `docs/superpowers/{specs,plans}/` | Design specs and implementation plans per feature. `/docs` is gitignored, and these files are force-added |
