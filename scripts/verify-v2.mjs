import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Contract check: our TS unions must match the live API's enums, and the DTOs we
// depend on must still carry the fields we read. Run with: npm run verify:api
// ⚠ `germany-erp.esharq.com` no longer resolves to this API — it answers with a
// certificate for `admin.uyer.app`, so every run died on ERR_TLS_CERT_ALTNAME_
// INVALID before a single check ran. `api.uyer.app` is the host the backend's
// own catch-up procedure reads swagger from. Override with ERP_API.
const BASE = process.env.ERP_API ?? "https://api.uyer.app";

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
  // 2026-08-28: `Blocked` was renamed `Lapsed`, and a real admin `Blocked` added.
  // The owner table refuses `Blocked`, so the app keeps two lists —
  // `ACCOUNT_STATUS_FILTERS` (owners) and `WORKER_STATUS_FILTERS` (this one).
  AccountStatusFilter: ["Active", "Pending", "Deleted", "Lapsed", "Blocked"],
  SortDir:             ["Asc", "Desc"],
  OnboardingSubjectType: ["Owner", "Worker"],
  // 2026-09-01 added `RepresentativeAuthorization` (the authorization letter).
  OwnerKYCDocType:     ["Passport", "IdCard", "ResidencePermit", "BusinessLicense",
                        "CompanyRegistration", "TaxCertificate", "Other",
                        "RepresentativeAuthorization"],
  // The day states — must match the words `canonicalTaskStatus` knows
  // (`lib/tasks/status-vocab.ts`). They moved three times: F-07 ·0 renamed two
  // (2026-09-17) and ·5 added `Rejected` (2026-09-21). A seventh value turns this
  // red, which is the point: every day-state consumer must learn it first.
  TaskStatus:          ["Pending", "CheckedIn", "InReview", "Done", "Cancelled", "Rejected"],
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
  // owner-location-model (2026-08-13): the owner's own city/country NAMES;
  // companyCity is gone. Rendered including blanks (f-02-4 §2.1).
  OwnerRowDto: ["id", "fullName", "email", "phoneNumber", "status", "onboardingStatus",
    "isVerified", "propertyCount", "createdAt", "ownerType",
    "city", "country", "lastOrderedAt", "taskCount",
    // ⚠ `?status=Deleted` was accepted and always answered `total: 0` until
    // 2026-09-07. These two are the deleted-owners screen's whole content.
    "deletedAt", "deletedBy"],
  OwnerRowDtoPagedResult: ["items", "total", "page", "pageSize", "totalPages"],
  // `employeeType` went with register-merge (2026-08-19) and `onTask` was renamed
  // `booked` (2026-08-27) — both asserted gone in section 3. The rest are what the
  // Workers table renders: location (F-04a), recency (2026-08-13), agency (F-05c).
  WorkerRowDto: ["id", "fullName", "email", "phoneNumber", "licenseExpiry", "status", "onboardingStatus",
    "skills", "rating", "experience", "completedTasks",
    "hasActiveContract", "booked", "createdAt",
    "country", "city", "lastSeenAt", "lastLoginAt",
    "agency", "pendingAgency", "pendingAgencyStatus",
    // Same as OwnerRowDto — the deleted-workers screen reads these two.
    "deletedAt", "deletedBy"],
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
  // F-07 ·9b (f-02c §4.1a) added the `country`/`city` pair, each a `LocationRefDto`:
  // detail renders it and the edit dialog seeds its selects from it. The write
  // side takes `countryId`/`cityId`, both optional — so a rename would not 400,
  // it would silently fall back to the owner's city on create and "keep" on edit.
  PropertyDto: ["id", "bossOwnerUserId", "name", "address", "lat", "long", "category",
    "entryInstructions", "floorCount", "roomCount", "areaSqm", "createdAt", "country", "city",
    "isDeleted", "media"],
  LocationRefDto: ["id", "nameDe", "nameEn"],
  PropertyCategoryRefDto: ["id", "code", "nameDe", "nameEn"],
  PropertyCategoryDto: ["id", "code", "nameDe", "nameEn", "icon", "color", "description", "isActive"],
  PropertyMediaDto: ["id", "propertyId", "type", "url", "originalFileName", "mimeType",
    "fileSize", "createdAt"],
  UpdatePropertyRequest: ["name", "address", "lat", "long", "propertyCategoryId",
    "entryInstructions", "countryId", "cityId", "floorCount", "roomCount", "areaSqm"],
  AdminCreatePropertyRequest: ["ownerUserId", "name", "address", "lat", "long",
    "propertyCategoryId", "entryInstructions", "countryId", "cityId", "floorCount", "roomCount",
    "areaSqm"],
  // The Walk-In order form sends `defaultDeadline`; the orders list and detail
  // sheet render every TaskGroupDto/TaskItemDto field below. Nothing else in this
  // script covered the tasks surface, which is how a change here would otherwise
  // break the page with every gate green.
  // F-07 ·7 made `instructions` + `ownerProvidesTools` required and added
  // `addOnNote`; ·9b added the walk-in `cityId`. Both order forms send all of
  // them, and a missing one refuses every create — the third way these forms
  // have shipped unable to file an order.
  CreateTaskGroupRequest: ["propertyId", "title", "defaultStartTime", "defaultDeadline",
    "defaultWorkerLimit", "dates", "instructions", "internalNote", "ratingFloor",
    "eligibleProfessionIds", "allowNewWorkers", "ownerProvidesTools", "addOnNote",
    "cityId", "lat", "long"],
  // F-07 ·12 — a one-date order goes here; `date`, singular, where the booking
  // has `dates`.
  CreateSingleTaskRequest: ["propertyId", "title", "date", "defaultStartTime", "defaultDeadline",
    "defaultWorkerLimit", "instructions", "ownerProvidesTools", "addOnNote", "cityId",
    "lat", "long"],
  // F-07 ·10 — "Copy as new order". Every field but `dates` means "copy" when
  // absent, and the three gap-fill fields are refused when the source already
  // has them — so a renamed field would silently turn into "copy" or a 400.
  CloneTaskGroupRequest: ["dates", "defaultStartTime", "defaultDeadline", "title",
    "instructions", "ownerProvidesTools", "cityId", "lat", "long"],
  // F-07 ·5 — the complaint read and the decide body. The guide documents
  // neither shape, so this line is the only thing that would notice a rename.
  TaskComplaintDto: ["id", "taskId", "reason", "raisedAt", "decision", "decidedAt",
    "decisionNote", "supportTicketId", "photos"],
  TaskComplaintPhotoDto: ["id", "url", "originalFileName", "mimeType"],
  DecideComplaintRequest: ["decision", "note"],
  // ⚠ `status` is NOT here. F-07 ·0 (2026-09-17) deleted it from TaskGroupDto;
  // this line asserted it for four days and was one of the few things that did
  // go red — see the `days`/`closed` counts below, which replaced it.
  // F-07 ·10 — the copy dialog decides from `title`, `instructions`,
  // `ownerProvidesTools` (which answers to ask for) and `cityId`/`ownerId` (is it
  // a walk-in order), so a rename of any of them changes what the clone sends.
  TaskGroupDto: ["id", "propertyId", "ownerId", "title", "defaultStartTime", "defaultDeadline",
    "instructions", "days", "closed", "ratingFloor", "allowNewWorkers", "eligibleProfessionIds",
    "dates", "tasks", "createdAt", "ownerProvidesTools", "cityId"],
  TaskGroupDayCountsDto: ["total", "pending", "checkedIn", "inReview", "done", "cancelled",
    "rejected"],
  // ⚠ `closedReplacement` is always 0 today — forward-declared for ·5. Gated so
  // that if it is ever dropped rather than filled, this fails instead of the UI.
  TaskGroupClosureCountsDto: ["ownerAccepted", "autoAccepted", "closedForced",
    "closedReplacement"],
  TaskItemDto: ["id", "groupId", "propertyId", "propertyName", "scheduledDate", "scheduledAt",
    "deadline", "status", "requiredWorkerCount", "startedAt", "completedAt", "workers",
    // F-07 ·4 (supervisor, summary) and ·3 (how the day closed).
    "supervisorWorkerId", "workSummary", "closureReason",
    // F-07 ·5 — filled by `GET /api/tasks/{taskId}` only; every list, PATCH,
    // admin-assign and the tasks nested in a booking serve `null`.
    "complaint"],
  AdminSetSupervisorRequest: ["workerId"],
  TaskSupervisorDto: ["taskId", "supervisorWorkerId"],
  // ⚠ Mandatory. A bodiless request is refused by model binding before the
  // action runs and answers problem-details with no `error` key at all.
  ForceCloseTaskRequest: ["reason"],
  // One body, both restore doors. ⚠ `reason` is mandatory.
  RestoreAccountRequest: ["reason"],
  TaskWorkerDto: ["id", "taskId", "workerId", "workerName", "outcome", "starRating",
    "assignedAt", "checkinAt", "submittedAt", "checkoutAt",
    // F-07 ·2 (2026-09-22) — the check-in door. ⚠ On `OwnerScannedWorker` the
    // row's coordinates are the scanner's phone; dropped, that caveat vanishes.
    "checkinDoor"],
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
  // register-merge (2026-08-19) also took `address` and `employeeType` off the detail.
  WorkerDetailDto: ["isApproved", "address", "employeeType"],
  KycProfileDto: "kycStatus", KycProfileSummaryDto: "isApproved",
  // F-02c retired the `type` enum and deleted the document-review fields. If any
  // of these reappear, this app's rewritten property surface is reading the
  // wrong contract again.
  PropertyDto: "type",
  // ⚠ F-07 ·0 deleted it outright, with no compatibility alias. If it comes back
  // under this name, `isGroupActive` and `groupBucket` are reading the wrong
  // contract again — which is exactly how Cancel vanished from three screens.
  TaskGroupDto: "status",
  // register-merge (2026-08-19) removed `employeeType`; F-06d (2026-08-27) renamed
  // `onTask` → `booked`. `?onTask=`/`?employeeType=` are silently ignored now, so a
  // reader that came back would filter nothing without an error.
  WorkerRowDto: ["employeeType", "onTask"],
  // owner-location-model §4: the company lost its country/city pair to `registrationAddress`.
  OwnerCompanyDto: ["countryId", "cityId", "cityNameEn", "countryNameEn"],
})) {
  const live = S[name]?.properties ?? {};
  for (const d of [].concat(dead)) {
    if (d in live) bad(`${name}.${d} still exists — removed field came back`);
    else ok(`${name}.${d} gone`);
  }
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
  // F-07 ·12 — the single-task door both order forms route one date to.
  ["/api/tasks/admin/single", "post"],
  // F-07 ·10 — the admin clone door ("Copy as new order").
  ["/api/tasks/admin/groups/{id}/clone", "post"],
  // F-07 ·5 — the decide door and the team's evidence the complaint page reads.
  ["/api/tasks/complaints/{complaintId}/decide", "post"],
  ["/api/tasks/{taskId}/media", "get"],
  ["/api/tasks/{taskId}/admin-assign/{workerId}", "post"],
  ["/api/tasks/{taskId}/admin-assign/{workerId}", "delete"],
  // F-07 ·4 / ·3 — the two SUPER_ADMIN doors on a day.
  ["/api/tasks/{taskId}/supervisor", "put"],
  ["/api/tasks/{taskId}/force-close", "post"],
  // The two restore doors — SUPER_ADMIN only, shipped 2026-09-10 as a `fix`
  // whose guide Revision was deliberately NOT bumped, so the date alone would
  // never have surfaced them.
  ["/api/admin/workers/{id}/restore", "post"],
  ["/api/owners/{id}/restore", "post"],
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

// The day list Dispatch and the shift grid read. `task.service.ts` sends a closed
// window (`scheduledFrom`/`scheduledTo`) and `status`; without the window the route
// falls back to a 500-row cap (f-02a-1 §8), silently.
const tasksParams = (swagger.paths["/api/tasks/admin"]?.get?.parameters ?? []).map((p) => p.name);
// F-07 ·8 — `staffing` feeds the home page's short-handed card (Warning|Critical).
for (const p of ["scheduledFrom", "scheduledTo", "status", "staffing"]) {
  if (tasksParams.includes(p)) ok(`GET /api/tasks/admin takes ?${p}`);
  else bad(`GET /api/tasks/admin lost ?${p}`);
}

// owner-location-model (2026-08-13) replaced `companyCityId` with this pair.
// An unknown query key is ignored, so a stale name returns the whole table.
// Swagger lists these PascalCase (`CityId`), hence the lower-casing.
const ownersParams = (swagger.paths["/api/admin/owners"]?.get?.parameters ?? []).map((p) => p.name.toLowerCase());
for (const p of ["cityid", "countryid"]) {
  if (ownersParams.includes(p)) ok(`GET /api/admin/owners takes ?${p}`);
  else bad(`GET /api/admin/owners lost ?${p}`);
}
if (ownersParams.includes("companycityid")) bad("GET /api/admin/owners still takes ?companyCityId");
else ok("GET /api/admin/owners no longer takes ?companyCityId");

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
    // Paged since 2026-09-08 (`kyc-queue-load-audit`) — it was a bare array
    // silently capped at 200. `kyc.service.ts` reads the `PagedResult` envelope.
    const kycPage = kyc.ok ? await kyc.json() : {};
    const kycRows = kycPage?.items;
    if (Array.isArray(kycRows) && typeof kycPage.total === "number") {
      ok(`kyc list is paged (${kycRows.length} of ${kycPage.total} rows)`);
      if (kycRows[0]) {
        for (const f of ["ownerProfileId", "ownerUserId", "onboardingStatus", "documentCount"]) {
          if (f in kycRows[0]) ok(`kyc row has ${f}`);
          else bad(`kyc row missing ${f}`);
        }
        if ("kycStatus" in kycRows[0]) bad("kyc row still has kycStatus");
      } else console.log("SKIP  kyc row field check (queue is empty)");
    } else bad("kyc list is not a PagedResult envelope");

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
  // owner-location-model §4 (2026-08-13): one plain-text address replaced the country/city pair.
  OwnerCompanyDto: ["id", "name", "type", "licenseNumber", "licenseExpiry", "registrationDate",
    "registrationAddress", "taxNumber"],
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
