import type {
  AdminOwnerContractDto,
  AdminWorkerContractDto,
} from "@/lib/types/contract.types";
import type { KycProfileSummaryDto } from "@/lib/types/kyc.types";
import type { ContractPhase, OnboardingStatus } from "@/lib/types/onboarding.types";
import type { WorkerRowDto } from "@/lib/types/worker.types";

/**
 * One row of the Docs queue, normalized so the owner and the worker side render
 * through the *same* table component instead of two tables that drift apart.
 *
 * Both list endpoints are deliberately narrower than this shape:
 *
 * - **`avatarUrl` is always `null` today.** Neither `KycProfileSummaryDto`
 *   (`Backend/GermanyERP.Domain/Models/DTOs/Kyc/KycDtos.cs:42-50`) nor
 *   `WorkerRowDto` (`.../Workers/WorkerDtos.cs:48-67`) carries a picture — only the
 *   *detail* DTOs do (`WorkerDtos.cs:74`, `OwnerDtos.cs:83`), and one detail request
 *   per row is an N+1 a table must not do. The field exists here so the cell renders
 *   a photo the day the backend adds it, with no other change. Filed as a backend ask.
 * - **`cover` is joined client-side**, not returned by the list. See `indexCover()`.
 */
export interface SubjectRow {
  /** The id the Docs detail route is keyed on: `ownerProfileId` | worker `id`. */
  id: string;
  fullName: string | null;
  /** Second line under the name. Email on both sides. */
  email: string | null;
  /** See the note above — `null` on every row until the list DTOs carry it. */
  avatarUrl: string | null;
  onboardingStatus: OnboardingStatus;
  /** The contract period governing this subject today, or `null` if none exists. */
  cover: SubjectCover | null;
}

export interface SubjectCover {
  from: string;
  to: string;
  phase: ContractPhase;
}

// ── Adapters ─────────────────────────────────────────────────────────────────

export function ownerSubjectRow(dto: KycProfileSummaryDto): SubjectRow {
  return {
    id: dto.ownerProfileId,
    fullName: dto.ownerName,
    email: dto.ownerEmail,
    avatarUrl: null,
    onboardingStatus: dto.onboardingStatus,
    cover: null,
  };
}

export function workerSubjectRow(dto: WorkerRowDto): SubjectRow {
  return {
    id: dto.id,
    fullName: dto.fullName,
    email: dto.email,
    avatarUrl: null,
    onboardingStatus: dto.onboardingStatus,
    cover: null,
  };
}

// ── Joining the contract period onto a row ───────────────────────────────────

/**
 * Which of a subject's contracts the two date columns describe.
 *
 * A renewed subject legitimately holds two rows at once — an `InForce` one and a
 * `Scheduled` one — so "the latest" is the wrong answer: the operator is asking
 * *"is this person covered, and until when"*, and the row covering today wins.
 * A subject with nothing but an ended row still shows it, because "expired in
 * March" is information, not noise.
 */
const PHASE_RANK: Record<ContractPhase, number> = {
  InForce: 0,
  Scheduled: 1,
  Sent: 2,
  Draft: 3,
  Expired: 4,
  Lapsed: 4,
  Terminated: 5,
};

function governs(a: SubjectCover, b: SubjectCover): SubjectCover {
  const ra = PHASE_RANK[a.phase] ?? 99;
  const rb = PHASE_RANK[b.phase] ?? 99;
  if (ra !== rb) return ra < rb ? a : b;
  // Same phase (two ended rows, say) — the one running latest is the relevant one.
  return a.to >= b.to ? a : b;
}

/**
 * Index `GET /api/contracts/admin/{side}` by subject id.
 *
 * That list is unpaginated and returns every subject's rows, so it is fetched
 * **once** under one query key and joined here — never one request per row.
 */
export function indexCover(
  contracts: (AdminOwnerContractDto | AdminWorkerContractDto)[],
  subjectIdOf: (c: AdminOwnerContractDto | AdminWorkerContractDto) => string,
): Map<string, SubjectCover> {
  const byId = new Map<string, SubjectCover>();
  for (const c of contracts) {
    const key = subjectIdOf(c);
    if (!key) continue;
    const next: SubjectCover = {
      from: c.eligibleFrom,
      to: c.eligibleTo,
      phase: c.phase,
    };
    const held = byId.get(key);
    byId.set(key, held ? governs(held, next) : next);
  }
  return byId;
}

