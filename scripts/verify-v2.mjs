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
  if (same) ok(`enum ${name}`);
  else bad(`enum ${name}: live=[${live}] expected=[${expected}]`);
}

// ── 2. fields we read ───────────────────────────────────────────────────────
const EXPECTED_FIELDS = {
  KycProfileSummaryDto: ["ownerProfileId", "ownerUserId", "ownerName", "ownerEmail",
    "onboardingStatus", "onboardingRejectReason", "onboardingReviewedAt", "documentCount"],
  // `identity` carries the legal name pair the admin edit prefills from and
  // writes back to — the only source for it on the Owner Detail screen.
  KycProfileDto: ["ownerProfileId", "ownerUserId", "onboardingStatus",
    "onboardingRejectReason", "onboardingReviewedAt", "documents", "identity"],
  // F-02b·7. The panel had no client for PUT /api/owners/{id} at all until
  // 2026-08-11, so neither of its shapes was ever asserted here.
  AdminOwnerProfileDto: ["id", "fullName", "firstName", "lastName",
    "profilePictureUrl", "onboardingStatus", "updatedAt"],
  AdminUpdateOwnerProfileRequest: ["firstName", "lastName", "profilePictureUrl", "reason"],
  // FND-2 admin-initiated ticket. The panel had no client for this route until
  // 2026-08-11. Note the schema is named after the action, not the route —
  // `AdminOpenTicketRequest`, not `AdminCreateTicketRequest`.
  AdminOpenTicketRequest: ["targetUserType", "targetUserId", "subject",
    "initialMessage", "category", "priority"],
  KycDocDto: ["id", "type", "fileName", "fileUrl", "createdAt"],
  KycApprovalDto: ["ownerProfileId", "onboardingStatus", "onboardingRejectReason", "prefill"],
  WorkerApprovalDto: ["id", "onboardingStatus", "onboardingRejectReason", "prefill"],
  // `legalName` is PR #67 (2026-08-11): the passport name the PDF prints, which
  // is allowed to differ from `fullName`. Nullable, and it must never be
  // rendered as a fallback for the other one.
  ContractPrefillDto: ["subjectType", "subjectId", "fullName", "legalName", "email",
    "phoneNumber"],
  // PR #67 again — the same name on all four admin contract reads. Asserted here
  // because a nullable additive field is exactly what this gate could not see
  // before: nothing reddens when the server *adds* something we never declared.
  AdminOwnerContractDto: ["ownerProfileId", "ownerUserId", "ownerFullName",
    "ownerLegalName", "ownerEmail"],
  AdminWorkerContractDto: ["workerId", "workerFullName", "workerLegalName", "workerEmail"],
  // `ownerType` is F-02b·6's addition and the field the UI keys the walk-in
  // account's four refusals on; the paged envelope was never asserted here,
  // which is how the owners page went on using the unpaged picker endpoint.
  // F-02 #4's three columns. `companyCity` is a NAME while the filter param is
  // `companyCityId` — a city lives only on an owner's company record, which is why
  // the filter can reach neither private individuals nor companies with a blank
  // city, and why the column must be rendered including its blanks.
  OwnerRowDto: ["id", "fullName", "email", "phoneNumber", "status", "onboardingStatus",
    "isVerified", "propertyCount", "createdAt", "ownerType",
    "companyCity", "lastOrderedAt", "taskCount"],
  OwnerRowDtoPagedResult: ["items", "total", "page", "pageSize", "totalPages"],
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
    "generalTerms", "extraClauses"],
  CreateWorkerContractRequest: ["eligibleFrom", "eligibleTo", "fileName", "fileUrl"],
  // F-02c reshaped these and this gate did not notice, because nothing property-
  // shaped was ever listed here. `category` is the field that replaced `type`;
  // `roomCount`/`areaSqm` are the new ones the table renders.
  PropertyDto: ["id", "bossOwnerUserId", "name", "address", "lat", "long", "category",
    "entryInstructions", "floorCount", "roomCount", "areaSqm", "createdAt", "isDeleted", "media"],
  PropertyCategoryRefDto: ["id", "code", "nameDe", "nameEn"],
  PropertyCategoryDto: ["id", "code", "nameDe", "nameEn", "icon", "color", "description", "isActive"],
  PropertyMediaDto: ["id", "propertyId", "type", "url", "originalFileName", "mimeType",
    "fileSize", "createdAt"],
  UpdatePropertyRequest: ["name", "address", "lat", "long", "propertyCategoryId",
    "entryInstructions", "floorCount", "roomCount", "areaSqm"],
  AdminCreatePropertyRequest: ["ownerUserId", "name", "address", "lat", "long",
    "propertyCategoryId", "entryInstructions", "floorCount", "roomCount", "areaSqm"],
  // The Walk-In order form sends `defaultDeadline`; the orders list and detail
  // sheet render every TaskGroupDto/TaskItemDto field below. Nothing else in this
  // script covered the tasks surface, which is how a change here would otherwise
  // break the page with every gate green.
  CreateTaskGroupRequest: ["propertyId", "title", "defaultStartTime", "defaultDeadline",
    "defaultWorkerLimit", "dates", "instructions", "internalNote", "ratingFloor",
    "eligibleProfessionIds", "allowNewWorkers"],
  TaskGroupDto: ["id", "propertyId", "ownerId", "title", "defaultStartTime", "defaultDeadline",
    "instructions", "status", "ratingFloor", "allowNewWorkers", "eligibleProfessionIds",
    "dates", "tasks", "createdAt"],
  TaskItemDto: ["id", "groupId", "propertyId", "propertyName", "scheduledDate", "scheduledAt",
    "deadline", "status", "requiredWorkerCount", "startedAt", "completedAt", "workers"],
  TaskWorkerDto: ["id", "taskId", "workerId", "workerName", "outcome", "starRating",
    "assignedAt", "checkinAt", "submittedAt", "checkoutAt"],
};
for (const [name, fields] of Object.entries(EXPECTED_FIELDS)) {
  const live = S[name]?.properties;
  if (!live) { bad(`schema ${name} missing`); continue; }
  const missing = fields.filter((f) => !(f in live));
  if (missing.length) bad(`${name} missing: ${missing.join(", ")}`);
  else ok(`schema ${name}`);
}

