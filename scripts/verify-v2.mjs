import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Contract check: our TS unions must match the live API's enums, and the DTOs we
// depend on must still carry the fields we read. Run with: npm run verify:api
const BASE = process.env.ERP_API ?? "https://germany-erp.esharq.com";

let failures = 0;
const ok = (m) => console.log(`PASS  ${m}`);
const bad = (m) => { failures++; console.log(`FAIL  ${m}`); };

const swagger = await (await fetch(`${BASE}/swagger/v1/swagger.json`)).json();
const S = swagger.components.schemas;

// ── 1. enums ────────────────────────────────────────────────────────────────
const EXPECTED_ENUMS = {
  OnboardingStatus:    ["Kyc", "Review", "Rejected", "Approved", "Contract", "Active"],
  ContractStatus:      ["Draft", "Sent", "Signed", "Expired", "Terminated"],
  ContractPhase:       ["Draft", "Sent", "Scheduled", "InForce", "Lapsed", "Expired", "Terminated"],
  AccountStatusFilter: ["Active", "Pending", "Deleted", "Blocked"],
  SortDir:             ["Asc", "Desc"],
  OnboardingSubjectType: ["Owner", "Worker"],
  OwnerKYCDocType:     ["Passport", "IdCard", "ResidencePermit", "BusinessLicense",
                        "CompanyRegistration", "TaxCertificate", "Other"],
};
for (const [name, expected] of Object.entries(EXPECTED_ENUMS)) {
  const live = S[name]?.enum;
  if (!live) { bad(`enum ${name} missing from live swagger`); continue; }
  const same = live.length === expected.length && expected.every((v, i) => live[i] === v);
  same ? ok(`enum ${name}`) : bad(`enum ${name}: live=[${live}] expected=[${expected}]`);
}

// ── 2. fields we read ───────────────────────────────────────────────────────
const EXPECTED_FIELDS = {
  KycProfileSummaryDto: ["ownerProfileId", "ownerUserId", "ownerName", "ownerEmail",
    "onboardingStatus", "onboardingRejectReason", "onboardingReviewedAt", "documentCount"],
  KycProfileDto: ["ownerProfileId", "ownerUserId", "onboardingStatus",
    "onboardingRejectReason", "onboardingReviewedAt", "documents"],
  KycDocDto: ["id", "type", "fileName", "fileUrl", "createdAt"],
  KycApprovalDto: ["ownerProfileId", "onboardingStatus", "onboardingRejectReason", "prefill"],
  WorkerApprovalDto: ["id", "onboardingStatus", "onboardingRejectReason", "prefill"],
  ContractPrefillDto: ["subjectType", "subjectId", "fullName", "email", "phoneNumber"],
  OwnerRowDto: ["id", "fullName", "email", "phoneNumber", "status", "onboardingStatus",
    "isVerified", "propertyCount", "createdAt"],
  WorkerRowDto: ["id", "fullName", "email", "phoneNumber", "status", "onboardingStatus",
    "employeeType", "skills", "rating", "experience", "completedTasks",
    "hasActiveContract", "onTask", "createdAt"],
  WorkerRowDtoPagedResult: ["items", "total", "page", "pageSize", "totalPages"],
  WorkerDetailDto: ["id", "fullName", "onboardingStatus", "onboardingRejectReason",
    "onboardingReviewedAt", "professions", "documents"],
  AdminOwnerContractDto: ["id", "eligibleFrom", "eligibleTo", "fileName", "fileUrl", "isActive",
    "createdAt", "status", "phase", "sentAt", "signedAt", "documentUrl", "previewUrl",
    "ownerProfileId", "ownerUserId", "ownerFullName", "ownerEmail",
    "revisionReason", "revisionRequestedAt", "renewalStartsAt"],
  AdminWorkerContractDto: ["id", "status", "phase", "previewUrl", "documentUrl",
    "workerId", "workerFullName", "workerEmail", "renewalStartsAt"],
  CreateOwnerContractRequest: ["eligibleFrom", "eligibleTo", "fileName", "fileUrl",
    "commissionPercent", "paymentOrder", "generalTerms", "extraClauses"],
  CreateWorkerContractRequest: ["eligibleFrom", "eligibleTo", "fileName", "fileUrl"],
};
for (const [name, fields] of Object.entries(EXPECTED_FIELDS)) {
  const live = S[name]?.properties;
  if (!live) { bad(`schema ${name} missing`); continue; }
  const missing = fields.filter((f) => !(f in live));
  missing.length ? bad(`${name} missing: ${missing.join(", ")}`) : ok(`schema ${name}`);
}

