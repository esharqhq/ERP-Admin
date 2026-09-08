import type { PagedQuery } from "@/lib/types/paged.types";

/**
 * Staffing agencies, as far as this panel currently reads them.
 *
 * Only the picker is here. The full agency surface — the application queue, the
 * detail, the three verbs, the links table — is sub-project #3 in
 * `docs/superpowers/plans/2026-08-31-admin-work-queue-roadmap.md` and will bring
 * its own richer DTOs. This file exists so the workers table's `?agencyId=`
 * filter has something to populate itself from without waiting for that.
 *
 * Guide: `../Backend/docs/handoff/f-05-c-worker-agency-link.md` §4.2.
 */

/**
 * One row of `GET /api/agencies/active`.
 *
 * **Three fields, and that is the whole point of the endpoint.** `GET /api/agencies`
 * returns far more and is gated on `agency:read` (170002); this one carries no
 * permission attribute at all — `[Authorize]` only — so a picker built on it works
 * for every admin, including one whose role does not include the agency screens.
 *
 * `city` is part of the contract rather than decoration: two agencies can share a
 * trading name, and the city is what tells them apart in a dropdown.
 *
 * ⚠ **A lapsed agency is absent here while its badge still renders on a worker
 * row.** Both halves are correct — the row states a historical fact, this endpoint
 * answers "who can be picked today" — so a worker can legitimately show an agency
 * name that the filter cannot offer.
 */
export interface ActiveAgencyDto {
  id: string;
  legalName: string;
  city: string | null;
}

/**
 * `status` on a worker↔agency link. TitleCase on the wire.
 *
 * ⚠ **Deliberately widened with `(string & {})`.** `guidance.md` §6's standing rule
 * is that no enum in this API is exhaustive — a value was added to
 * `onboardingStatus` and an exhaustive `switch` fell through. A closed union would
 * make `agencyLinkTurn`'s default branch unreachable code that `tsc` prunes, which
 * is exactly the branch that has to exist.
 *
 * Guide: `../Backend/docs/handoff/f-05-c-worker-agency-link.md` §3.
 */
export type AgencyLinkStatus =
  | "Proposed"
  | "Confirmed"
  | "Disputed"
  | "Rejected"
  | (string & {});

/**
 * Which side asserted the link. ⚠ **UPPERCASE on the wire, unlike `status`** —
 * `f-05-c` §3 says the two conventions genuinely differ and must not be
 * normalised to one another.
 */
export type AgencyLinkSetBy = "WORKER" | "ADMIN" | (string & {});

/**
 * One worker↔agency link, the full shape.
 *
 * Served two places: `GET /api/profile`'s `agency` key (the worker's own app) and
 * `GET /api/admin/workers/{id}`'s `agencyLink` (ours). ⚠ The **links table** row
 * is a *different, narrower* shape — it carries `workerId`/`workerFullName` and
 * `resolvedByAdminId` but **not `disputeNote`**, which is why the dispute queue
 * has to route to the worker's detail page to read an objection at all
 * (`f-05-c` §5.1).
 *
 * **A link is provenance, not a lease.** ⚠ There are **no dates on it** — no
 * start, no end, no expiry. Nothing changes its state on its own: the status only
 * ever moves because a person pressed a button (§1).
 */
export interface WorkerAgencyLinkDto {
  id: string;
  agencyId: string;
  agencyLegalName: string;
  status: AgencyLinkStatus;
  setByUserType: AgencyLinkSetBy;
  /**
   * Why the link was asserted. Required on an admin attach; `null` on a worker's
   * own declaration, which needs none.
   */
  reason: string | null;
  /**
   * The worker's own objection. ⚠ **This admin read is the only surface in the
   * panel that carries it** — the links table does not.
   */
  disputeNote: string | null;
  /** The admin's reason at resolution — including the overrule's. */
  resolutionReason: string | null;
  /**
   * ⚠ `null` in **three** cases, not two: while `Proposed`, while `Disputed`, and
   * on a link **the worker themselves confirmed** — a worker's agreement is not an
   * admin resolution and stamps nothing. So a `Confirmed` link with a null
   * `resolvedAt` is normal, not missing data.
   */
  resolvedAt: string | null;
  createdAt: string;
}

