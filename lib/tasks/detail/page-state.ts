import { AxiosError } from "axios";
import { isPermissionDenied } from "@/lib/onboarding/errors";

export type GroupLoadFailure = "forbidden" | "notFound" | "error";

/**
 * Why `GET /api/tasks/groups/{id}` failed — spec §7. Permission first: an
 * empty-bodied 403 is the permission filter, never onboarding.
 *
 * ⚠ NEEDS-LIVE: what this read answers for an UNKNOWN id is undocumented (it
 * checks permissions in the action). If it is an empty 403, a deleted booking
 * lands on "forbidden" and the forbidden copy must cover "or the link is wrong".
 */
export function classifyGroupLoad(error: unknown): GroupLoadFailure {
  if (isPermissionDenied(error)) return "forbidden";
  const status = error instanceof AxiosError ? error.response?.status : undefined;
  if (status === 404) return "notFound";
  return "error";
}
