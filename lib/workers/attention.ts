import { daysUntil, type AttentionSource } from "@/lib/detail/attention";
import { WARN_DAYS } from "@/lib/onboarding/subject-row";
import { normalizeStatus } from "@/lib/types/task.types";
import type { SubjectCover } from "@/lib/onboarding/subject-row";
import type { OnboardingStatus } from "@/lib/types/onboarding.types";
import type {
  WorkerDocumentDto,
  WorkerDetailDto,
} from "@/lib/types/worker.types";
import type { WorkerShift } from "@/hooks/use-worker-shifts";

/** Every string the strip can show, already translated. Keeps this pure. */
export interface WorkerAttentionCopy {
  papersTitle: (args: { document: string; days: number }) => string;
  papersLapsedTitle: (args: { document: string; days: number }) => string;
  papersDetail: () => string;
  papersLapsedDetail: () => string;
  papersAction: () => string;
  licence: () => string;
  passport: () => string;

  docsTitle: (args: { count: number }) => string;
  docsDetail: (args: { days: number }) => string;
  docsAction: () => string;
  docsUnknown: () => string;
  docsUnknownDetail: () => string;

  coverExpiredTitle: () => string;
  coverExpiredDetail: () => string;
  coverEndingTitle: (args: { days: number }) => string;
  coverEndingDetail: () => string;
  coverNoneTitle: () => string;
  coverNoneDetail: () => string;
  coverAction: () => string;
  coverUnknown: () => string;
  coverUnknownDetail: () => string;

  weekMissed: (args: { count: number }) => string;
  weekLate: (args: { count: number }) => string;
  weekDetail: (args: { where: string }) => string;
  weekAction: () => string;
  weekUnknown: () => string;
  weekUnknownDetail: () => string;
}

export interface WorkerAttentionInput {
  worker: WorkerDetailDto;
  documents: {
    docs: WorkerDocumentDto[];
    canRead: boolean | null;
    isPending: boolean;
  };
  contract: {
    cover: SubjectCover | null;
    canRead: boolean | null;
    isPending: boolean;
    error: unknown;
  };
  week: {
    shifts: WorkerShift[];
    canRead: boolean | null;
    isPending: boolean;
    isError: boolean;
  };
  /** Start of today in ms, from `useToday`. `0` = clock not known. */
  today: number;
  copy: WorkerAttentionCopy;
}

/**
 * What is waiting on this worker, from four independent reads.
 *
 * Two of the four are permission-gated (documents, and the week's shifts), so a
 * grey "unknown" slot is a **normal** state on this screen rather than an edge
 * case: an admin can legitimately open it able to read the worker and nothing
 * else. Each source therefore reports `unknown` rather than dropping out, and
 * the strip's count says "1 of 3 known" instead of quietly shrinking.
 *
 * The order below is the order the chips appear in, and it is deliberate: papers
 * first because a lapse makes every future shift unfillable, then the decisions
 * someone is waiting on, then coverage, then last week's behaviour.
 */
export function deriveWorkerAttention(input: WorkerAttentionInput): {
  sources: AttentionSource[];
  isPending: boolean;
} {
  const { worker, documents, contract, week, today, copy } = input;

  const isPending =
    documents.isPending ||
    (contract.canRead === true && contract.isPending) ||
    week.isPending ||
    documents.canRead === null ||
    contract.canRead === null ||
    week.canRead === null;

  return {
    sources: [
      papers(worker, today, copy),
      docs(documents, today, copy),
      cover(contract, worker.onboardingStatus, today, copy),
      lastWeek(week, copy),
    ],
    isPending,
  };
}

/**
 * The service licence and the passport.
 *
 * ⚠ **Both rungs are red here, not amber.** On the owner screen an expiry inside
 * 30 days is a renewal task; here it is not. When a worker's papers lapse the
 * backend's expiry ladder drops the account back to `Kyc`, which makes every
 * future shift unfillable and every existing assignment a problem — so the strip
 * says so at the same distance the contract cell would merely warn.
 *
 * A missing expiry is **not** an expired one. `licenseExpiry` is optional even at
 * submit, so `null` means "no statement", and inventing a warning from an absent
 * date would send an admin chasing a worker about a document they were never
 * required to file.
 */
