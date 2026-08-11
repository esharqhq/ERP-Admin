# Owner Detail v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Owner Detail so it stops repeating itself, shows the owner's submitted documents and their week of booked work, and lets an admin call or open a ticket without leaving the page.

**Architecture:** Four independent slices, each shippable alone. The weekly view flattens the task groups the page already fetches — one query, two renderings — with all row logic in `lib/` because vitest here cannot reach components. Everything else is presentational work over data A1 already put on the page.

**Tech Stack:** Next.js 16 App Router · React 19.2.4 · TypeScript · TanStack Query · next-intl (en/de) · Vitest (node env, no jsdom)

**Spec:** `docs/superpowers/specs/2026-08-11-owner-detail-v2-design.md`

## Global Constraints

- **Vitest covers `lib/**` and `hooks/**` only** — node environment, no jsdom, no component tests. Logic that must be verified belongs in `lib/`.
- **next-intl throws on a missing key.** Every key must exist in **both** `messages/en.json` and `messages/de.json` before the component reading it renders.
- **`react-hooks/set-state-in-effect` is enforced.** Do not reset state in a `useEffect`. Dialogs are mounted only while open by their parent, seeding state on first render — the pattern `PropertyActions` and `OwnerActions` already use.
- **Do not route errors through `ErrorNotice`/`describeApiError`** for owner routes: the shared catalog's messages are written for the contract routes. Reuse `isPermissionDenied` from `lib/onboarding/errors.ts` only.
- **The owner's photo will render as initials until the backend adds `profilePictureUrl` to `OwnerSummaryDto`.** That is expected, not a bug to chase.
- Commit after every task. Run `npx tsc --noEmit`, `npm run lint` and `npx vitest run` before each commit.

---

### Task 1: Layout — one fact in one place

Removes the stat row, resolves three duplications, moves Properties into the right column, and puts the photo, onboarding stage and call badge on the hero card.

`ActivityTimeline` **stays** in the left column through this task. Task 4 replaces it; removing it now would leave the page's main column empty for three tasks.

**Files:**
- Modify: `components/owners/hero-card.tsx`
- Modify: `app/[locale]/dashboard/(owner)/owners/[id]/page.tsx`
- Modify: `messages/en.json`, `messages/de.json`

**Interfaces:**
- Consumes: `onboardingStatusPresentation` from `lib/onboarding/status.ts`; `identity`/`kyc` already wired by A1.
- Produces: `<HeroCard owner isWalkIn onboardingStatus />` where `onboardingStatus: string | null`.

- [ ] **Step 1: Add the copy**

In `messages/en.json` under `owners.account`, add:

```json
"call": "Call",
```

In `messages/de.json` under `owners.account`:

```json
"call": "Anrufen",
```

Verify both parse and match:

```bash
node -e "
const en=require('./messages/en.json'), de=require('./messages/de.json');
const k=o=>Object.keys(o).sort().join(',');
console.log('account match:', k(en.owners.account)===k(de.owners.account));
console.log('call:', en.owners.account.call, '|', de.owners.account.call);
"
```
Expected: `account match: true`, then both words.

- [ ] **Step 2: Rewrite the hero card**

Replace `components/owners/hero-card.tsx` entirely:

```tsx
import { Mail, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTranslations } from "next-intl";
import { onboardingStatusPresentation } from "@/lib/onboarding/status";
import type { OwnerSummaryDto } from "@/lib/types/owner.types";

/**
 * The one place this screen states who the owner is: photo, display name,
 * role, and onboarding stage. Each of those used to appear twice — once here
 * and once in a stat card — so the stat row is gone and this is the single
 * source.
 *
 * The verified/unverified badge went with it. It is a different fact from the
 * onboarding stage, but a narrower one: an admin looking at an owner wants to
 * know how far through onboarding they are, and two status badges side by side
 * read as contradictory rather than complementary.
 */
export function HeroCard({
  owner,
  isWalkIn = false,
  onboardingStatus,
}: {
  owner: OwnerSummaryDto;
  isWalkIn?: boolean;
  /** `null` when the KYC read 404'd or was refused — the badge is then omitted. */
  onboardingStatus?: string | null;
}) {
  const t = useTranslations("owners");
  const tOnboarding = useTranslations("onboarding");
  const initials = (owner.fullName || "??").slice(0, 2).toUpperCase();

  // `OwnerSummaryDto` does not carry profilePictureUrl yet — GET /api/owners/{id}
  // omits it although the entity has it and the PUT returns it. Written to render
  // the photo the moment the backend adds the field; initials until then.
  const pictureUrl = (owner as { profilePictureUrl?: string | null }).profilePictureUrl ?? null;

  const presentation = onboardingStatus
    ? onboardingStatusPresentation(onboardingStatus)
    : null;

  return (
    <Card className="overflow-hidden">
      <div
        aria-hidden
        className="h-24 w-full bg-gradient-to-r from-primary/12 via-primary/6 to-accent/10"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(16,54,125,0.18) 1px, transparent 0)",
          backgroundSize: "18px 18px",
        }}
      />
      <CardContent className="-mt-12 flex flex-col gap-5 pb-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-end gap-4">
            <Avatar className="size-24 ring-4 ring-background shadow-sm">
              {pictureUrl ? <AvatarImage src={pictureUrl} alt="" /> : null}
              <AvatarFallback className="bg-primary text-2xl font-semibold text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1.5 pb-1">
              <h1 className="font-heading text-2xl font-bold tracking-tight leading-tight sm:text-[28px]">
                {owner.fullName || "—"}
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                {owner.roleCode && <Badge variant="secondary">{owner.roleCode}</Badge>}
                {presentation ? (
                  <Badge variant={presentation.variant} className={presentation.className}>
                    {tOnboarding(
                      `status.${presentation.labelKey}` as Parameters<typeof tOnboarding>[0],
                    )}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>

          {/* Both are plain links, not integrations. The call button hands the
              number to the OS and hears nothing back — there is deliberately no
              call log, because "an admin clicked a button" is not evidence a
              call happened. */}
          <div className="flex items-center gap-2">
            {owner.phoneNumber && !isWalkIn && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                nativeButton={false}
                render={<a href={`tel:${owner.phoneNumber}`} />}
              >
                <Phone className="size-4" />
                {t("account.call")}
              </Button>
            )}
            {owner.email && !isWalkIn && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                nativeButton={false}
                render={<a href={`mailto:${owner.email}`} />}
              >
                <Mail className="size-4" />
                {t("account.email")}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

`components/ui/avatar.tsx` exports `AvatarImage` — verified, no substitution needed.

- [ ] **Step 3: Rewrite the page body**

In `app/[locale]/dashboard/(owner)/owners/[id]/page.tsx`:

Remove the `StatCard` import and the `ShieldCheck, CalendarDays, Home, UserCog` icon imports (keep `ArrowLeft` and `Info`). Remove the `formatJoined` helper and the `locale`/`useLocale` usage if nothing else needs them — check before deleting.

Delete the entire stat-card grid block (the `<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">` and its four `<StatCard …/>` children).