// ── 3. fields that must be GONE ─────────────────────────────────────────────
for (const [name, dead] of Object.entries({
  WorkerDetailDto: "isApproved", KycProfileDto: "kycStatus", KycProfileSummaryDto: "isApproved",
  // F-02c retired the `type` enum and deleted the document-review fields. If any
  // of these reappear, this app's rewritten property surface is reading the
  // wrong contract again.
  PropertyDto: "type",
})) {
  const live = S[name]?.properties ?? {};
  if (dead in live) bad(`${name}.${dead} still exists — v1 field came back`);
  else ok(`${name}.${dead} gone`);
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
  ["/api/tasks/admin/groups", "get"], ["/api/tasks/admin/groups", "post"],
  ["/api/tasks/admin/groups/{id}/cancel", "post"],
  ["/api/tasks/{taskId}/admin-assign/{workerId}", "post"],
  ["/api/tasks/{taskId}/admin-assign/{workerId}", "delete"],
]) {
  if (swagger.paths[route]?.[method]) ok(`route ${method.toUpperCase()} ${route}`);
  else bad(`route ${method.toUpperCase()} ${route} missing`);
}

// ── 5. X-Idempotency-Key really is required on renew ───────────────────────
const renewParams = swagger.paths["/api/contracts/admin/owner/{ownerUserId}/renew"]?.post?.parameters ?? [];
const idem = renewParams.find((p) => p.name === "X-Idempotency-Key");
if (idem?.required) ok("renew requires X-Idempotency-Key");
else bad("renew no longer requires X-Idempotency-Key — re-check the spec");

// ── 6. the groups list really takes ?ownerUserId ────────────────────────────
const groupsParams = swagger.paths["/api/tasks/admin/groups"]?.get?.parameters ?? [];
if (groupsParams.some((p) => p.name === "ownerUserId")) ok("admin groups list takes ?ownerUserId");
else bad("admin groups list lost ?ownerUserId — the Walk-In orders list is built on it");

// ── 7. i18n: every labelKey used by lib/onboarding/* exists in BOTH locales ──
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
    "taskDateBeyondContract", "workerContractEndsBeforeTask",
    // `propertyDocsNotApproved` was asserted here until 2026-08-11. The backend
    // deleted that error code — and the whole property-document feature — on
    // 2026-08-07, so this check was demanding a message for a code that can
    // never arrive. It is the reason this gate stayed green through F-02c.
    "propertyCategoryNotFound", "propertyCategoryInactive", "targetOwnerMustBeBoss",
    "propertyNotFound",
    "invalidSortColumn", "invalidFilterValue", "invalidFormat", "exportTooLarge",
    "codeExists", "nameExists", "countryNotFound", "invalidTargetType", "targetNotFound",
    "incompleteIdentityData", "onboardingLocked", "cityCountryMismatch", "cityNotFound",
    "invalidCompanyType", "companyNameRequired", "companyLicenseNumberRequired",
    "companyNotFound", "requiresBoss",
    "unknown"],
  docType: ["passport", "idCard", "residencePermit", "businessLicense",
    "companyRegistration", "taxCertificate", "other"],
  companyType: ["llc", "gmbh", "individualEntrepreneur", "soleTrader", "other", "unknown"],
};
for (const locale of ["en", "de"]) {
  const msgs = JSON.parse(readFileSync(join(REPO, "messages", `${locale}.json`), "utf8"));
  const ns = msgs.onboarding;
  if (!ns) { bad(`${locale}.json has no "onboarding" namespace`); continue; }
  for (const [group, keys] of Object.entries(REQUIRED)) {
    const missing = keys.filter((k) => typeof ns[group]?.[k] !== "string");
    if (missing.length) bad(`${locale}.json onboarding.${group} missing: ${missing.join(", ")}`);
    else ok(`${locale}.json onboarding.${group}`);
  }
  if (typeof ns.permissionDenied !== "string") bad(`${locale}.json onboarding.permissionDenied missing`);
}