function papers(
  worker: WorkerDetailDto,
  today: number,
  copy: WorkerAttentionCopy,
): AttentionSource {
  const candidates = [
    {
      document: copy.licence(),
      days: daysUntil(worker.identity?.licenseExpiry, today),
    },
    {
      document: copy.passport(),
      days: daysUntil(worker.identity?.passportExpiry, today),
    },
  ].filter((c): c is { document: string; days: number } => c.days !== null);

  if (candidates.length === 0) return { state: "clear" };

  // The nearest deadline is the one worth a slot; a second chip for the passport
  // behind it would push a real finding off the row.
  const worst = candidates.reduce((a, b) => (a.days <= b.days ? a : b));
  if (worst.days > WARN_DAYS) return { state: "clear" };

  const lapsed = worst.days < 0;
  return {
    state: "flag",
    id: "papers",
    tone: "critical",
    blocking: lapsed,
    title: lapsed
      ? copy.papersLapsedTitle({
          document: worst.document,
          days: Math.abs(worst.days),
        })
      : copy.papersTitle({ document: worst.document, days: worst.days }),
    detail: lapsed ? copy.papersLapsedDetail() : copy.papersDetail(),
    action: { label: copy.papersAction(), href: "/dashboard/worker-documents" },
  };
}

function docs(
  documents: WorkerAttentionInput["documents"],
  today: number,
  copy: WorkerAttentionCopy,
): AttentionSource {
  if (documents.canRead === false)
    return {
      state: "unknown",
      id: "docs",
      title: copy.docsUnknown(),
      detail: copy.docsUnknownDetail(),
    };

  const pending = documents.docs.filter(
    (d) => normalizeStatus(d.status) === "pending",
  );
  if (pending.length === 0) return { state: "clear" };

  // The oldest one is the one that has been ignored longest, which is the fact
  // worth stating — the count alone does not say anyone has been kept waiting.
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
    action: { label: copy.docsAction(), href: "#worker-documents" },
  };
}

/**
 * Whether the worker can actually be put on a job.
 *
 * Only flagged once the account has got past review: a worker still in `Kyc`,
 * `Review` or `Rejected` has no contract because it is not their turn yet, and
 * saying so on every one of them would train admins to ignore the slot.
 */
function cover(
  contract: WorkerAttentionInput["contract"],
  status: OnboardingStatus,
  today: number,
  copy: WorkerAttentionCopy,
): AttentionSource {
  if (contract.canRead === false || contract.error)
    return {
      state: "unknown",
      id: "cover",
      title: copy.coverUnknown(),
      detail: copy.coverUnknownDetail(),
    };

  const awaitingDecision =
    status === "Kyc" || status === "Review" || status === "Rejected";

  if (!contract.cover) {
    if (awaitingDecision) return { state: "clear" };
    return {
      state: "flag",
      id: "cover",
      tone: "warning",
      title: copy.coverNoneTitle(),
      detail: copy.coverNoneDetail(),
      action: {
        label: copy.coverAction(),
        href: "/dashboard/worker-documents",
      },
    };
  }

  const phase = contract.cover.phase;
  if (phase === "Expired" || phase === "Lapsed" || phase === "Terminated")
    return {
      state: "flag",
      id: "cover",
      tone: "critical",
      blocking: true,
      title: copy.coverExpiredTitle(),
      detail: copy.coverExpiredDetail(),
      action: {
        label: copy.coverAction(),
        href: "/dashboard/worker-documents",
      },
    };

  const left = daysUntil(contract.cover.to, today);
  if (phase === "InForce" && left !== null && left <= WARN_DAYS)
    return {
      state: "flag",
      id: "cover",
      tone: "warning",
      title: copy.coverEndingTitle({ days: Math.max(0, left) }),
      detail: copy.coverEndingDetail(),
      action: {
        label: copy.coverAction(),
        href: "/dashboard/worker-documents",
      },
    };

  return { state: "clear" };
}

/** Late arrivals and no-shows in the week currently on screen. */
function lastWeek(
  week: WorkerAttentionInput["week"],
  copy: WorkerAttentionCopy,
): AttentionSource {
  if (week.canRead === false || week.isError)
    return {
      state: "unknown",
      id: "week",
      title: copy.weekUnknown(),
      detail: copy.weekUnknownDetail(),
    };

  const late = week.shifts.filter((s) => s.state === "late");
  const missed = week.shifts.filter((s) => s.state === "missed");
  if (late.length === 0 && missed.length === 0) return { state: "clear" };

  const where = [...missed, ...late]
    .map((s) => s.propertyName)
    .filter(Boolean)
    .slice(0, 1)[0];

  // Composed from two whole sentences rather than from one message with three
  // ICU blocks in it. A separator between the halves depends on *both* counts,
  // and a plural block can only be keyed on one argument — so the single-message
  // form renders "1 missed shift, " whenever the other half is zero.
  const title = [
    missed.length > 0 ? copy.weekMissed({ count: missed.length }) : null,
    late.length > 0 ? copy.weekLate({ count: late.length }) : null,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    state: "flag",
    id: "week",
    tone: missed.length > 0 ? "critical" : "warning",
    title,
    detail: copy.weekDetail({ where: where || "—" }),
    action: { label: copy.weekAction(), href: "/dashboard/attendance" },
  };
}
