import { daysUntil, summariseAttention, type AttentionSource } from "@/lib/detail/attention";
import { newestPhotoAt, type UpcomingVisit } from "@/lib/properties/visits";
import type { AttentionSummary } from "@/lib/detail/attention";
import type { SubjectCover } from "@/lib/onboarding/subject-row";
import type { PropertyMediaDto } from "@/lib/types/property.types";

/**
 * What is waiting at one property, from three of the reads the detail screen
 * already makes. Mirrors `lib/owners/attention.ts` — same three-state model, same
 * reason: a source that **refused** must not read as a source that answered
 * "nothing".
 *
 * Copy is injected rather than translated here so the rules stay pure and
 * testable, which is the pattern the owner side established.
 */

/** How old the newest photo has to be before an admin should be told. */
export const STALE_PHOTO_DAYS = 180;

/** How close a contract's end is before it is worth interrupting for. */
const COVER_WARN_DAYS = 45;

export interface PropertyAttentionCopy {
  unassignedTitle: (args: { when: string; what: string }) => string;
  unassignedDetail: (args: { count: number }) => string;
  unassignedAction: () => string;
  visitsUnknown: () => string;
  visitsUnknownDetail: () => string;

  coverExpiredTitle: () => string;
  coverExpiredDetail: () => string;
  coverEndingTitle: (args: { days: number }) => string;
  coverEndingDetail: () => string;
  coverAction: () => string;
  coverUnknown: () => string;
  coverUnknownDetail: () => string;

  stalePhotosTitle: (args: { months: number }) => string;
  stalePhotosDetail: (args: { count: number }) => string;
  noPhotosTitle: () => string;
  noPhotosDetail: () => string;
  photosAction: () => string;
}

export interface PropertyAttentionInput {
  /** From `upcomingVisits` — already filtered and ordered. */
  visits: UpcomingVisit[];
  visitsPending: boolean;
  /** The task read was refused, which is not the same as no visits. */
  visitsForbidden: boolean;
  /** ⚠ `null` = never fetched (no `?withMedia=true`), **not** an empty gallery. */
  media: PropertyMediaDto[] | null;
  cover: {
    /** `null` while permissions are still resolving. */
    canRead: boolean | null;
    isPending: boolean;
    cover: SubjectCover | null;
  };
  /** Start of today in ms, from `useToday`. `0` = clock not known. */
  today: number;
  copy: PropertyAttentionCopy;
}

export function derivePropertyAttention(
  input: PropertyAttentionInput,
): AttentionSummary {
  const { copy, today } = input;

  /*
    With no clock every source is unreadable, not clear: "expires in N days" and
    "N months old" are both differences against today, and answering them against
    1970 would put a confident wrong number on a compliance strip. This is the
    server snapshot and one paint after hydration.
  */
  if (!today) {
    return summariseAttention([
      { state: "unknown", id: "visits", title: copy.visitsUnknown(), detail: copy.visitsUnknownDetail() },
      { state: "unknown", id: "cover", title: copy.coverUnknown(), detail: copy.coverUnknownDetail() },
      { state: "unknown", id: "photos", title: copy.noPhotosTitle(), detail: copy.noPhotosDetail() },
    ]);
  }

  return summariseAttention([
    visitsSource(input),
    coverSource(input),
    photosSource(input),
  ]);
}

/**
 * The soonest visit nobody has staffed.
 *
 * One flag rather than one per visit: the strip holds three slots and a property
 * with a recurring weekly job would fill all of them with the same finding. The
 * count goes in the detail line, and the verb leads to dispatch.
 */
function visitsSource(input: PropertyAttentionInput): AttentionSource {
  const { visits, visitsPending, visitsForbidden, copy } = input;

  if (visitsForbidden || visitsPending) {
    return {
      state: "unknown",
      id: "visits",
      title: copy.visitsUnknown(),
      detail: copy.visitsUnknownDetail(),
    };
  }

  const short = visits.filter((v) => v.unassigned);
  if (short.length === 0) return { state: "clear" };

  const first = short[0];
  return {
    state: "flag",
    id: "unassigned",
    tone: "critical",
    title: copy.unassignedTitle({
      when: first.task.scheduledAt,
      what: first.title ?? "",
    }),
    detail: copy.unassignedDetail({ count: short.length }),
    action: { label: copy.unassignedAction(), href: "/dashboard/dispatch" },
    blocking: true,
  };
}

/**
 * The **owner's** contract, not the property's — a property has none. It is here
 * because an owner out of cover cannot be given new work at this address, which
 * is a fact about this screen even though it belongs to another one.
 */
function coverSource(input: PropertyAttentionInput): AttentionSource {
  const { cover, today, copy } = input;

  if (cover.canRead === null || cover.isPending) {
    return {
      state: "unknown",
      id: "cover",
      title: copy.coverUnknown(),
      detail: copy.coverUnknownDetail(),
    };
  }
  if (cover.canRead === false) {
    return {
      state: "unknown",
      id: "cover",
      title: copy.coverUnknown(),
      detail: copy.coverUnknownDetail(),
    };
  }

  // No contract at all is the owner screen's finding, not this one's: nothing
  // here can author one, and a chip whose verb leads nowhere is worse than none.
  if (!cover.cover) return { state: "clear" };

  const days = daysUntil(cover.cover.to, today);
  if (days === null) return { state: "clear" };

  if (days < 0) {
    return {
      state: "flag",
      id: "cover",
      tone: "critical",
      title: copy.coverExpiredTitle(),
      detail: copy.coverExpiredDetail(),
      action: { label: copy.coverAction(), href: "/dashboard/owner-documents" },
      blocking: true,
    };
  }
  if (days <= COVER_WARN_DAYS) {
    return {
      state: "flag",
      id: "cover",
      tone: "warning",
      title: copy.coverEndingTitle({ days }),
      detail: copy.coverEndingDetail(),
      action: { label: copy.coverAction(), href: "/dashboard/owner-documents" },
    };
  }
  return { state: "clear" };
}

/**
 * Photos, in two findings under one id: none at all, or none recent.
 *
 * ⚠ **`media: null` is unknown, never a finding.** It means the read omitted
 * `?withMedia=true`, and flagging it would accuse every property in the system
 * the moment someone drops the parameter.
 */
function photosSource(input: PropertyAttentionInput): AttentionSource {
  const { media, today, copy } = input;

  if (media === null) {
    return {
      state: "unknown",
      id: "photos",
      title: copy.noPhotosTitle(),
      detail: copy.noPhotosDetail(),
    };
  }

  if (media.length === 0) {
    return {
      state: "flag",
      id: "photos",
      tone: "warning",
      title: copy.noPhotosTitle(),
      detail: copy.noPhotosDetail(),
      action: { label: copy.photosAction(), href: "#photos" },
    };
  }

  const newest = newestPhotoAt(media);
  const age = newest === null ? null : -(daysUntil(newest, today) ?? 0);
  if (age === null || age < STALE_PHOTO_DAYS) return { state: "clear" };

  return {
    state: "flag",
    id: "photos",
    tone: "warning",
    title: copy.stalePhotosTitle({ months: Math.floor(age / 30) }),
    detail: copy.stalePhotosDetail({ count: media.length }),
    action: { label: copy.photosAction(), href: "#photos" },
  };
}