export const ownerContractSubjectId = (
  c: AdminOwnerContractDto | AdminWorkerContractDto,
) => (c as AdminOwnerContractDto).ownerProfileId;

export const workerContractSubjectId = (
  c: AdminOwnerContractDto | AdminWorkerContractDto,
) => (c as AdminWorkerContractDto).workerId;

export function withCover(
  rows: SubjectRow[],
  cover: Map<string, SubjectCover>,
): SubjectRow[] {
  return rows.map((r) => ({ ...r, cover: cover.get(r.id) ?? null }));
}

// ── Presentation ─────────────────────────────────────────────────────────────

/**
 * ⚠ **Drift risk.** 30 and 7 mirror the outer and inner rungs of the backend's own
 * expiry ladder (`onboarding.expiry.warn_days`), which sits behind
 * `system:settings:read` and is not exposed on any endpoint this table may call.
 * If the backend ladder is retuned, nothing here fails — the annotation simply
 * stops agreeing with the emails the subject receives. Recorded in
 * `ERP-Uyer/INTEGRATION.md` alongside the Owner app's copy of the same constants.
 */
const WARN_DAYS = 30;
const CRITICAL_DAYS = 7;

export interface CoverPresentation {
  /** Whole days until the period ends. Negative once past. */
  daysLeft: number;
  /**
   * Whole days until the period *begins*, or 0 once it has. A signed renewal that
   * starts next month is `Scheduled`, and without this the row is indistinguishable
   * from one that covers today — same badge, same two dates, opposite meaning.
   */
  daysUntilStart: number;
  tone: "muted" | "warning" | "critical";
  /** The period is proposed, not running — an unsigned draft or a sent contract. */
  pending: boolean;
  /** Worth annotating the end date in words. Quiet rows stay unannotated. */
  annotate: boolean;
}

const DAY_MS = 86_400_000;

/**
 * Snap a timestamp to the start of its day, matching how the caller derives `today`.
 * `NaN` passes through so an unparseable date stays detectable.
 */
function startOfDay(ms: number): number {
  return Number.isNaN(ms) ? ms : Math.floor(ms / DAY_MS) * DAY_MS;
}

/**
 * `today` is the **start of today** in ms, not the current instant — a date-only
 * deadline should read "1 day left" for all of the day before, not flip to "0"
 * at some hour of the afternoon.
 */
export function coverPresentation(
  cover: SubjectCover,
  today: number,
): CoverPresentation {
  // Both boundaries are snapped to the start of their own day before differencing.
  // Comparing a raw instant against a day-start silently rounds the hours already
  // elapsed today into a whole extra day: a contract starting *today* at 00:00 read
  // as "starts in 1 day" from 00:01 onwards, and every end date was a day too far
  // away. Differencing two day-starts gives exact whole days with no rounding.
  const from = startOfDay(Date.parse(cover.from));
  const to = startOfDay(Date.parse(cover.to));
  const pending = cover.phase === "Draft" || cover.phase === "Sent";
  const ended =
    cover.phase === "Expired" ||
    cover.phase === "Lapsed" ||
    cover.phase === "Terminated";

  const daysLeft = Number.isNaN(to) ? 0 : Math.round((to - today) / DAY_MS);
  const daysUntilStart =
    Number.isNaN(from) || ended
      ? 0
      : Math.max(0, Math.round((from - today) / DAY_MS));

  // `Terminated` is deliberately muted, not critical: it is a period ended early
  // (an admin force-terminate, or one cut short by a lapsed document), which is a
  // recorded outcome rather than a compliance alarm. Only a real expiry is red.
  const tone: CoverPresentation["tone"] =
    cover.phase === "Terminated"
      ? "muted"
      : ended
        ? "critical"
        : pending
          ? "muted"
          : daysLeft <= CRITICAL_DAYS
            ? "critical"
            : daysLeft <= WARN_DAYS
              ? "warning"
              : "muted";

  return {
    daysLeft,
    daysUntilStart,
    tone,
    pending,
    // Annotating every row would make the annotation meaningless. Only the rows
    // that need an operator's attention carry words — plus any row whose dates
    // would otherwise be read as covering today when they do not.
    annotate:
      ended || daysUntilStart > 0 || (!pending && daysLeft <= WARN_DAYS),
  };
}
