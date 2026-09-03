import { normalizeStatus } from "@/lib/types/task.types";
import type { KycProfileDto } from "@/lib/types/kyc.types";
import type { OnboardingStatus } from "@/lib/types/onboarding.types";

/**
 * The four things the queue's rows need that its list endpoint does not return.
 *
 * `GET /api/admin/kyc` gives eight fields and none of these; `GET /api/admin/kyc/{id}`
 * gives all of them. The queue therefore reads the detail of the rows it is
 * **currently showing** — a bounded per-page cost, under the same query key the
 * detail page uses, so clicking through to a row is already warm.
 */

export type DocVerdict = "approved" | "pending" | "rejected";

export interface QueueDetail {
  /** `null` is a complete answer — a natural person, not a missing value. */
  company: string | null;
  /** One entry per uploaded file, in the order the API returned them. */
  verdicts: DocVerdict[];
  /**
   * When the bundle was put in front of an admin, taken as the **earliest**
   * document upload. The design's own column spec maps "Submitted at" to
   * `documents[0].createdAt`; earliest rather than first because the array's
   * order is not promised to be chronological.
   */
  submittedAt: string | null;
}

/** How many dots a row draws before it stops. The count beside them is exact. */
export const MAX_DOTS = 8;

export function summariseDetail(dto: KycProfileDto): QueueDetail {
  const docs = dto.documents ?? [];

  const dates = docs
    .map((d) => d.createdAt)
    .filter((d): d is string => typeof d === "string" && d.length > 0)
    .sort();

  return {
    company: dto.company?.name?.trim() || null,
    verdicts: docs.slice(0, MAX_DOTS).map((d) => verdictOf(d.status)),
    submittedAt: dates[0] ?? null,
  };
}

function verdictOf(status: string | null): DocVerdict {
  const normalized = normalizeStatus(status ?? "pending");
  if (normalized === "approved") return "approved";
  if (normalized === "rejected") return "rejected";
  return "pending";
}

const DAY_MS = 86_400_000;

/**
 * Whole days this submission has been waiting on a decision.
 *
 * `null` on any stage that is **not** waiting — the row is then an em dash rather
 * than a zero, because a decided submission has not been waiting no time, it has
 * stopped waiting. `null` too while the clock or the detail is unknown, so a
 * pending read never renders as "0 d".
 */
export function waitingDays(
  status: OnboardingStatus,
  detail: QueueDetail | undefined,
  today: number,
): number | null {
  if (status !== "Review") return null;
  if (!detail?.submittedAt || !today) return null;

  const at = Date.parse(detail.submittedAt);
  if (Number.isNaN(at)) return null;

  // Floored to the day at both ends, so a bundle submitted yesterday afternoon
  // reads "1 d" all of today rather than flipping at the hour it arrived.
  return Math.max(0, Math.round((today - Math.floor(at / DAY_MS) * DAY_MS) / DAY_MS));
}

/** Past this, a waiting submission is late enough to colour. The design's rung. */
export const WAITING_ALARM_DAYS = 7;

/**
 * The second line under a subject's name: their company, then their email.
 *
 * "Natural person" when there is no company — a complete state, not a gap, and
 * the design says so in as many words. Rendered only once the detail has
 * arrived: guessing "Natural person" for a row still loading would state the one
 * fact the read exists to establish.
 */
export function subjectSide(
  detail: QueueDetail | undefined,
  email: string | null,
  naturalPerson: string,
): string | null {
  const parts = [
    detail ? (detail.company ?? naturalPerson) : null,
    email,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}