/**
 * `standing` on an agency — the four states an admin has to tell apart.
 *
 * ⚠ **Derived server-side from `signedOn`/`validUntil`, and never re-derived here.**
 * `AwaitingContract` deliberately outranks `Expired`, because a row can carry an
 * end date and no start date, and calling that *Expired* would claim a
 * partnership ended that never began. `isActive === (standing === "Active")`.
 *
 * ⚠ Widened with `(string & {})` so `standingTone`'s `default` branch is real code
 * rather than something `tsc` prunes.
 *
 * Guide: `../Backend/docs/handoff/f-05-a-application-review.md` §8.3.
 */
export type AgencyStanding =
  | "AwaitingContract"
  | "NotYetActive"
  | "Active"
  | "Expired"
  | (string & {});

/**
 * One partner agency, from `GET /api/agencies` and `GET /api/agencies/{id}` —
 * **the same 21 fields on both**, which is why this phase needs no per-id read.
 *
 * There is no `isDeleted`: a soft-deleted agency is simply absent.
 */
export interface AgencyDto {
  id: string;
  legalName: string;
  registrationNumber: string;
  licenceNumber: string | null;
  countryId: string;
  /** English display name. The id is authoritative. */
  country: string;
  cityId: string;
  city: string;
  contactPersonName: string;
  /**
   * The **company's** address. ⚠ Not the credential — see `loginEmail`, which this
   * legitimately diverges from after one edit.
   */
  contactEmail: string;
  contactPhone: string | null;
  /**
   * ⚠ **Load-bearing.** Absent means the agency cannot log in, whatever else is
   * set — login reads these two dates live on every attempt.
   */
  signedOn: string | null;
  validUntil: string | null;
  /** Derived, not stored. Exactly `standing === "Active"`. */
  isActive: boolean;
  agencyUserId: string;
  /**
   * The address the account authenticates with. ⚠ **No endpoint in this system
   * moves it** — the edit form carries `contactEmail` instead. Label the two
   * distinctly wherever both appear or an admin will assume an edit moved the login.
   */
  loginEmail: string;
  /**
   * Whether the one-time set-password link has been used. ⚠ **`false` is normal for
   * a fresh agency** — show it as *invitation pending* with a re-send action, never
   * as an error, and never merged into `standing`: the two are independent axes and
   * a new partner is legitimately `AwaitingContract` **and** pending at once.
   */
  isVerified: boolean;
  lastLoginAt: string | null;
  lastSeenAt: string | null;
  createdAt: string;
  standing: AgencyStanding;
}

/** `POST /api/agencies` — `agency:create` (170001). */
export interface CreateAgencyRequest {
  legalName: string;
  registrationNumber: string;
  licenceNumber?: string | null;
  countryId: string;
  cityId: string;
  contactPersonName: string;
  contactEmail: string;
  contactPhone?: string | null;
  /** ⚠ Optional, but omitting it creates an account that cannot log in. */
  signedOn?: string | null;
  validUntil?: string | null;
}

/**
 * `PUT /api/agencies/{id}` — `agency:update` (170007).
 *
 * ⚠ **Omission is not uniform.** `licenceNumber` and `contactPhone` are **cleared
 * to null** when omitted; `countryId`, `cityId`, `signedOn` and `validUntil` are
 * **kept**. Filed upstream as `G_AgencyEditWipesOptionalContactFields`. The client
 * answer is `buildAgencyUpdate`, which always sends every field.
 */
export interface UpdateAgencyRequest extends CreateAgencyRequest {
  /**
   * ⚠ The only way to blank a contract date — sending `null` means *unchanged*.
   * Applied **before** any date in the same request, so
   * `{ clearContractDates: true, signedOn: X }` means *keep the start, make it
   * open-ended*.
   */
  clearContractDates: boolean;
}

/**
 * Where an application sits in its one-way state machine.
 *
 * ⚠ Widened, like every other enum in this feature, so the mappers' `default`
 * branches are real code rather than something `tsc` prunes.
 */
export type AgencyApplicationStatus =
  | "Pending"
  | "InfoRequested"
  | "Approved"
  | "Rejected"
  | (string & {});

