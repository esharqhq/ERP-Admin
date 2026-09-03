import { daysUntil, type AttentionSource } from "@/lib/detail/attention";
import { WARN_DAYS } from "@/lib/onboarding/subject-row";
import { activeWorkers, isOpen } from "@/lib/tasks/staffing";
import { normalizeStatus } from "@/lib/types/task.types";
import type { SubjectCover } from "@/lib/onboarding/subject-row";
import type { KycDocDto } from "@/lib/types/kyc.types";
import type { TaskGroupDto, TaskItemDto } from "@/lib/types/task.types";
import type { KycRead } from "@/lib/owners/detail-actions";

/** How far ahead an unstaffed shift is worth interrupting an admin about. */
export const UNSTAFFED_HORIZON_DAYS = 7;

export interface OwnerAttentionCopy {
  unstaffedTitle: (args: { count: number }) => string;
  unstaffedDetail: (args: { where: string; when: string }) => string;
  unstaffedToday: () => string;
  unstaffedSoon: (args: { days: number }) => string;
  unstaffedAction: () => string;

  docsTitle: (args: { count: number }) => string;
  docsDetail: (args: { days: number }) => string;
  docsAction: () => string;
  docsUnknown: () => string;
  docsUnknownDetail: () => string;

  coverExpiredTitle: () => string;
  coverExpiredDetail: () => string;
  coverEndingTitle: (args: { days: number }) => string;
  coverEndingDetail: () => string;
  coverAction: () => string;
  coverUnknown: () => string;
  coverUnknownDetail: () => string;
}

export interface OwnerAttentionInput {
  /** Every task group this owner holds. Already fetched by the work card. */
  groups: TaskGroupDto[];
  groupsPending: boolean;
  kyc: {
    read: KycRead;
    ownerProfileId: string | null;
    documents: KycDocDto[] | null;
    isPending: boolean;
  };
  contract: {
    cover: SubjectCover | null;
    canRead: boolean | null;
    isPending: boolean;
    error: unknown;
  };
  /** Start of today in ms, from `useToday`. `0` = clock not known. */
  today: number;
  /** Local `"yyyy-MM-dd"` for today. `""` = clock not known. */
  todayKey: string;
  copy: OwnerAttentionCopy;
}

/**
 * What is waiting on this owner, from three of the six reads the screen makes.
 *
 * The order is the order the chips appear in, and it is the order of who is
 * already waiting: a **person** without cover first, then a document somebody
 * has to decide, then a date. Each carries its own verb, so an admin never has
 * to work out which screen a finding belongs to.
 *
 * The walk-in account is deliberately not special-cased here. It has no KYC
 * profile and no contract, so both of those resolve to `clear` on their own —
 * and if a manual order somehow goes unstaffed, that is exactly as worth saying
 * as it is on any other account.
 */
export function deriveOwnerAttention(input: OwnerAttentionInput): {
  sources: AttentionSource[];
  isPending: boolean;
} {
  const { groups, groupsPending, kyc, contract, today, todayKey, copy } = input;

  const isPending =
    groupsPending ||
    kyc.isPending ||
    contract.canRead === null ||
    (contract.canRead === true && contract.isPending);

  return {
    sources: [
      unstaffed(groups, todayKey, copy),
      docs(kyc, today, copy),
      cover(contract, today, copy),
    ],
    isPending,
  };
}

/**
 * Shifts inside the next week that nobody is on.
 *
 * Derived from the task groups this screen already reads, so it costs no
 * request — but it is a client-side count over one owner's groups, not an
 * authoritative "unstaffed today" query. A per-owner read is filed in
 * `BACKEND-ASKS.md`; until it lands this is a true statement about the data on
 * screen rather than about the whole system.
 *
 * A task in the **past** is never counted. Nobody can be assigned to it any
 * more, so it is a report, not a thing to act on, and putting it in a strip
 * headed "needs attention" would be asking for an impossible action.
 */