Pass the onboarding stage to the hero:

```tsx
      <HeroCard
        owner={owner}
        isWalkIn={actions.isWalkIn}
        onboardingStatus={kyc.data?.onboardingStatus ?? null}
      />
```

Replace the two-column block so Properties sits in the right column between Contact and Sub-accounts:

```tsx
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <ActivityTimeline
            taskGroups={taskGroups}
            propertyNames={Object.fromEntries(
              properties.map((p) => [p.id, p.name ?? "—"]),
            )}
          />
        </div>

        <div className="flex flex-col gap-6">
          <ContactCard owner={owner} identity={identity} />
          <PropertyList properties={properties} />
          <SubAccountsCard ownerId={id} />
        </div>
      </div>
```

- [ ] **Step 4: Run the gates**

```bash
npx tsc --noEmit
npm run lint
npx vitest run
npm run build
```
Expected: `tsc` silent · lint clean · 100 tests pass · build succeeds.

If `tsc` reports `locale` or `formatJoined` unused, delete them — they existed only for the stat row.

- [ ] **Step 5: Commit**

```bash
git add components/owners/hero-card.tsx "app/[locale]/dashboard/(owner)/owners/[id]/page.tsx" messages/en.json messages/de.json
git commit -m "feat(owners): one fact in one place on Owner Detail, plus a call link"
```

---

### Task 2: Message an owner — a ticket, not a chat

**Files:**
- Modify: `lib/types/support.types.ts`
- Modify: `lib/services/support.service.ts`
- Modify: `hooks/use-support.ts`
- Create: `components/owners/message-owner-dialog.tsx`
- Modify: `components/owners/owner-actions.tsx`
- Modify: `messages/en.json`, `messages/de.json`
- Modify: `scripts/verify-v2.mjs`

**Interfaces:**
- Consumes: `OwnerDetailActions` from `lib/owners/detail-actions.ts` (A1).
- Produces: `AdminCreateTicketRequest`; `supportService.createForUser(body) → Promise<SupportTicketDto>`; `useCreateTicketForUser()`; `<MessageOwnerDialog open onClose pending error onSubmit />`.

- [ ] **Step 1: Add the request type**

Append to `lib/types/support.types.ts`:

```ts
/** Values the backend accepts for a ticket's category (FND-2). */
export const TICKET_CATEGORIES = [
  "Payment",
  "Task",
  "Property",
  "Technical",
  "Account",
  "Other",
] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export const TICKET_PRIORITIES = ["Low", "Normal", "High", "Urgent"] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

/**
 * Body of `POST /api/support-tickets/admin/for-user` (FND-2), permission
 * `support_ticket:create_for_user` (120015).
 *
 * `targetUserType` is a string rather than a union because the accepted
 * literal for an owner differs between the backend's own `index/` notes
 * ("normalized to OWNER_USER") and its handoff guide ("`Owner` is accepted;
 * `OwnerUser` is not"). The value used here is verified against the live API
 * before shipping — see the plan's Task 2 Step 6.
 */
export interface AdminCreateTicketRequest {
  targetUserType: string;
  targetUserId: string;
  subject: string;
  initialMessage: string;
  category: TicketCategory;
  priority?: TicketPriority;
  relatedPropertyId?: string;
  relatedTaskGroupId?: string;
  relatedTaskId?: string;
}
```

- [ ] **Step 2: Add the service call**

In `lib/services/support.service.ts`, add inside `supportService`:

```ts
  /**
   * Admin opens a ticket addressed to an owner or worker (FND-2). The recipient
   * sees it as a support thread, not a chat message, so the exchange keeps a
   * status and a history rather than scrolling away.
   *
   * `400 owner_is_system` for the walk-in account — it cannot log in, so a
   * ticket addressed to it could never be read.
   */
  createForUser: async (
    body: AdminCreateTicketRequest,
  ): Promise<SupportTicketDto> => {
    const { data } = await apiClient.post<SupportTicketDto>(
      "/api/support-tickets/admin/for-user",
      body,
    );
    return data;
  },
```

Add `AdminCreateTicketRequest` to the existing type import at the top of the file.

- [ ] **Step 3: Add the hook**

In `hooks/use-support.ts`, add:

```ts
/**
 * Opening a ticket adds a row to every support list, so both the inbox and the
 * ticket list are invalidated. Nothing on Owner Detail displays tickets, so
 * this page needs no refetch of its own.
 */
export function useCreateTicketForUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminCreateTicketRequest) => supportService.createForUser(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["support-inbox"] });
      qc.invalidateQueries({ queryKey: ["support-tickets"] });
    },
  });
}
```

Both keys are real — `hooks/use-support.ts` already registers `["support-tickets", …]` and invalidates `["support-inbox"]` elsewhere in the same file. Verified; do not invent a third.

Add `useMutation`/`useQueryClient` to the `@tanstack/react-query` import if absent, and import `AdminCreateTicketRequest`.

- [ ] **Step 4: Add the copy**

In `messages/en.json` under `owners`, beside `edit`:

```json
"message": {
  "action": "Message",
  "title": "Open a ticket for this owner",
  "description": "The owner sees this as a support ticket, not a chat — it keeps a status and a full history, and nothing gets lost in a scroll.",
  "category": "Type",
  "subject": "Subject",
  "subjectPlaceholder": "What is this about?",
  "body": "Message",
  "bodyPlaceholder": "Write the first message of the ticket...",
  "priority": "Priority",
  "confirm": "Create ticket",
  "created": "Ticket created.",
  "required": "Type, subject and message are all required.",
  "categories": {
    "Payment": "Payment",
    "Task": "Task",
    "Property": "Property",
    "Technical": "Technical",
    "Account": "Account",
    "Other": "Other"
  },
  "priorities": {
    "Low": "Low",
    "Normal": "Normal",
    "High": "High",
    "Urgent": "Urgent"
  },
  "errors": {
    "invalidTarget": "This recipient type is not accepted for a ticket.",
    "notFound": "This owner no longer exists, or has been deleted.",
    "isSystem": "The permanent walk-in account cannot be messaged — it cannot sign in, so nobody would read it.",
    "forbidden": "You do not have permission to open tickets for other users.",
    "generic": "Could not create the ticket. Please try again."
  }
},
```

