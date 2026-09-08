import type { AgencyTone } from "@/lib/agencies/standing";
import type {
  AgencyApplicationDocumentDto,
  AgencyApplicationDocumentType,
  AgencyApplicationStatus,
} from "@/lib/types/agency.types";

/**
 * How a status reads.
 *
 * ⚠ `Rejected` is **neutral, not danger**. A rejection is a completed decision
 * rather than a fault, and `danger` on a terminal row would make the archive read
 * as a queue of problems an operator has to fix.
 */
export function statusTone(status: AgencyApplicationStatus): AgencyTone {
  switch (status) {
    case "Pending":
      return "warning";
    case "InfoRequested":
      return "info";
    case "Approved":
      return "success";
    case "Rejected":
      return "neutral";
    default:
      return "neutral";
  }
}

/**
 * Whether the state machine has stopped.
 *
 * ⚠ **An unrecognised status is NOT terminal** — the inverse of `statusTone`'s
 * default, and deliberately so. A state this build has not met might still be
 * actionable; calling it terminal hides the verbs and strands the row, while
 * offering them costs nothing because the server refuses what it must with
 * `application_already_reviewed`.
 */
export function isTerminal(status: AgencyApplicationStatus): boolean {
  return status === "Approved" || status === "Rejected";
}

/** Whether the three verbs render at all. */
export function canReview(
  status: AgencyApplicationStatus,
  canManage: boolean,
): boolean {
  return canManage && !isTerminal(status);
}

const REQUIRED: AgencyApplicationDocumentType[] = [
  "RegistrationCertificate",
  "Licence",
];

/**
 * The "required set" reading, computed **once** for the queue's warning marker
 * and the detail's rail.
 *
 * ⚠ One function, not two. An earlier draft had a second helper deriving
 * `missing` for the marker's wording while this one derived it for the rail —
 * which is how a queue marker and a detail pane come to disagree about whether a
 * paper is missing.
 *
 * ⚠ `Other` counts toward `total` and satisfies **neither** required type.
 */
export function docSummary(documents: AgencyApplicationDocumentDto[] | null) {
  const docs = documents ?? [];
  const has = (type: AgencyApplicationDocumentType) =>
    docs.some((d) => d.type === type);
  return {
    total: docs.length,
    hasRegistration: has("RegistrationCertificate"),
    hasLicence: has("Licence"),
    missing: REQUIRED.filter((type) => !has(type)),
  };
}