// ── 8. authenticated shape checks (skipped without credentials) ─────────────
const email = process.env.ERP_ADMIN_EMAIL, password = process.env.ERP_ADMIN_PASSWORD;
if (!email || !password) {
  console.log("SKIP  authenticated checks (set ERP_ADMIN_EMAIL / ERP_ADMIN_PASSWORD)");
} else {
  const auth = await fetch(`${BASE}/api/auth/login?userType=Admin`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!auth.ok) { bad(`admin login failed: ${auth.status}`); }
  else {
    const { accessToken } = await auth.json();
    const H = { Authorization: `Bearer ${accessToken}` };

    const kyc = await fetch(`${BASE}/api/admin/kyc?status=Review`, { headers: H });
    if (kyc.ok) ok("GET /api/admin/kyc?status=Review");
    else bad(`GET /api/admin/kyc?status=Review → ${kyc.status}`);
    const kycRows = kyc.ok ? await kyc.json() : [];
    if (Array.isArray(kycRows)) {
      ok(`kyc list is a bare array (${kycRows.length} rows)`);
      if (kycRows[0]) {
        for (const f of ["ownerProfileId", "ownerUserId", "onboardingStatus", "documentCount"]) {
          if (f in kycRows[0]) ok(`kyc row has ${f}`);
          else bad(`kyc row missing ${f}`);
        }
        if ("kycStatus" in kycRows[0]) bad("kyc row still has kycStatus");
      } else console.log("SKIP  kyc row field check (queue is empty)");
    } else bad("kyc list is not an array");

    const wk = await fetch(`${BASE}/api/admin/workers?onboardingStatus=Review&pageSize=1`, { headers: H });
    if (wk.ok) ok("GET /api/admin/workers?onboardingStatus=Review");
    else bad(`GET /api/admin/workers → ${wk.status}`);
    if (wk.ok) {
      const page = await wk.json();
      if (["items", "total", "page", "pageSize", "totalPages"].every((f) => f in page))
        ok("worker list is a PagedResult envelope");
      else bad("worker list is not a PagedResult");
    }

    const oc = await fetch(`${BASE}/api/contracts/admin/owner`, { headers: H });
    if (oc.ok) ok("GET /api/contracts/admin/owner");
    else bad(`GET /api/contracts/admin/owner → ${oc.status}`);
    if (oc.ok) {
      const rows = await oc.json();
      if (Array.isArray(rows) && rows[0]) {
        for (const f of ["status", "phase", "previewUrl", "documentUrl", "renewalStartsAt"]) {
          if (f in rows[0]) ok(`owner contract has ${f}`);
          else bad(`owner contract missing ${f}`);
        }
      } else console.log("SKIP  owner contract field check (no contracts yet)");
    }

    const tpl = await fetch(`${BASE}/api/system/settings/contract.template.approved`, { headers: H });
    if (tpl.ok) {
      const s = await tpl.json();
      console.log(`INFO  contract.template.approved = ${s.value} (send fails with 409 while false)`);
    } else console.log(`INFO  contract.template.approved unreadable (${tpl.status})`);
  }
}

// ── 9. F-03·1 (PR #47): structured document data ───────────────────────────
const F031_FIELDS = {
  OwnerIdentityDto: ["firstName", "lastName", "passportNumber", "passportExpiry"],
  WorkerIdentityDto: ["firstName", "lastName", "passportNumber", "passportExpiry", "licenseExpiry"],
  OwnerCompanyDto: ["id", "name", "type", "licenseNumber", "licenseExpiry", "registrationDate",
    "countryId", "countryNameDe", "countryNameEn", "cityId", "cityNameDe", "cityNameEn", "taxNumber"],
  KycProfileDto: ["identity", "company"],
  KycDocDto: ["status", "rejectReason", "reviewedAt", "reviewedByAdminId"],
  WorkerDetailDto: ["identity"],
};
for (const [name, fields] of Object.entries(F031_FIELDS)) {
  const live = S[name]?.properties;
  if (!live) { bad(`F-03.1 schema ${name} missing`); continue; }
  const missing = fields.filter((f) => !(f in live));
  if (missing.length) bad(`${name} missing: ${missing.join(", ")}`);
  else ok(`F-03.1 ${name}`);
}
const COMPANY_TYPES_EXPECTED = ["Llc", "Gmbh", "IndividualEntrepreneur", "SoleTrader", "Other"];
const liveCompanyTypes = S.CompanyType?.enum;
if (liveCompanyTypes && COMPANY_TYPES_EXPECTED.every((v, i) => liveCompanyTypes[i] === v)) {
  ok("enum CompanyType");
} else {
  bad(`enum CompanyType: live=[${liveCompanyTypes}] expected=[${COMPANY_TYPES_EXPECTED}]`);
}
for (const [route, method] of [
  ["/api/admin/kyc/{ownerProfileId}/docs/{docId}/approve", "post"],
  ["/api/admin/kyc/{ownerProfileId}/docs/{docId}/reject", "post"],
]) {
  if (swagger.paths[route]?.[method]) ok(`route ${method.toUpperCase()} ${route}`);
  else bad(`route ${method.toUpperCase()} ${route} missing`);
}

console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
