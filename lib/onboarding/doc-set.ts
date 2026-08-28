import { normalizeStatus } from "@/lib/types/task.types";
import type { KycDocDto } from "@/lib/types/kyc.types";
import type { DocVerdict } from "@/lib/onboarding/queue-detail";

/**
 * How an owner's KYC bundle is grouped and what makes it complete.
 *
 * **The completeness rule here mirrors a real server gate**, it is not the
 * screen's own opinion. `KycService.SubmitAsync`
 * (`GermanyERP.Services/Kyc/KycService.cs:258-282`) refuses a submission with
 * `incomplete_document_set` unless both hold:
 *
 * - **any** identity document — passport, ID card or residence permit. Not a
 *   passport specifically: *"a literal passport rule would block an EU resident
 *   holding only an ID card, with no self-service way out."*
 * - **`CompanyRegistration` specifically**, and only when the owner has a company
 *   row. A `BusinessLicense` does not discharge it — the backend's own comment is
 *   that the register is wanted as a *file* and the licence as a *typed number*.
 *
 * So a bundle already sitting at Review has passed this. The panel still states
 * it, because the admin's question is not "did the server check" but "what am I
 * supposed to be looking at".
 */

export const IDENTITY_TYPES = ["Passport", "IdCard", "ResidencePermit"] as const;
export const COMPANY_TYPES = [
  "CompanyRegistration",
  "BusinessLicense",
  "TaxCertificate",
] as const;

export type DocGroup = "identity" | "company" | "other";

export function groupOf(type: string | null): DocGroup {
  if (!type) return "other";
  if ((IDENTITY_TYPES as readonly string[]).includes(type)) return "identity";
  if ((COMPANY_TYPES as readonly string[]).includes(type)) return "company";
  return "other";
}

export interface DocumentGroup {
  group: DocGroup;
  docs: KycDocDto[];
}

/**
 * The bundle in reading order: who they are, then what their company is, then
 * anything else.
 *
 * Empty groups are dropped rather than rendered as a heading with nothing under
 * it — a natural person has no company section at all, which is the shape of the
 * account rather than a gap in it.
 */
export function groupDocuments(docs: KycDocDto[]): DocumentGroup[] {
  const order: DocGroup[] = ["identity", "company", "other"];
  return order
    .map((group) => ({ group, docs: docs.filter((d) => groupOf(d.type) === group) }))
    .filter((entry) => entry.docs.length > 0);
}

export type MissingDoc = "identity" | "companyRegistration";

export interface RequiredSet {
  complete: boolean;
  missing: MissingDoc[];
}

/**
 * What the server would demand of this bundle.
 *
 * `hasCompany` comes from the profile's `company` being non-null — for a natural
 * person the required set is the identity document alone.
 */
export function requiredSet(docs: KycDocDto[], hasCompany: boolean): RequiredSet {
  const types = new Set(docs.map((d) => d.type).filter(Boolean) as string[]);
  const missing: MissingDoc[] = [];

  if (!(IDENTITY_TYPES as readonly string[]).some((t) => types.has(t))) {
    missing.push("identity");
  }
  if (hasCompany && !types.has("CompanyRegistration")) {
    missing.push("companyRegistration");
  }

  return { complete: missing.length === 0, missing };
}

export interface VerdictCounts {
  approved: number;
  pending: number;
  rejected: number;
  total: number;
}

export function verdictOf(status: string | null): DocVerdict {
  const normalized = normalizeStatus(status ?? "pending");
  if (normalized === "approved") return "approved";
  if (normalized === "rejected") return "rejected";
  return "pending";
}

export function verdictCounts(docs: KycDocDto[]): VerdictCounts {
  const counts: VerdictCounts = { approved: 0, pending: 0, rejected: 0, total: docs.length };
  for (const doc of docs) counts[verdictOf(doc.status)] += 1;
  return counts;
}

/**
 * Which file the screen opens on.
 *
 * The one that most needs a decision: a rejected file first — somebody has to see
 * why — then the oldest undecided one, then simply the first. A viewer that opens
 * on an already-approved passport makes the admin hunt for the work.
 */
export function firstToRead(docs: KycDocDto[]): KycDocDto | null {
  if (docs.length === 0) return null;
  const rejected = docs.find((d) => verdictOf(d.status) === "rejected");
  if (rejected) return rejected;

  const pending = docs
    .filter((d) => verdictOf(d.status) === "pending")
    .sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));
  return pending[0] ?? docs[0];
}

/**
 * How a file should be shown, from its name alone.
 *
 * The API returns a storage key and no content type, so the extension is all
 * there is. Anything not recognised gets the "cannot be shown inline" panel,
 * which still carries Open original and the full verdict row — **the decision is
 * never blocked by the preview**.
 */
export type ViewerKind = "pdf" | "image" | "unsupported";

export function viewerKind(fileName: string | null, fileUrl: string | null): ViewerKind {
  const name = (fileName || fileUrl || "").toLowerCase();
  const ext = name.slice(name.lastIndexOf(".") + 1);
  if (ext === "pdf") return "pdf";
  if (["png", "jpg", "jpeg", "webp", "gif", "avif"].includes(ext)) return "image";
  return "unsupported";
}