In `messages/de.json` under `owners`:

```json
"message": {
  "action": "Nachricht",
  "title": "Ticket für diesen Eigentümer öffnen",
  "description": "Der Eigentümer sieht dies als Support-Ticket, nicht als Chat — mit Status und vollständigem Verlauf, sodass nichts im Scrollen verloren geht.",
  "category": "Typ",
  "subject": "Betreff",
  "subjectPlaceholder": "Worum geht es?",
  "body": "Nachricht",
  "bodyPlaceholder": "Erste Nachricht des Tickets schreiben...",
  "priority": "Priorität",
  "confirm": "Ticket erstellen",
  "created": "Ticket erstellt.",
  "required": "Typ, Betreff und Nachricht sind alle erforderlich.",
  "categories": {
    "Payment": "Zahlung",
    "Task": "Auftrag",
    "Property": "Objekt",
    "Technical": "Technisch",
    "Account": "Konto",
    "Other": "Sonstiges"
  },
  "priorities": {
    "Low": "Niedrig",
    "Normal": "Normal",
    "High": "Hoch",
    "Urgent": "Dringend"
  },
  "errors": {
    "invalidTarget": "Dieser Empfängertyp wird für ein Ticket nicht akzeptiert.",
    "notFound": "Dieser Eigentümer existiert nicht mehr oder wurde gelöscht.",
    "isSystem": "Das dauerhafte Walk-in-Konto kann nicht angeschrieben werden — es kann sich nicht anmelden, niemand würde es lesen.",
    "forbidden": "Sie haben keine Berechtigung, Tickets für andere Benutzer zu öffnen.",
    "generic": "Ticket konnte nicht erstellt werden. Bitte erneut versuchen."
  }
},
```

Verify parity:

```bash
node -e "
const en=require('./messages/en.json'), de=require('./messages/de.json');
const k=o=>Object.keys(o).sort().join(',');
for (const p of ['message','message.categories','message.priorities','message.errors']) {
  const get=(o)=>p.split('.').reduce((a,s)=>a[s],o.owners);
  console.log(p, k(get(en))===k(get(de)));
}
"
```
Expected: four `true` lines.

- [ ] **Step 5: Build the dialog**

Create `components/owners/message-owner-dialog.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  type TicketCategory,
  type TicketPriority,
} from "@/lib/types/support.types";

export interface MessageDraft {
  category: TicketCategory;
  subject: string;
  initialMessage: string;
  priority: TicketPriority;
}

interface Props {
  open: boolean;
  onClose: () => void;
  pending: boolean;
  /** Localized parent-mutation error. */
  error?: string | null;
  onSubmit: (draft: MessageDraft) => void;
}

/**
 * **Mount this only while open.** State is seeded on first render and never
 * resynchronised, so a parent that keeps it mounted would show a cancelled
 * draft on the next open.
 */
export function MessageOwnerDialog({ open, onClose, pending, error, onSubmit }: Props) {
  const t = useTranslations("owners");
  const tCommon = useTranslations("common");

  const [category, setCategory] = useState<TicketCategory>("Other");
  const [priority, setPriority] = useState<TicketPriority>("Normal");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  function handleSubmit() {
    setLocalError(null);
    if (!subject.trim() || !body.trim()) {
      setLocalError(t("message.required"));
      return;
    }
    onSubmit({
      category,
      priority,
      subject: subject.trim(),
      initialMessage: body.trim(),
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !pending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("message.title")}</DialogTitle>
          <DialogDescription>{t("message.description")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ticket-category">{t("message.category")}</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as TicketCategory)}
              items={TICKET_CATEGORIES.map((c) => ({
                value: c,
                label: t(`message.categories.${c}` as Parameters<typeof t>[0]),
              }))}
            >
              <SelectTrigger id="ticket-category" disabled={pending}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TICKET_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {t(`message.categories.${c}` as Parameters<typeof t>[0])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ticket-priority">{t("message.priority")}</Label>
            <Select
              value={priority}
              onValueChange={(v) => setPriority(v as TicketPriority)}
              items={TICKET_PRIORITIES.map((p) => ({
                value: p,
                label: t(`message.priorities.${p}` as Parameters<typeof t>[0]),
              }))}
            >
              <SelectTrigger id="ticket-priority" disabled={pending}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TICKET_PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {t(`message.priorities.${p}` as Parameters<typeof t>[0])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ticket-subject">{t("message.subject")}</Label>
          <Input
            id="ticket-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t("message.subjectPlaceholder")}
            disabled={pending}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ticket-body">{t("message.body")}</Label>
          <textarea
            id="ticket-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t("message.bodyPlaceholder")}
            disabled={pending}
            className="min-h-[110px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {localError || error ? (
          <p className="text-sm text-destructive">{localError ?? error}</p>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            {tCommon("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={pending}>
            {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t("message.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

The `items` prop on `Select` is required in this codebase for `<SelectValue>` to resolve a label — omitting it makes the trigger show the raw value. That was fixed once already in the property edit dialog; do not reintroduce it.

- [ ] **Step 6: Wire it into OwnerActions**

In `components/owners/owner-actions.tsx`, add imports:

```tsx
import { MessageSquare } from "lucide-react";
import { MessageOwnerDialog, type MessageDraft } from "@/components/owners/message-owner-dialog";
import { useCreateTicketForUser } from "@/hooks/use-support";
```

Add state and the mutation beside the existing ones:

```tsx
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const createTicket = useCreateTicketForUser();
```

Add the mapper and handler:

```tsx
  function mapMessageError(err: unknown): string {
    if (isPermissionDenied(err)) return t("message.errors.forbidden");
    const code = getApiErrorCode(err);
    if (code === "invalid_target_type") return t("message.errors.invalidTarget");
    if (code === "target_not_found") return t("message.errors.notFound");
    if (code === "owner_is_system") return t("message.errors.isSystem");
    return t("message.errors.generic");
  }

  function handleMessageSubmit(draft: MessageDraft) {
    setMessageError(null);
    createTicket.mutate(
      { ...draft, targetUserType: "Owner", targetUserId: owner.id },
      {
        onSuccess: () => setMessageOpen(false),
        onError: (err) => setMessageError(mapMessageError(err)),
      },
    );
  }