function unstaffed(
  groups: TaskGroupDto[],
  todayKey: string,
  copy: OwnerAttentionCopy,
): AttentionSource {
  if (!todayKey) return { state: "clear" };

  const horizon = addDays(todayKey, UNSTAFFED_HORIZON_DAYS);
  const open: TaskItemDto[] = [];

  for (const group of groups) {
    if (!["pending", "active"].includes(normalizeStatus(group.status)))
      continue;
    for (const task of group.tasks ?? []) {
      if (task.scheduledDate < todayKey || task.scheduledDate > horizon)
        continue;
      if (!isOpen(task)) continue;
      if (activeWorkers(task).length >= task.requiredWorkerCount) continue;
      open.push(task);
    }
  }

  if (open.length === 0) return { state: "clear" };

  // The soonest one is the one that runs out of time first.
  const next = open.reduce((a, b) =>
    a.scheduledDate <= b.scheduledDate ? a : b,
  );
  const inDays = daysBetween(todayKey, next.scheduledDate);

  return {
    state: "flag",
    id: "unstaffed",
    tone: "critical",
    blocking: inDays === 0,
    title: copy.unstaffedTitle({ count: open.length }),
    detail: copy.unstaffedDetail({
      where: next.propertyName?.trim() || "—",
      when:
        inDays === 0
          ? copy.unstaffedToday()
          : copy.unstaffedSoon({ days: inDays }),
    }),
    action: { label: copy.unstaffedAction(), href: "/dashboard/dispatch" },
  };
}

function docs(
  kyc: OwnerAttentionInput["kyc"],
  today: number,
  copy: OwnerAttentionCopy,
): AttentionSource {
  if (kyc.read === "forbidden")
    return {
      state: "unknown",
      id: "docs",
      title: copy.docsUnknown(),
      detail: copy.docsUnknownDetail(),
    };

  // No profile row means the owner never started KYC. That is a real fact about
  // them, and it is not something waiting on an admin.
  if (kyc.read === "absent" || !kyc.ownerProfileId) return { state: "clear" };

  const pending = (kyc.documents ?? []).filter(
    (d) => normalizeStatus(d.status ?? "pending") === "pending",
  );
  if (pending.length === 0) return { state: "clear" };

  const waited = pending
    .map((d) => daysUntil(d.createdAt, today))
    .filter((d): d is number => d !== null)
    .map((d) => Math.abs(Math.min(0, d)));
  const longest = waited.length > 0 ? Math.max(...waited) : 0;

  return {
    state: "flag",
    id: "docs",
    tone: "warning",
    title: copy.docsTitle({ count: pending.length }),
    detail: copy.docsDetail({ days: longest }),
    action: {
      label: copy.docsAction(),
      href: `/dashboard/owner-documents/${kyc.ownerProfileId}`,
    },
  };
}

/**
 * Whether the owner may still order work.
 *
 * A period that has never been authored is **not** flagged: on this side that is
 * the normal shape of an account that has not finished onboarding, the hero's
 * contract cell already states it in words, and a strip that shouted about every
 * pre-contract owner would be ignored by the time it mattered.
 */
function cover(
  contract: OwnerAttentionInput["contract"],
  today: number,
  copy: OwnerAttentionCopy,
): AttentionSource {
  if (contract.canRead === false || contract.error)
    return {
      state: "unknown",
      id: "cover",
      title: copy.coverUnknown(),
      detail: copy.coverUnknownDetail(),
    };

  if (!contract.cover) return { state: "clear" };

  const phase = contract.cover.phase;
  if (phase === "Expired" || phase === "Lapsed")
    return {
      state: "flag",
      id: "cover",
      tone: "critical",
      blocking: true,
      title: copy.coverExpiredTitle(),
      detail: copy.coverExpiredDetail(),
      action: { label: copy.coverAction(), href: "/dashboard/owner-documents" },
    };

  const left = daysUntil(contract.cover.to, today);
  if (phase === "InForce" && left !== null && left <= WARN_DAYS)
    return {
      state: "flag",
      id: "cover",
      tone: "warning",
      title: copy.coverEndingTitle({ days: Math.max(0, left) }),
      detail: copy.coverEndingDetail(),
      action: { label: copy.coverAction(), href: "/dashboard/owner-documents" },
    };

  return { state: "clear" };
}

const DAY_MS = 86_400_000;

/** `"2026-08-25"` + 7 → `"2026-09-01"`, in UTC so no local DST shift applies. */
function addDays(key: string, days: number): string {
  const at = Date.parse(`${key}T00:00:00Z`);
  if (Number.isNaN(at)) return key;
  return new Date(at + days * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from one `"yyyy-MM-dd"` to another; `0` if either is unreadable. */
function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / DAY_MS);
}
