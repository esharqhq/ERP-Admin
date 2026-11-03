import { resolveRouteGate } from "@/lib/nav-items";

/**
 * Who opened a support ticket, as far as the panel can tell.
 *
 * `SupportTicketDto` and `ConversationSummaryDto` carry only `requesterUserId`
 * and `requesterUserType`, and no name. The DTO's own doc comment says so
 * (`SupportDtos.cs`, `RequesterAgency`). So the panel reads the name from the
 * owner or worker profile with the same id. A name on the DTO is filed in
 * `BACKEND-ASKS.md`; when it ships, this lookup goes away.
 *
 * `requesterUserType` is the enum CODE on the wire (`OWNER_USER`, `WORKER`,
 * `ADMIN`, per `fnd-2-admin-initiated-ticket.md`). A friendly form
 * (`Owner`) is accepted too, and anything else is `unknown`, never a crash.
 */
export type RequesterKind = "owner" | "worker" | "admin" | "unknown";

export function requesterKind(type: string | null | undefined): RequesterKind {
  const head = (type ?? "").trim().split("_")[0].toLowerCase();
  switch (head) {
    case "owner":
      return "owner";
    case "worker":
      return "worker";
    case "admin":
      return "admin";
    default:
      return "unknown";
  }
}

/**
 * The detail page of a requester, or null when there is none.
 * The requester id IS the owner/worker detail id: both pages already match
 * tickets on it (`ConversationsCard userId={owner.id}`).
 */
export function requesterProfilePath(
  kind: RequesterKind,
  id: string | null | undefined,
): string | null {
  if (!id) return null;
  switch (kind) {
    case "owner":
      return `/dashboard/owners/${id}`;
    case "worker":
      return `/dashboard/workers/${id}`;
    default:
      return null;
  }
}

/** The grant that opens that page: the same route gate the nav uses. */
export function requesterProfilePermission(path: string | null): string | null {
  if (!path) return null;
  return resolveRouteGate(path)?.permission ?? null;
}

/** The grant that reads one profile by id. */
export function requesterReadPermission(kind: RequesterKind): string | null {
  switch (kind) {
    case "owner":
      return "owner:read";
    case "worker":
      return "worker:read";
    default:
      return null;
  }
}

export interface RequesterProfile {
  fullName?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
}

export interface RequesterIdentity {
  /** The person's name; null when the profile has none or was not read. */
  name: string | null;
  /** Email, else phone; shown under the name so two namesakes can be told apart. */
  contact: string | null;
}

const blankToNull = (v: string | null | undefined) => {
  const s = (v ?? "").trim();
  return s ? s : null;
};

export function requesterIdentity(
  profile: RequesterProfile | null | undefined,
): RequesterIdentity {
  return {
    name: blankToNull(profile?.fullName),
    contact: blankToNull(profile?.email) ?? blankToNull(profile?.phoneNumber),
  };
}

/** First ids-space prefix, for the case where no name can be read. */
export function shortId(id: string | null | undefined): string {
  return (id ?? "").slice(0, 8);
}

/**
 * The ids to read one by one. Owners found in the directory (one request for
 * every BOSS) are skipped, so only sub-accounts and workers cost a request
 * each. Workers have no such directory.
 */
export function idsToFetch(
  refs: { id: string; type: string }[],
  directoryIds: ReadonlySet<string> | null,
): { owners: string[]; workers: string[] } {
  const owners = new Set<string>();
  const workers = new Set<string>();
  for (const r of refs) {
    if (!r.id) continue;
    const kind = requesterKind(r.type);
    if (kind === "owner" && !directoryIds?.has(r.id)) owners.add(r.id);
    if (kind === "worker") workers.add(r.id);
  }
  return { owners: [...owners], workers: [...workers] };
}