```

Add the button as the **first** child of the wrapping `<div className="flex items-center gap-1">`, gated on the walk-in check rather than on a permission the panel does not model per-action:

```tsx
      {!actions.isWalkIn ? (
        <Can permission="support_ticket:create_for_user">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setMessageError(null);
              setMessageOpen(true);
            }}
          >
            <MessageSquare className="size-4" />
            {t("message.action")}
          </Button>

          {messageOpen ? (
            <MessageOwnerDialog
              open={messageOpen}
              onClose={() => !createTicket.isPending && setMessageOpen(false)}
              pending={createTicket.isPending}
              error={messageError}
              onSubmit={handleMessageSubmit}
            />
          ) : null}
        </Can>
      ) : null}
```

- [ ] **Step 7: Verify the target literal against the live API**

The backend's `index/` says `targetUserType` is *"normalized to `OWNER_USER`/`WORKER`"*; its handoff guide says *"`Owner` is accepted; `OwnerUser` is not"*. Both cannot be the whole truth. Check the live contract before trusting either:

```bash
node -e "
const https=require('https');
" ; node scripts/verify-v2.mjs 2>&1 | grep -i "AdminCreateTicket\|for-user" || echo "not asserted yet — add it in Step 8"
```

Then read the deployed schema directly. If the enum is exposed in swagger, use the value it names. If it is a bare string, send `"Owner"` — the handoff guide is the audience-facing doc and is explicit — and confirm on the browser pass in Task 5 that a ticket is actually created rather than `400 invalid_target_type`.

Record whichever literal worked in a comment on `handleMessageSubmit`.

- [ ] **Step 8: Assert the shape in the contract gate**

In `scripts/verify-v2.mjs`, inside `EXPECTED_FIELDS`:

```js
  // FND-2 admin-initiated ticket. The panel had no client for this route until
  // 2026-08-11, so its request shape was never asserted here.
  AdminCreateTicketRequest: ["targetUserType", "targetUserId", "subject",
    "initialMessage", "category", "priority"],
```

If the live schema names that DTO differently, use the real name — `verify-v2` reports `schema <name> missing from live swagger`, which tells you immediately.

- [ ] **Step 9: Run the gates and commit**

```bash
npx tsc --noEmit
npm run lint
npx vitest run
npm run build
node scripts/verify-v2.mjs
```
Expected: all clean, `verify-v2 ALL PASS` including the new line.

```bash
git add lib/types/support.types.ts lib/services/support.service.ts hooks/use-support.ts components/owners/message-owner-dialog.tsx components/owners/owner-actions.tsx messages/en.json messages/de.json scripts/verify-v2.mjs
git commit -m "feat(owners): an admin can open a ticket for an owner from their detail page"
```

---

### Task 3: Documents card

Read-only, from data A1 already fetches. No new request.

**Files:**
- Create: `components/owners/owner-documents-card.tsx`
- Modify: `app/[locale]/dashboard/(owner)/owners/[id]/page.tsx`
- Modify: `messages/en.json`, `messages/de.json`

**Interfaces:**
- Consumes: `KycProfileDto` from `lib/types/kyc.types.ts`; `kyc.data` already on the page.
- Produces: `<OwnerDocumentsCard ownerProfileId documents />`.

- [ ] **Step 1: Add the copy**

In `messages/en.json` under `owners`:

```json
"documents": {
  "title": "Documents",
  "empty": "This owner has not submitted any documents yet.",
  "openAll": "Open review screen",
  "unavailable": "Documents are not visible with your permissions.",
  "types": {
    "Passport": "Passport",
    "IdCard": "ID card",
    "ResidencePermit": "Residence permit",
    "BusinessLicense": "Business licence",
    "CompanyRegistration": "Company registration",
    "TaxCertificate": "Tax certificate",
    "Other": "Other"
  }
},
```

In `messages/de.json`:

```json
"documents": {
  "title": "Dokumente",
  "empty": "Dieser Eigentümer hat noch keine Dokumente eingereicht.",
  "openAll": "Prüfungsansicht öffnen",
  "unavailable": "Dokumente sind mit Ihren Berechtigungen nicht sichtbar.",
  "types": {
    "Passport": "Reisepass",
    "IdCard": "Personalausweis",
    "ResidencePermit": "Aufenthaltstitel",
    "BusinessLicense": "Gewerbeerlaubnis",
    "CompanyRegistration": "Handelsregisterauszug",
    "TaxCertificate": "Steuerbescheinigung",
    "Other": "Sonstiges"
  }
},
```

Verify parity with the same `node -e` pattern used in Task 2 Step 4, for `documents` and `documents.types`.

- [ ] **Step 2: Build the card**

Create `components/owners/owner-documents-card.tsx`:

```tsx
"use client";