// ── 3. fields that must be GONE ─────────────────────────────────────────────
for (const [name, dead] of Object.entries({
  WorkerDetailDto: "isApproved", KycProfileDto: "kycStatus", KycProfileSummaryDto: "isApproved",
})) {
  const live = S[name]?.properties ?? {};
  dead in live ? bad(`${name}.${dead} still exists — v1 field came back`) : ok(`${name}.${dead} gone`);
}

// ── 4. routes we call ───────────────────────────────────────────────────────
for (const [route, method] of [
  ["/api/admin/kyc", "get"], ["/api/admin/kyc/{ownerProfileId}", "get"],
  ["/api/admin/kyc/{ownerProfileId}/approve", "post"], ["/api/admin/kyc/{ownerProfileId}/reject", "post"],
  ["/api/admin/workers", "get"], ["/api/admin/workers/{id}", "get"],
  ["/api/admin/workers/{id}/approve", "post"], ["/api/admin/workers/{id}/reject", "post"],
  ["/api/admin/owners", "get"], ["/api/admin/owners/export", "get"], ["/api/admin/owners/bosses", "get"],
  ["/api/contracts/admin/owner", "get"], ["/api/contracts/admin/owner/{contractId}", "get"],
  ["/api/contracts/admin/owner/{contractId}/send", "post"],
  ["/api/contracts/admin/owner/{contractId}/recall", "post"],
  ["/api/contracts/admin/owner/{ownerUserId}/renew", "post"],
  ["/api/contracts/admin/worker/{contractId}/send", "post"],
  ["/api/system/settings/{key}", "get"],
]) {
  swagger.paths[route]?.[method] ? ok(`route ${method.toUpperCase()} ${route}`)
                                 : bad(`route ${method.toUpperCase()} ${route} missing`);
}

// ── 5. X-Idempotency-Key really is required on renew ───────────────────────
const renewParams = swagger.paths["/api/contracts/admin/owner/{ownerUserId}/renew"]?.post?.parameters ?? [];
const idem = renewParams.find((p) => p.name === "X-Idempotency-Key");
idem?.required ? ok("renew requires X-Idempotency-Key") : bad("renew no longer requires X-Idempotency-Key — re-check the spec");

// ── 6. i18n: every labelKey used by lib/onboarding/* exists in BOTH locales ──
const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const REQUIRED = {
  status: ["kyc", "review", "rejected", "approved", "contract", "active", "unknown"],
  phase: ["draft", "sent", "scheduled", "inForce", "expired", "terminated", "unknown"],
  apiErrors: ["invalidOnboardingTransition", "rejectionReasonRequired", "kycDocumentsRequired",
    "workerDocumentsRequired", "subjectNotFound", "documentNotFound", "onboardingNotApproved",
    "contractAlreadySent", "contractTemplateNotApproved", "contractTemplateMissing",
    "invalidContractPeriod", "contractPeriodOverlaps", "contractPeriodGap",
    "noActiveContractToRenew", "invalidContractTransition", "revisionReasonRequired",
    "contractAlreadyInactive", "contractNotFound", "gateOnboardingIncomplete",
    "gateContractExpired", "gateContractNotYetActive", "gateContractExpiringImminently",
    "taskDateBeyondContract", "workerContractEndsBeforeTask", "propertyDocsNotApproved",
    "invalidSortColumn", "invalidFilterValue", "invalidFormat", "exportTooLarge",
    "codeExists", "nameExists", "countryNotFound", "invalidTargetType", "targetNotFound",
    "unknown"],
  docType: ["passport", "idCard", "residencePermit", "businessLicense",
    "companyRegistration", "taxCertificate", "other"],
};
for (const locale of ["en", "de"]) {
  const msgs = JSON.parse(readFileSync(join(REPO, "messages", `${locale}.json`), "utf8"));
  const ns = msgs.onboarding;
  if (!ns) { bad(`${locale}.json has no "onboarding" namespace`); continue; }
  for (const [group, keys] of Object.entries(REQUIRED)) {
    const missing = keys.filter((k) => typeof ns[group]?.[k] !== "string");
    missing.length
      ? bad(`${locale}.json onboarding.${group} missing: ${missing.join(", ")}`)
      : ok(`${locale}.json onboarding.${group}`);
  }
  if (typeof ns.permissionDenied !== "string") bad(`${locale}.json onboarding.permissionDenied missing`);
}

console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
