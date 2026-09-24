import { getApiErrorCode, getValidationMessage } from "@/lib/http/api-error";
import { isPermissionDenied } from "@/lib/onboarding/errors";
import type { TaskComplaintDto } from "@/lib/types/task.types";

export type ComplaintState = "open" | "decided" | "none";

/**
 * Only `"Open"` is open. An unknown decision word reads as decided: offering
 * the decide buttons on a state this build does not know would invite a 409.
 */
export function complaintState(
  complaint: TaskComplaintDto | null | undefined,
): ComplaintState {
  if (!complaint) return "none";
  return complaint.decision === "Open" ? "open" : "decided";
}

export type DecideErrorKind =
  | "alreadyDecided"
  | "closedElsewhere"
  | "notFound"
  | "forbidden"
  | "invalid"
  | "generic";

/**
 * `POST /api/tasks/complaints/{id}/decide` refusals (`TasksController.cs:1411`),
 * keyed on the `error` string. Both 409s mean the world moved under the admin —
 * another admin decided, or force-close got there first — so they refetch
 * rather than retry.
 */
export function decideErrorKind(err: unknown): DecideErrorKind {
  if (isPermissionDenied(err)) return "forbidden";
  const code = getApiErrorCode(err);
  switch (code) {
    case "complaint_already_decided":
      return "alreadyDecided";
    case "invalid_task_status":
      return "closedElsewhere";
    case "complaint_not_found":
    case "task_not_found":
      return "notFound";
    case "invalid_decision":
      return "invalid";
  }
  if (!code && getValidationMessage(err)) return "invalid";
  return "generic";
}

export const DECIDE_REFETCH: ReadonlySet<DecideErrorKind> = new Set([
  "alreadyDecided",
  "closedElsewhere",
]);