import { FileText, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { KycDocDto } from "@/lib/types/kyc.types";

const TONE: Record<string, string> = {
  approved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  rejected: "bg-destructive/10 text-destructive",
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

/**
 * What the owner submitted, read-only.
 *
 * Approve and reject deliberately live only on `/dashboard/owner-documents/
 * {ownerProfileId}`, which carries the whole review workspace — identity block,
 * company block, per-document verdicts, onboarding stepper. Rebuilding those
 * actions here would put the same rules in two places, and two copies of a rule
 * drift.
 */
export function OwnerDocumentsCard({
  ownerProfileId,
  documents,
}: {
  /** `null` when the KYC read 404'd or was refused — the card then explains why. */
  ownerProfileId: string | null;
  documents: KycDocDto[] | null;
}) {
  const t = useTranslations("owners");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <h2 className="font-heading text-base font-semibold tracking-tight">
          {t("documents.title")}
        </h2>
        {ownerProfileId ? (
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            className="gap-1 text-[12px] text-muted-foreground hover:text-foreground"
            render={<Link href={`/dashboard/owner-documents/${ownerProfileId}`} />}
          >
            {t("documents.openAll")}
            <ExternalLink className="size-3.5" />
          </Button>
        ) : null}
      </CardHeader>

      <CardContent className="flex flex-col gap-2">
        {!ownerProfileId ? (
          <p className="text-sm text-muted-foreground">{t("documents.unavailable")}</p>
        ) : !documents || documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("documents.empty")}</p>
        ) : (
          documents.map((doc) => {
            const status = (doc.status ?? "").toLowerCase();
            return (
              <a
                key={doc.id}
                href={doc.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2 transition-colors hover:bg-accent/40"
              >
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[13px] font-medium">
                    {t(`documents.types.${doc.type}` as Parameters<typeof t>[0])}
                  </span>
                  <span className="truncate text-[11px] text-muted-foreground">
                    {doc.fileName}
                  </span>
                </div>
                <Badge variant="secondary" className={TONE[status] ?? ""}>
                  {doc.status}
                </Badge>
              </a>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
```

If `t()` throws on an unrecognised `doc.type`, the enum grew server-side. Guard it: `TICKET`-style, fall back to `doc.type` when the key is missing — check how `onboardingStatusPresentation` degrades and mirror that shape.

- [ ] **Step 3: Add it to the page**

In the right column of `app/[locale]/dashboard/(owner)/owners/[id]/page.tsx`, after `<PropertyList …/>`:

```tsx
          <OwnerDocumentsCard
            ownerProfileId={kyc.data?.ownerProfileId ?? null}
            documents={kyc.data?.documents ?? null}
          />
```

Import it at the top.

- [ ] **Step 4: Run the gates and commit**

```bash
npx tsc --noEmit
npm run lint
npx vitest run
npm run build
```

```bash
git add components/owners/owner-documents-card.tsx "app/[locale]/dashboard/(owner)/owners/[id]/page.tsx" messages/en.json messages/de.json
git commit -m "feat(owners): the owner's submitted documents, read-only, beside their properties"
```

---

### Task 4: The week of booked work

Replaces `ActivityTimeline`. Two views over one query.

**Files:**
- Create: `lib/tasks/weekly-rows.ts`
- Test: `lib/tasks/weekly-rows.test.ts`
- Modify: `components/tasks/tasks-calendar.tsx`
- Create: `components/owners/weekly-work-card.tsx`
- Modify: `app/[locale]/dashboard/(owner)/owners/[id]/page.tsx`
- Delete: `components/owners/activity-timeline.tsx`, `components/owners/stat-card.tsx`
- Modify: `messages/en.json`, `messages/de.json`

**Interfaces:**
- Consumes: `TaskGroupDto`, `TaskItemDto`, `TaskWorkerDto`, `normalizeStatus` from `lib/types/task.types.ts`; `useWeekNavigation` from `hooks/use-week-navigation.ts`; `useOwnerTaskGroups` from `hooks/use-owners.ts`.
- Produces: `toLocalDateKey(d)`, `flattenTaskRows(groups, propertyNames)`, `rowsInWeek(rows, dateKeys)`, `filterRowsByStatus(rows, status)`, `workerSummary(row)`, and the `WeeklyTaskRow` type.

- [ ] **Step 1: Write the failing test**

Create `lib/tasks/weekly-rows.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  flattenTaskRows,
  filterRowsByStatus,
  rowsInWeek,
  toLocalDateKey,
  workerSummary,
} from "@/lib/tasks/weekly-rows";
import type { TaskGroupDto } from "@/lib/types/task.types";

function worker(name: string | null, outcome = "assigned") {
  return {
    id: `w-${name}`,
    taskId: "t1",
    workerId: `id-${name}`,
    workerName: name,
    outcome,
    starRating: null,
    assignedAt: "2026-08-10T00:00:00Z",
    checkinAt: null,
    submittedAt: null,
    checkoutAt: null,
    checkinLat: null,
    checkinLng: null,
  };
}

const GROUP: TaskGroupDto = {
  id: "g1",
  propertyId: "p1",
  ownerId: "o1",
  title: "Weekly cleaning",
  defaultStartTime: "09:00:00",
  defaultDeadline: null,
  instructions: null,
  status: "Pending",
  ratingFloor: 0,
  allowNewWorkers: true,
  eligibleProfessionIds: [],
  dates: [],
  createdAt: "2026-08-01T00:00:00Z",
  tasks: [
    {
      id: "t1",
      groupId: "g1",
      propertyId: "p1",
      propertyName: null,
      scheduledDate: "2026-08-12",
      scheduledAt: "2026-08-12T09:00:00Z",
      deadline: null,
      status: "Pending",
      requiredWorkerCount: 2,
      startedAt: null,
      completedAt: null,
      workers: [worker("Ali"), worker("Bek")],
    },
    {
      id: "t2",
      groupId: "g1",
      propertyId: "p1",
      propertyName: null,
      scheduledDate: "2026-08-20",
      scheduledAt: "2026-08-20T09:00:00Z",
      deadline: null,
      status: "Done",
      requiredWorkerCount: 1,
      startedAt: null,
      completedAt: null,
      workers: [],
    },
  ],
};

describe("toLocalDateKey", () => {
  it("formats a local date without shifting it into another day", () => {
    // Built from local parts, never from toISOString(): a late-evening local
    // date in a positive-offset zone would otherwise land on tomorrow.
    expect(toLocalDateKey(new Date(2026, 7, 12, 23, 30))).toBe("2026-08-12");
  });

  it("pads single-digit months and days", () => {
    expect(toLocalDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("flattenTaskRows", () => {
  it("produces one row per task, carrying the group's title down", () => {
    const rows = flattenTaskRows([GROUP], { p1: "Villa Chilonzor" });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      taskId: "t1",
      groupTitle: "Weekly cleaning",
      propertyName: "Villa Chilonzor",
      scheduledDate: "2026-08-12",
      status: "Pending",
    });
  });

  it("prefers the task's own propertyName when the server sends one", () => {
    const g = {
      ...GROUP,
      tasks: [{ ...GROUP.tasks[0], propertyName: "From server" }],
    };
    expect(flattenTaskRows([g], { p1: "From map" })[0].propertyName).toBe("From server");
  });

  it("falls back to the lookup map when propertyName is empty, not just null", () => {
    // The create response is documented as returning "" here, so an empty
    // string must not win over a name we can actually resolve.
    const g = { ...GROUP, tasks: [{ ...GROUP.tasks[0], propertyName: "" }] };
    expect(flattenTaskRows([g], { p1: "Villa" })[0].propertyName).toBe("Villa");
  });

  it("sorts by scheduled date then time", () => {
    const rows = flattenTaskRows([GROUP], {});
    expect(rows.map((r) => r.scheduledDate)).toEqual(["2026-08-12", "2026-08-20"]);
  });

  it("survives a group whose tasks array is missing", () => {
    const g = { ...GROUP, tasks: undefined as unknown as TaskGroupDto["tasks"] };
    expect(flattenTaskRows([g], {})).toEqual([]);
  });
});

describe("rowsInWeek", () => {
  const rows = flattenTaskRows([GROUP], {});
  const week = ["2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13",
    "2026-08-14", "2026-08-15", "2026-08-16"];

  it("keeps only rows whose date is in the week", () => {
    expect(rowsInWeek(rows, week).map((r) => r.taskId)).toEqual(["t1"]);
  });

  it("includes the last day of the week", () => {
    // The whole reason this is a string comparison: an inclusive timestamp
    // bound set to Sunday 00:00 would drop every Sunday and never error.
    const sunday = [{ ...rows[0], scheduledDate: "2026-08-16" }];
    expect(rowsInWeek(sunday, week)).toHaveLength(1);
  });

  it("returns nothing for a week with no work", () => {
    expect(rowsInWeek(rows, ["2026-09-01"])).toEqual([]);
  });
});

describe("filterRowsByStatus", () => {
  const rows = flattenTaskRows([GROUP], {});

  it("returns every row for the all filter", () => {
    expect(filterRowsByStatus(rows, "all")).toHaveLength(2);
  });

  it("matches case-insensitively, because the server casing is not guaranteed", () => {
    expect(filterRowsByStatus(rows, "done").map((r) => r.taskId)).toEqual(["t2"]);
    expect(filterRowsByStatus(rows, "DONE").map((r) => r.taskId)).toEqual(["t2"]);
  });
});

describe("workerSummary", () => {
  const rows = flattenTaskRows([GROUP], {});

  it("names up to two workers", () => {
    expect(workerSummary(rows[0])).toEqual({ names: ["Ali", "Bek"], extra: 0 });
  });

  it("names two and counts the rest", () => {
    const row = { ...rows[0], workers: [worker("A"), worker("B"), worker("C")] };
    expect(workerSummary(row)).toEqual({ names: ["A", "B"], extra: 1 });
  });

  it("reports nobody for an unstaffed task", () => {
    // A real and common state — an owner booked the job and no worker has
    // taken it yet. Not an error.
    expect(workerSummary(rows[1])).toEqual({ names: [], extra: 0 });
  });

  it("ignores workers who vacated the task", () => {
    // removed / cancelled / noshow are not staffing, and the calendar already
    // excludes them from its per-cell count.
    const row = {
      ...rows[0],
      workers: [worker("Ali"), worker("Gone", "removed"), worker("No", "noshow")],
    };
    expect(workerSummary(row)).toEqual({ names: ["Ali"], extra: 0 });
  });

  it("skips a worker with no name rather than rendering a blank", () => {
    const row = { ...rows[0], workers: [worker(null), worker("Ali")] };
    expect(workerSummary(row)).toEqual({ names: ["Ali"], extra: 0 });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/tasks/weekly-rows.test.ts`
Expected: FAIL — `Cannot find package '@/lib/tasks/weekly-rows'`

- [ ] **Step 3: Write the implementation**

Create `lib/tasks/weekly-rows.ts`:

```ts
import { normalizeStatus } from "@/lib/types/task.types";
import type { TaskGroupDto, TaskWorkerDto } from "@/lib/types/task.types";

/**
 * One booked job, flattened out of its group.
 *
 * All of this lives in `lib/` because every function here fails by showing
 * *less* rather than by throwing — a row that quietly drops out of a schedule
 * looks exactly like a quiet week, and nothing downstream would notice.
 */
export interface WeeklyTaskRow {
  taskId: string;
  groupId: string;
  groupTitle: string;
  propertyId: string;
  propertyName: string;
  /** "yyyy-MM-dd", local, as the server sends it. */
  scheduledDate: string;
  scheduledAt: string;
  status: string;
  requiredWorkerCount: number;
  workers: TaskWorkerDto[];
}

/**
 * Outcomes that mean the worker is no longer on the job. The calendar already
 * excludes these from its per-cell count; the table must agree, or the two
 * views of the same data would disagree about who is staffed.
 */
const VACATED = new Set(["removed", "cancelled", "noshow"]);

/**
 * Local date key. Built from local parts rather than `toISOString()` — a
 * late-evening local date in a positive-offset zone would otherwise serialise
 * as tomorrow and land the job on the wrong day.
 */
export function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function flattenTaskRows(
  groups: TaskGroupDto[],
  propertyNames: Record<string, string>,
): WeeklyTaskRow[] {
  const rows: WeeklyTaskRow[] = [];

  for (const group of groups) {
    for (const task of group.tasks ?? []) {
      rows.push({
        taskId: task.id,
        groupId: group.id,
        // The group's title is the only thing on a task that describes the
        // work: the API has no service type and no service catalogue.
        groupTitle: group.title ?? "",
        propertyId: task.propertyId,
        // `propertyName` is documented as coming back as "" on at least one
        // route, so an empty string must not beat a name we can resolve.
        propertyName:
          (task.propertyName && task.propertyName.trim()) ||
          propertyNames[task.propertyId] ||
          "",
        scheduledDate: task.scheduledDate,
        scheduledAt: task.scheduledAt,
        status: task.status,
        requiredWorkerCount: task.requiredWorkerCount,
        workers: task.workers ?? [],
      });
    }
  }

  return rows.sort((a, b) =>
    a.scheduledDate === b.scheduledDate
      ? a.scheduledAt.localeCompare(b.scheduledAt)
      : a.scheduledDate.localeCompare(b.scheduledDate),
  );
}

/**
 * Week membership by exact string match on `"yyyy-MM-dd"`.
 *
 * Deliberately not a timestamp range. The server's own `scheduledTo` filter is
 * inclusive on a *timestamp*, so a week whose end bound is Sunday `00:00` — the
 * shape `useWeekNavigation.weekEnd` has — silently deletes every Sunday with no
 * error at all. Comparing date keys has no boundary to get wrong.
 */
export function rowsInWeek(rows: WeeklyTaskRow[], dateKeys: string[]): WeeklyTaskRow[] {
  const week = new Set(dateKeys);
  return rows.filter((r) => week.has(r.scheduledDate));
}

/** `"all"` or a task status name; matched case-insensitively. */
export function filterRowsByStatus(
  rows: WeeklyTaskRow[],
  status: string,
): WeeklyTaskRow[] {
  if (status === "all") return rows;
  const want = normalizeStatus(status);
  return rows.filter((r) => normalizeStatus(r.status) === want);
}

/**
 * A task has many workers, not one: `workers` is an array beside
 * `requiredWorkerCount`. Two names plus a count keeps the column narrow without
 * pretending a two-person job is a one-person job.
 */
export function workerSummary(row: WeeklyTaskRow): { names: string[]; extra: number } {
  const active = row.workers.filter(
    (w) => !VACATED.has(normalizeStatus(w.outcome)) && !!w.workerName?.trim(),
  );
  return {
    names: active.slice(0, 2).map((w) => w.workerName as string),
    extra: Math.max(0, active.length - 2),
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/tasks/weekly-rows.test.ts`
Expected: PASS

- [ ] **Step 5: Commit the logic before touching any component**

```bash
npx tsc --noEmit
git add lib/tasks/weekly-rows.ts lib/tasks/weekly-rows.test.ts
git commit -m "feat(tasks): weekly row logic, where a silently dropped job would hide"
```

- [ ] **Step 6: Open up TasksCalendar**

In `components/tasks/tasks-calendar.tsx`, change the signature and the two hardcoded queries:

```tsx
/**
 * The week grid. Used standalone on the Tasks screen (every group) and scoped
 * to one owner on Owner Detail.
 */
export function TasksCalendar({
  ownerUserId,
  properties: propertiesProp,
}: {
  /** Scope to one owner's groups. Omit for every group. */
  ownerUserId?: string;
  /**
   * Properties for the filter. Owner Detail already holds this owner's
   * properties, so passing them avoids a second, wider request that would also
   * offer properties this owner does not own.
   */
  properties?: { id: string; name: string | null }[];
} = {}) {
```

Replace the two query calls:

```tsx
  const { data: groups = [], isLoading } = useAdminTaskGroups(
    ownerUserId,
    propertyFilter || undefined,
  );
  // `useProperties(enabled)` — skip the org-wide fetch when the caller already
  // holds the list, so Owner Detail does not request every property in the
  // system to populate a filter over four.
  const { data: fetchedProperties = [] } = useProperties(!propertiesProp);
  const properties = propertiesProp ?? fetchedProperties;
```

`useProperties` is `useProperties(enabled = true)` — verified. Its single argument is the enabled flag, not a filter.

- [ ] **Step 7: Add the copy**

In `messages/en.json` under `owners`:

```json
"work": {
  "title": "Booked work",
  "viewCalendar": "Calendar",
  "viewTable": "Table",
  "empty": "No work booked for this week.",
  "columns": {
    "date": "Date",
    "property": "Property",
    "time": "Time",
    "worker": "Workers",
    "booking": "Booking",
    "status": "Status"
  },
  "unstaffed": "—",
  "more": "+{count}",
  "status": {
    "all": "All",
    "Pending": "Scheduled",
    "Active": "In progress",
    "Review": "Under review",
    "Done": "Completed",
    "Cancelled": "Cancelled"
  }
},
```

In `messages/de.json` under `owners`:

```json
"work": {
  "title": "Gebuchte Arbeit",
  "viewCalendar": "Kalender",
  "viewTable": "Tabelle",
  "empty": "Für diese Woche ist keine Arbeit gebucht.",
  "columns": {
    "date": "Datum",
    "property": "Objekt",
    "time": "Zeit",
    "worker": "Mitarbeiter",
    "booking": "Buchung",
    "status": "Status"
  },
  "unstaffed": "—",
  "more": "+{count}",
  "status": {
    "all": "Alle",
    "Pending": "Geplant",
    "Active": "Läuft",
    "Review": "In Prüfung",
    "Done": "Abgeschlossen",
    "Cancelled": "Storniert"
  }
},
```

Verify parity for `work`, `work.columns` and `work.status` with the `node -e` pattern from Task 2 Step 4.

- [ ] **Step 8: Build the weekly card**

Create `components/owners/weekly-work-card.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, ChevronLeft, ChevronRight, List } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RowLink } from "@/components/ui/row-link";
import { TasksCalendar } from "@/components/tasks/tasks-calendar";
import { useWeekNavigation } from "@/hooks/use-week-navigation";
import { useOwnerTaskGroups } from "@/hooks/use-owners";
import {
  filterRowsByStatus,
  flattenTaskRows,
  rowsInWeek,
  toLocalDateKey,
  workerSummary,
} from "@/lib/tasks/weekly-rows";
import type { PropertyDto } from "@/lib/types/property.types";

const STATUSES = ["all", "Pending", "Active", "Review", "Done", "Cancelled"] as const;

function fmtTime(iso: string): string {
  const t = iso.includes("T") ? iso.split("T")[1] : iso;
  return t.slice(0, 5);
}

/**
 * What this owner has booked, by week.
 *
 * Both views read the **same** query — the task groups the detail page already
 * fetches — so switching cannot show two different answers, and neither costs
 * a request. The calendar shows the shape of the week; the table shows what is
 * in it.
 */
export function WeeklyWorkCard({
  ownerUserId,
  properties,
}: {
  ownerUserId: string;
  properties: PropertyDto[];
}) {
  const t = useTranslations("owners");
  const locale = useLocale();
  const nav = useWeekNavigation();
  const [view, setView] = useState<"calendar" | "table">("calendar");
  const [status, setStatus] = useState<string>("all");

  const { data: groups = [], isLoading } = useOwnerTaskGroups(ownerUserId);

  const propertyNames = useMemo(
    () => Object.fromEntries(properties.map((p) => [p.id, p.name ?? ""])),
    [properties],
  );

  const weekKeys = useMemo(() => nav.days.map(toLocalDateKey), [nav.days]);

  const rows = useMemo(
    () =>
      filterRowsByStatus(
        rowsInWeek(flattenTaskRows(groups, propertyNames), weekKeys),
        status,
      ),
    [groups, propertyNames, weekKeys, status],
  );

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-base font-semibold tracking-tight">
            {t("work.title")}
          </h2>

          <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
            <Button
              variant={view === "calendar" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 gap-1.5 px-2.5"
              onClick={() => setView("calendar")}
            >
              <CalendarDays className="size-3.5" />
              {t("work.viewCalendar")}
            </Button>
            <Button
              variant={view === "table" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 gap-1.5 px-2.5"
              onClick={() => setView("table")}
            >
              <List className="size-3.5" />
              {t("work.viewTable")}
            </Button>
          </div>
        </div>

        {/* The table owns its own week nav; the calendar brings its own. */}
        {view === "table" ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="size-8 p-0" onClick={nav.prev}>
                <ChevronLeft className="size-4" />
              </Button>
              <span className="min-w-[9rem] text-center text-sm font-medium tabular-nums">
                {nav.dateRangeLabel}
              </span>
              <Button variant="ghost" size="sm" className="size-8 p-0" onClick={nav.next}>
                <ChevronRight className="size-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-1">
              {STATUSES.map((s) => (
                <Button
                  key={s}
                  variant={status === s ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2.5 text-[12px]"
                  onClick={() => setStatus(s)}
                >
                  {t(`work.status.${s}` as Parameters<typeof t>[0])}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="pt-0">
        {view === "calendar" ? (
          <TasksCalendar ownerUserId={ownerUserId} properties={properties} />
        ) : isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full rounded-lg" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t("work.empty")}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("work.columns.date")}</TableHead>
                <TableHead>{t("work.columns.property")}</TableHead>
                <TableHead>{t("work.columns.time")}</TableHead>
                <TableHead>{t("work.columns.worker")}</TableHead>
                <TableHead>{t("work.columns.booking")}</TableHead>
                <TableHead>{t("work.columns.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const staff = workerSummary(row);
                return (
                  <TableRow
                    key={row.taskId}
                    className="group/row relative cursor-pointer transition-colors duration-150 hover:bg-accent/40"
                  >
                    <TableCell className="py-2.5 text-sm tabular-nums">
                      <RowLink href={`/dashboard/tasks/${row.taskId}`} label={row.scheduledDate} />
                      {new Date(`${row.scheduledDate}T00:00:00`).toLocaleDateString(locale, {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                      })}
                    </TableCell>
                    <TableCell className="text-sm">{row.propertyName || "—"}</TableCell>
                    <TableCell className="text-sm tabular-nums text-muted-foreground">
                      {fmtTime(row.scheduledAt)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {staff.names.length === 0 ? (
                        <span className="text-muted-foreground">{t("work.unstaffed")}</span>
                      ) : (
                        <span>
                          {staff.names.join(", ")}
                          {staff.extra > 0 ? (
                            <span className="ml-1 text-muted-foreground">
                              {t("work.more", { count: staff.extra })}
                            </span>
                          ) : null}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[14rem] truncate text-sm text-muted-foreground">
                      {row.groupTitle || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{row.status}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
```

`RowLink({ href, label })` renders an absolutely-positioned overlay, so it must be the **first child of the first cell** in a row carrying `relative` — which is why the date cell above opens with it. Verified against `components/ui/row-link.tsx`.

- [ ] **Step 9: Swap it onto the page and delete what it replaces**

In `app/[locale]/dashboard/(owner)/owners/[id]/page.tsx`, replace the `ActivityTimeline` block in the left column:

```tsx
        <div className="flex flex-col gap-6 lg:col-span-2">
          <WeeklyWorkCard ownerUserId={id} properties={properties} />
        </div>
```

Remove the `ActivityTimeline` import and the now-unused `taskGroups` line (`WeeklyWorkCard` fetches them itself — the query is shared, so this costs nothing).

```bash
git rm components/owners/activity-timeline.tsx components/owners/stat-card.tsx
```

Both are imported only by this page — verified before writing this plan. Worker Detail has its own `components/workers/stat-card.tsx` and is untouched.

- [ ] **Step 10: Run every gate**

```bash
npx tsc --noEmit
npm run lint
npx vitest run
npm run build
node scripts/verify-v2.mjs
```
Expected: `tsc` silent · lint clean · all tests pass · build succeeds · `verify-v2 ALL PASS`.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat(owners): the owner's week of booked work, calendar or table"
```

---

### Task 5: Verify in a browser

No gate in this repo can see whether a card rendered. Every check below is read-only except Step 4, which creates a real support ticket.

- [ ] **Step 1: Layout**

Open any Active owner. Confirm: no stat-card row; role and onboarding stage appear **once**, under the name; Contact → Properties → Documents → Sub-accounts stack in the right column at one width; the left column holds the work card.

- [ ] **Step 2: Call and mail**

Confirm the Call button appears beside Mail and opens the phone handler. Confirm **both are absent** on the walk-in account.

- [ ] **Step 3: Documents**

Confirm submitted documents list with their status, that clicking one opens the file, and that "Open review screen" reaches `/dashboard/owner-documents/{id}`. On an owner with none, confirm the empty sentence rather than a blank card.

- [ ] **Step 4: Message ⚠ writes to the live backend**

Open **Message**, pick a type, write a subject and body, create. Confirm the dialog closes and the ticket appears in `/dashboard/support`.

If it fails with `invalid_target_type`, the literal in `handleMessageSubmit` is wrong — switch between `"Owner"` and `"OWNER_USER"` and record which one the API accepts.

This creates a real ticket. Get explicit consent before running it, and close the ticket afterwards.

- [ ] **Step 5: Weekly work**

Confirm the calendar renders only this owner's groups; that the property filter offers only this owner's properties; that prev/next week moves both views; that the table lists one row per job with the booking title and worker names; that an unstaffed job shows a dash; and that a row click opens Task Detail.

- [ ] **Step 6: Report**

State which checks passed and which did not. Do not describe unverified behaviour as working.

---

## Self-Review

**Spec coverage:**

| Spec section | Task |
|---|---|
| §2 the correction — reuse the calendar | 4 step 6 |
| §3 weekly view, two renderings, one toggle | 4 |
| §3.1 group title instead of a service type; many workers | 4 steps 1–3 |
| §3.2 one query, no F-02a·1 filters, date-key comparison | 4 step 3 (`rowsInWeek`) |
| §4 documents read-only + link | 3 |
| §4 bank details / admin upload impossible | recorded in spec §8; no task, correctly |
| §5.1 call link, no logging | 1 step 2 |
| §5.2 ticket with category/subject/message/priority | 2 |
| §6 layout, stat row removed, three duplications | 1 steps 2–3 |
| §6.1 photo renders when the field arrives | 1 step 2 (`pictureUrl`) |
| §7 file list incl. two deletions | 4 step 9 |
| §9 shipping order | task order |
| §10 gates | every task's gate step |

**Placeholder scan:** none — every code step carries its code. Four "check the file first" hedges were resolved by reading the files while writing this plan: `AvatarImage` **is** exported; `useProperties(enabled = true)` takes the flag as its only argument; `RowLink({href, label})` is an absolute overlay that must lead the first cell; and `["support-tickets"]`/`["support-inbox"]` are both keys the support hooks already use. Each is now stated as fact.

**Type consistency:** `WeeklyTaskRow` is defined in Task 4 Step 3 and used under that name in Step 8. `workerSummary` returns `{names, extra}` in the test, the implementation and the component. `MessageDraft` is exported from the dialog in Task 2 Step 5 and imported by name in Step 6. `HeroCard`'s `onboardingStatus` prop is added in Task 1 Step 2 and passed in Step 3. `TasksCalendar`'s new props are declared in Task 4 Step 6 and passed in Step 8.

**Known risk, called out rather than hidden:** Task 2 Step 7 cannot resolve the `targetUserType` literal from documentation — the backend's own two sources disagree. The plan sends `"Owner"`, says why, and makes Task 5 Step 4 the check that settles it.