/** Which intake door was used. ⚠ There is no other record of it. */
export type AgencyApplicationSource = "Public" | "Admin" | (string & {});

/**
 * ⚠ Only the first two count toward `hasAllRequiredDocs`. C# member names,
 * case-insensitive on the wire, no underscore forms.
 */
export type AgencyApplicationDocumentType =
  | "RegistrationCertificate"
  | "Licence"
  | "Other"
  | (string & {});

/** One row of `GET /api/agency-applications`. */
export interface AgencyApplicationRowDto {
  id: string;
  legalName: string;
  registrationNumber: string;
  countryId: string;
  country: string;
  cityId: string;
  city: string;
  contactPersonName: string;
  contactEmail: string;
  status: AgencyApplicationStatus;
  createdAt: string;
  /** `null` on everything still open. */
  reviewedAt: string | null;
  docCount: number;
  /**
   * ⚠ **A flag an admin reads, never a refusal.** Nothing blocks a submit or an
   * approve on it — an applicant has no account and no returning session, so a
   * "finish your application" gate is one they would simply abandon. Draw it as a
   * warning marker, not an error.
   */
  hasAllRequiredDocs: boolean;
  source: AgencyApplicationSource;
  /**
   * Other **rejected** applications carrying this registration number,
   * case-insensitively. ⚠ **It flags; it does not block.** A rejected company may
   * apply again, and most rejections are *"your scan is unreadable"* rather than
   * *"you are not a real company"* — an operator who reads this as a verdict will
   * reject a legitimate second attempt.
   */
  previouslyRejectedCount: number;
}

export interface AgencyApplicationDocumentDto {
  id: string;
  type: AgencyApplicationDocumentType;
  fileName: string;
  mimeType: string;
  /** The **real stored** byte count, measured server-side. */
  sizeBytes: number;
  createdAt: string;
  /**
   * ⚠ **Minted fresh on every read and valid about five minutes.** Do not cache
   * it, store it, email it, or expect one from an earlier response to work. A
   * signed URL is a bearer token with no revocation, which is why the access
   * decision belongs to the permission-gated detail read rather than to the row.
   * If a preview 404s or 401s, **re-fetch the detail**.
   *
   * `null` on the confirm response — the uploader already has the file.
   */
  previewUrl: string | null;
}

/**
 * `GET /api/agency-applications/{id}`.
 *
 * ⚠ **`docCount` is deliberately absent here** — count `documents` instead.
 */
export interface AgencyApplicationDetailDto
  extends Omit<AgencyApplicationRowDto, "docCount"> {
  licenceNumber: string | null;
  contactPhone: string | null;
  expectedWorkerCount: number | null;
  /** The applicant's own pitch, up to 4000 characters. */
  message: string | null;
  termsVersion: number;
  termsAcceptedAt: string;
  /**
   * ⚠ **A different column from `decisionReason`, and both survive.** If an admin
   * asked for a clearer scan and then rejected, this response carries *both*
   * sentences — reject never writes this, request-info never writes that. If both
   * are populated, both happened, and rendering only the latest destroys half the
   * record.
   */
  infoRequestNote: string | null;
  decisionReason: string | null;
  reviewedByAdminId: string | null;
  /** The agency approve created. `null` until then. */
  createdAgencyId: string | null;
  documents: AgencyApplicationDocumentDto[] | null;
}

/** ⚠ `sortBy` is whitelisted — see `APPLICATION_SORT_COLUMNS`. */
export interface AgencyApplicationQuery extends PagedQuery {
  status?: string;
  countryId?: string;
  cityId?: string;
  /** Matches legal name, registration number **or** contact email. */
  search?: string;
  /** ⚠ Offset-less values are accepted: `2026-08-01` works. */
  submittedFrom?: string;
  submittedTo?: string;
}

/** request-info and reject share one shape; the field lands in different columns. */
export interface ReviewTextRequest {
  text: string;
}

/**
 * ⚠ **All three fields are optional and sending none is the normal case.**
 * `note` is recorded in `decisionReason` — the same column a rejection uses,
 * because both answer *"why this decision"*.
 */
export interface ApproveApplicationRequest {
  signedOn?: string;
  validUntil?: string;
  note?: string;
}
