"use client";

import { useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { ShieldOff } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import {
  ContractPanel,
  toUtcIso,
  type ContractFormValues,
  type ContractSummary,
} from "@/components/docs-workspace/contract-panel";
import { ContractLockHint } from "@/components/docs-workspace/detail/contract-lock-hint";
import { DecisionBlock } from "@/components/docs-workspace/detail/decision-block";
import { DetailHeader } from "@/components/docs-workspace/detail/detail-header";
import { FactsRail } from "@/components/docs-workspace/detail/facts-rail";
import { FilesRail } from "@/components/docs-workspace/detail/files-rail";
import { FileViewer } from "@/components/docs-workspace/detail/file-viewer";
import {
  PaneSwitch,
  type CentrePane,
} from "@/components/docs-workspace/detail/pane-switch";
import { ReviewHistory } from "@/components/docs-workspace/detail/review-history";
import { VerdictRow } from "@/components/docs-workspace/detail/verdict-row";
import { ErrorNotice } from "@/components/onboarding/error-notice";
import { deriveStep } from "@/components/docs-workspace/onboarding-stepper";
import {
  useApproveKyc,
  useApproveKycDoc,
  useKycProfile,
  useRejectKyc,
  useRejectKycDoc,
} from "@/hooks/use-kyc";
import {
  useCreateOwnerContract,
  useOwnerContracts,
  useRecallContract,
  useRenewOwnerContract,
  useSendContract,
  useTerminateContract,
  useUpdateOwnerContractDraft,
} from "@/hooks/use-contracts";
import { useCurrentPermissions } from "@/hooks/use-current-permissions";
import { useToday } from "@/hooks/use-today";
import { useUpload } from "@/hooks/use-upload";
import { newIdempotencyKey } from "@/lib/http/idempotency";
import { firstToRead } from "@/lib/onboarding/doc-set";
import { canAuthorContract } from "@/lib/onboarding/status";
import { describeApiError, isPermissionDenied } from "@/lib/onboarding/errors";
import { buildHistory } from "@/lib/onboarding/review-history";
import { kycDocToReviewDoc, type ReviewDoc } from "@/lib/types/review-doc.types";

/**
 * One owner's KYC bundle: read the file, check it against the facts, decide.
 *
 * **The layout is the point.** What shipped before gave ~70% of the width to a
 * contract form that is *illegal* until the bundle is approved — the server
 * answers `409 onboarding_not_approved` — and squeezed the documents, which are
 * the actual work, into a 30% rail. This flips it: the file being read is the
 * screen, the facts it must match sit beside it, and the contract takes its space
 * only once approval has unlocked it.
 *
 * The rails are plain layout here rather than a shared shell taking slots. They
 * reorder by stage, and the previous shell's `contract`/`documents` props are how
 * every real difference between the two screens turned into another prop.
 *
 * **F5.** The contract used to sit full width *below* the rails, so reaching step 2
 * meant scrolling past a finished document review to find it. It now takes the
 * centre column — the space the viewer occupies while reading files is still the
 * work — and the right rail reorders around it: at Review the order is Check
 * against → Decision → where-the-contract-will-open, and once approved it is
 * Submission → Check against → Review history.
 */
export default function OwnerDocsDetailPage() {
  const params = useParams<{ ownerProfileId: string }>();
  const ownerProfileId = params.ownerProfileId;
  const locale = useLocale();
  const t = useTranslations("docsWorkspace");
  const tDetail = useTranslations("docsWorkspace.detail");
  const tOnboarding = useTranslations("onboarding");
  const today = useToday();

  const profile = useKycProfile(ownerProfileId, true);
  const owner = profile.data;

  /**
   * Three separate grants, not one. Read through `useCurrentPermissions` rather
   * than `useHasPermission`, which collapses "denied" and "not resolved yet" into
   * one `false` — right for a button, wrong here, where the block states a
   * refusal in words and would assert it for one paint on a cold start.
   */
  const { permissions } = useCurrentPermissions();
  const canApprove = permissions === null ? null : permissions.has("kyc:approve");
  const canReject = permissions === null ? null : permissions.has("kyc:reject");

  const approveDoc = useApproveKycDoc(ownerProfileId);
  const rejectDoc = useRejectKycDoc(ownerProfileId);
  const approveAccount = useApproveKyc();
  const rejectAccount = useRejectKyc();

  const contracts = useOwnerContracts();
  const createContract = useCreateOwnerContract();
  const updateDraft = useUpdateOwnerContractDraft();
  const send = useSendContract("owner");
  const recall = useRecallContract("owner");
  const renew = useRenewOwnerContract();
  // `ownerProfileId` (the route param), not `ownerUserId` — the KYC profile
  // detail query this invalidates is keyed on the profile id.
  const terminate = useTerminateContract("owner", ownerProfileId);
  const upload = useUpload("contract-sources");

  const renewKey = useRef<string | null>(null);
  const [renewing, setRenewing] = useState(false);

  const reviewDocs = useMemo(
    () => (owner?.documents ?? []).map(kycDocToReviewDoc),
    [owner?.documents],
  );

  /**
   * Which file is open — **derived**, not synchronised.
   *
   * An explicit pick wins as long as that file is still in the bundle; otherwise
   * the screen falls back to the one that most needs a decision (`firstToRead`).
   * Deriving rather than storing-and-resetting means there is no effect to keep in
   * step, and approving the open file leaves it open instead of jumping the admin
   * somewhere else.
   */
  const [pickedId, setPickedId] = useState<string | null>(null);
  const selected =
    reviewDocs.find((d) => d.id === pickedId) ?? firstToRead(reviewDocs);
  const selectedId = selected?.id ?? null;

  /**
   * Which of the two things the centre column is showing — derived the same way
   * and for the same reason. `null` means "nobody has chosen", so the column
   * follows the stage: files while they are the work, the contract once it is.
   * An explicit choice holds until the stage stops offering it.
   */
  const [pane, setPane] = useState<CentrePane | null>(null);

  /**
   * The two owner ids are not interchangeable: KYC routes take `ownerProfileId`
   * (the URL), contract-authoring routes take `ownerUserId` (this field).
   */
  const ownerUserId = owner?.ownerUserId ?? null;

  const contract = useMemo<ContractSummary | null>(() => {
    if (!ownerUserId) return null;
    const newest = (contracts.data ?? [])
      .filter((c) => c.ownerUserId === ownerUserId)
      .sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0];
    return newest
      ? {
          id: newest.id,
          phase: newest.phase,
          eligibleFrom: newest.eligibleFrom,
          eligibleTo: newest.eligibleTo,
          previewUrl: newest.previewUrl,
          documentUrl: newest.documentUrl,
          revisionReason: newest.revisionReason,
          renewalStartsAt: newest.renewalStartsAt,
          signedAt: newest.signedAt,
          signatureMethod: newest.signatureMethod,
        }
      : null;
  }, [contracts.data, ownerUserId]);

  /**
   * Split in two, by where the admin was looking when it happened.
   *
   * One combined notice under the header used to carry both, which put a failed
   * "Save draft" at the top of the page while the button that caused it sat in
   * the centre column — the admin's own reading of that is "I clicked and
   * nothing happened". Review verdicts stay up top, beside the stepper they
   * change; contract failures go into the panel's own `error` slot, which is
   * what that prop was added for and what the worker screen already did.
   */
  const reviewError =
    approveDoc.error ??
    rejectDoc.error ??
    approveAccount.error ??
    rejectAccount.error ??
    null;

  const contractError =
    createContract.error ??
    updateDraft.error ??
    send.error ??
    recall.error ??
    renew.error ??
    terminate.error ??
    upload.error ??
    null;

  if (profile.isLoading) return <DetailSkeleton />;

  /**
   * A refusal is not a failure, and it is not an empty page. Reading this route
   * needs `kyc:review`, so a 403 means the bundle exists and is not yours to see —
   * a different sentence from "not found", which means no profile row exists at
   * all (a sub-account, or the walk-in account).
   */
  if (profile.error || !owner) {
    const denied = profile.error && isPermissionDenied(profile.error);
    return (
      <Guard
        title={denied ? tOnboarding("permissionDenied") : tDetail("notFoundTitle")}
        body={
          denied
            ? tDetail("forbiddenBody")
            : tOnboarding(
                `apiErrors.${describeApiError(profile.error)?.labelKey ?? "subjectNotFound"}`,
              )
        }
        backLabel={t("backToOwnerDocs")}
      />
    );
  }

  /**
   * Rejections are swallowed on purpose. Every await below is a `mutateAsync`,
   * chosen because the steps are sequential (upload, then author) — but the
   * click handler that calls this discards the promise, so a failure would
   * surface only as an "Uncaught (in promise)" in the console. There is nothing
   * to add here: React Query already holds the error, and the panel renders it
   * beside the button that failed.
   */
  async function saveDraft(values: ContractFormValues, file: File | null) {
    if (!ownerUserId) return;
    try {
      const fileUrl = file ? await upload.mutateAsync(file) : "";
      const body = {
        eligibleFrom: toUtcIso(values.eligibleFrom),
        eligibleTo: toUtcIso(values.eligibleTo, true),
        fileName: file?.name ?? "",
        fileUrl,
        commissionPercent: Number(values.commissionPercent) || 0,
        paymentOrder: values.paymentOrder.trim() || null,
        generalTerms: values.generalTerms.trim() || null,
        extraClauses: values.extraClauses.trim() || null,
      };

      if (renewing) {
        renewKey.current ??= newIdempotencyKey();
        await renew.mutateAsync({
          ownerUserId,
          body,
          idempotencyKey: renewKey.current,
        });
        setRenewing(false);
        renewKey.current = null;
        return;
      }

      if (contract && contract.phase === "Draft") {
        await updateDraft.mutateAsync({ contractId: contract.id, body });
        return;
      }
      await createContract.mutateAsync({ ownerUserId, body });
    } catch {
      // Reported by `contractError` above.
    }
  }

  const name =
    [owner.identity?.firstName, owner.identity?.lastName].filter(Boolean).join(" ") ||
    ownerProfileId.slice(0, 8);

  const step = deriveStep(owner.onboardingStatus, contract?.phase ?? null);
  const docBusy = approveDoc.isPending || rejectDoc.isPending;
  const accountBusy = approveAccount.isPending || rejectAccount.isPending;

  /**
   * Approval is the hinge the whole screen turns on, and `step` already encodes
   * it: `deriveStep` only leaves step 1 once the submission is approved, and it
   * maps `Rejected` back to 1 deliberately. Reading it from there rather than
   * re-testing the status keeps the stepper and the layout from ever disagreeing.
   */
  const approved = step > 1;

  /**
   * Whether the centre column has a contract to show at all — the same condition
   * that used to gate the panel below the rails, unchanged. It is deliberately
   * broader than `approved`: a bundle reverted to Kyc keeps the contract it
   * already had, and that contract must stay reachable, where it states its own
   * blocker sentence rather than vanishing.
   */
  const contractAvailable =
    canAuthorContract(owner.onboardingStatus) || contract !== null || renewing;

  /** An explicit pick wins; otherwise the stage decides. See `pane` above. */
  const centre: CentrePane = contractAvailable
    ? (pane ?? (approved ? "contract" : "file"))
    : "file";

  /**
   * Built once and placed at one of two heights, because the block is identical
   * either way and only its position carries meaning. An **element**, not a
   * component declared in the body: a nested `function Decision()` is a new
   * component type on every render, so React would unmount and remount
   * `DecisionBlock` each time — losing the half-typed reason in its reject
   * dialog on every keystroke.
   */
  const decision = (
    <DecisionBlock
      status={owner.onboardingStatus}
      rejectReason={owner.onboardingRejectReason}
      canApprove={canApprove}
      canReject={canReject}
      busy={accountBusy}
      onApprove={() => approveAccount.mutate(ownerProfileId)}
      onReject={(reason) => rejectAccount.mutate({ ownerProfileId, reason })}
    />
  );

  return (
    <div className="flex flex-col gap-5">
      <DetailHeader
        backHref="/dashboard/owner-documents"
        backLabel={t("backToOwnerDocs")}
        name={name}
        status={owner.onboardingStatus}
        step={step}
        company={owner.company?.name ?? null}
        passportNumber={owner.identity?.passportNumber ?? null}
        lockNote={
          owner.onboardingStatus === "Review" ? tDetail("lockedUntilApproved") : null
        }
      />

      <ErrorNotice error={reviewError} />

      {/* Three rails: the index, the work, the facts. They stack on a narrow
          screen with the **centre first** — it is what the screen is for. */}
      <div className="flex flex-col gap-4 lg:flex-row">
        <FilesRail
          docs={reviewDocs}
          hasCompany={owner.company !== null}
          approved={approved}
          /* Nothing is `aria-current` while the contract holds the column — the
             viewer is unmounted, so a highlighted row would point at no screen. */
          selectedId={centre === "file" ? selectedId : null}
          /* Picking a file is also how the viewer comes back once the contract
             has taken the column. The rail is the index in both stages. */
          onSelect={(doc: ReviewDoc) => {
            setPickedId(doc.id);
            setPane("file");
          }}
        />

        <div className="order-first flex min-w-0 flex-1 flex-col gap-3 lg:order-none">
          {contractAvailable && <PaneSwitch pane={centre} onChange={setPane} />}

          {centre === "contract" ? (
            <div className="rounded-xl bg-card p-5 shadow-card ring-1 ring-foreground/10">
              <ContractPanel
                variant="owner"
                status={owner.onboardingStatus}
                subjectName={name}
                subjectContact={null}
                canAuthor={canAuthorContract(owner.onboardingStatus) || renewing}
                contract={renewing ? null : contract}
                locale={locale}
                saving={
                  createContract.isPending ||
                  updateDraft.isPending ||
                  renew.isPending ||
                  upload.isPending
                }
                sending={send.isPending}
                terminating={terminate.isPending}
                error={<ErrorNotice error={contractError} />}
                onSaveDraft={saveDraft}
                onSend={(contractId) => send.mutate(contractId)}
                onRecall={(contractId, reason) =>
                  recall.mutate({ contractId, body: { reason } })
                }
                onRenew={() => {
                  renewKey.current = newIdempotencyKey();
                  setRenewing(true);
                }}
                onTerminate={(contractId) => terminate.mutate(contractId)}
              />
            </div>
          ) : (
            <>
              <FileViewer doc={selected} />
              {selected && (
                <VerdictRow
                  doc={selected}
                  canApprove={canApprove}
                  canReject={canReject}
                  busy={docBusy}
                  onApprove={(docId) => approveDoc.mutate(docId)}
                  onReject={(docId, reason) => rejectDoc.mutate({ docId, reason })}
                />
              )}
            </>
          )}
        </div>

        {/*
          The right rail is the one thing that reorders by stage. Before a
          decision the question is whether to approve, so the facts to check
          against come first and the decision sits under them; afterwards the
          decision is a record of what happened, and it leads. Design §03 → §04.
        */}
        <div className="flex w-full shrink-0 flex-col gap-3 lg:w-[19rem]">
          {approved && decision}
          <FactsRail
            identity={owner.identity}
            company={owner.company}
            today={today}
          />
          {!approved && decision}

          {/* Only while the centre column genuinely has nothing to switch to —
              once the contract is reachable, pointing at it is furniture. */}
          {!approved && !contractAvailable && <ContractLockHint />}

          <ReviewHistory entries={buildHistory(owner)} />
        </div>
      </div>

    </div>
  );
}

/** Holds the real three-rail geometry, so nothing jumps when the profile lands. */
function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-8 w-40 rounded-md" />
      <Skeleton className="h-10 w-72 rounded-md" />
      <div className="flex flex-col gap-4 lg:flex-row">
        <Skeleton className="h-96 w-full rounded-xl lg:w-56" />
        <Skeleton className="h-96 min-w-0 flex-1 rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl lg:w-[19rem]" />
      </div>
    </div>
  );
}

function Guard({
  title,
  body,
  backLabel,
}: {
  title: string;
  body: string;
  backLabel: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl bg-card px-6 py-16 text-center shadow-card ring-1 ring-foreground/10">
      <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <ShieldOff className="size-5" />
      </span>
      <p className="text-sm font-semibold">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground text-pretty">{body}</p>
      <Button
        variant="outline"
        size="sm"
        nativeButton={false}
        className="mt-1"
        render={<Link href="/dashboard/owner-documents" />}
      >
        {backLabel}
      </Button>
    </div>
  );
}
