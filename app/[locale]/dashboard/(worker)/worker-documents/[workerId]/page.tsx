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
import { useWorkerDetail } from "@/hooks/use-worker-detail";
import { useApproveWorker, useRejectWorker } from "@/hooks/use-worker-actions";
import {
  useApproveWorkerDoc,
  useRejectWorkerDoc,
  useWorkerDocs,
} from "@/hooks/use-worker-docs";
import {
  useCreateWorkerContract,
  useRecallContract,
  useRenewWorkerContract,
  useSendContract,
  useTerminateContract,
  useUpdateWorkerContractDraft,
  useWorkerContracts,
} from "@/hooks/use-contracts";
import { useCurrentPermissions } from "@/hooks/use-current-permissions";
import { useToday } from "@/hooks/use-today";
import { useUpload } from "@/hooks/use-upload";
import { newIdempotencyKey } from "@/lib/http/idempotency";
import { firstToRead } from "@/lib/onboarding/doc-set";
import { canAuthorContract } from "@/lib/onboarding/status";
import { describeApiError, isPermissionDenied } from "@/lib/onboarding/errors";
import { buildWorkerHistory } from "@/lib/onboarding/review-history";
import { workerToFactsData } from "@/lib/types/facts.types";
import { workerDocumentToReviewDoc, type ReviewDoc } from "@/lib/types/review-doc.types";

/**
 * One worker's document bundle: read the file, check it against the facts, decide.
 *
 * Same three-rail composition as the owner detail page — the file being read is
 * the screen, the facts it must match sit beside it, and the contract takes the
 * centre column only once approval unlocks it. Workers have no company, so
 * `FactsRail` runs its `kind: "worker"` branch (no legal-form row, licence
 * expiry from `identity` instead of a company record) and `FilesRail` gets
 * `hasCompany={false}` (no required-set line — a worker's required set is the
 * identity document alone).
 */
export default function WorkerDocsDetailPage() {
  const params = useParams<{ workerId: string }>();
  const workerId = params.workerId;
  const locale = useLocale();
  const t = useTranslations("docsWorkspace");
  const tDetail = useTranslations("docsWorkspace.detail");
  const tOnboarding = useTranslations("onboarding");
  const today = useToday();

  const detail = useWorkerDetail(workerId);
  const worker = detail.data;

  /**
   * `worker:approve`/`worker:reject` gate both the account-level decision and
   * the per-document verdict — same one-pair-for-both-levels shape the owner
   * side uses with `kyc:approve`/`kyc:reject` (`KycController.cs:263-340`,
   * mirrored on the worker side by `AdminWorkersController`/`AdminWorkerDocsController`).
   */
  const { permissions } = useCurrentPermissions();
  const canApprove = permissions === null ? null : permissions.has("worker:approve");
  const canReject = permissions === null ? null : permissions.has("worker:reject");

  const approveDoc = useApproveWorkerDoc(workerId);
  const rejectDoc = useRejectWorkerDoc(workerId);
  const approveAccount = useApproveWorker(workerId);
  const rejectAccount = useRejectWorker(workerId);

  const contracts = useWorkerContracts();
  const createContract = useCreateWorkerContract();
  const updateDraft = useUpdateWorkerContractDraft();
  const send = useSendContract("worker");
  const recall = useRecallContract("worker");
  const renew = useRenewWorkerContract();
  const terminate = useTerminateContract("worker", workerId);
  const upload = useUpload("contract-sources");

  const renewKey = useRef<string | null>(null);
  const [renewing, setRenewing] = useState(false);

  const reviewDocs = useMemo(
    () => (worker?.documents ?? []).map(workerDocumentToReviewDoc),
    [worker?.documents],
  );

  /** Which file is open — derived, not synchronised. See the owner page for why. */
  const [pickedId, setPickedId] = useState<string | null>(null);
  const selected =
    reviewDocs.find((d) => d.id === pickedId) ?? firstToRead(reviewDocs);
  const selectedId = selected?.id ?? null;

  /** Which of the two things the centre column is showing — derived the same way. */
  const [pane, setPane] = useState<CentrePane | null>(null);

  const contract = useMemo<ContractSummary | null>(() => {
    const mine = (contracts.data ?? [])
      .filter((c) => c.workerId === workerId)
      .sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    const newest = mine[0];
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
  }, [contracts.data, workerId]);

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

  if (detail.isLoading) return <DetailSkeleton />;

  if (detail.error || !worker) {
    const denied = detail.error && isPermissionDenied(detail.error);
    return (
      <Guard
        title={denied ? tOnboarding("permissionDenied") : tDetail("notFoundTitle")}
        body={
          denied
            ? tDetail("forbiddenBody")
            : tOnboarding(
                `apiErrors.${describeApiError(detail.error)?.labelKey ?? "subjectNotFound"}`,
              )
        }
        backLabel={t("backToWorkerDocs")}
      />
    );
  }

  /**
   * Rejections are swallowed on purpose — see the owner page's `saveDraft` for
   * why. Worker contracts have no term fields (`generalTerms`/`extraClauses`
   * are owner-only), so the body stays two fields shorter than the owner side's.
   */
  async function saveDraft(values: ContractFormValues, file: File | null) {
    try {
      const fileUrl = file ? await upload.mutateAsync(file) : "";
      const body = {
        eligibleFrom: toUtcIso(values.eligibleFrom),
        eligibleTo: toUtcIso(values.eligibleTo, true),
        fileName: file?.name ?? "",
        fileUrl,
      };

      if (renewing) {
        renewKey.current ??= newIdempotencyKey();
        await renew.mutateAsync({
          workerId,
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
      await createContract.mutateAsync({ workerId, body });
    } catch {
      // Reported by `contractError` above.
    }
  }

  const name = worker.fullName ?? workerId.slice(0, 8);
  const contact = worker.phoneNumber ?? worker.email ?? null;

  const step = deriveStep(worker.onboardingStatus, contract?.phase ?? null);
  const docBusy = approveDoc.isPending || rejectDoc.isPending;
  const accountBusy = approveAccount.isPending || rejectAccount.isPending;

  const approved = step > 1;

  const contractAvailable =
    canAuthorContract(worker.onboardingStatus) || contract !== null || renewing;

  const centre: CentrePane = contractAvailable
    ? (pane ?? (approved ? "contract" : "file"))
    : "file";

  const decision = (
    <DecisionBlock
      status={worker.onboardingStatus}
      rejectReason={worker.onboardingRejectReason}
      canApprove={canApprove}
      canReject={canReject}
      busy={accountBusy}
      onApprove={() => approveAccount.mutate()}
      onReject={(reason) => rejectAccount.mutate(reason)}
    />
  );

  return (
    <div className="flex flex-col gap-5">
      <DetailHeader
        backHref="/dashboard/worker-documents"
        backLabel={t("backToWorkerDocs")}
        name={name}
        status={worker.onboardingStatus}
        step={step}
        passportNumber={worker.identity?.passportNumber ?? null}
        lockNote={
          worker.onboardingStatus === "Review" ? tDetail("lockedUntilApproved") : null
        }
      />

      <ErrorNotice error={reviewError} />

      <div className="flex flex-col gap-4 lg:flex-row">
        <FilesRail
          docs={reviewDocs}
          hasCompany={false}
          approved={approved}
          selectedId={centre === "file" ? selectedId : null}
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
                variant="worker"
                status={worker.onboardingStatus}
                subjectName={name}
                subjectContact={contact}
                canAuthor={canAuthorContract(worker.onboardingStatus) || renewing}
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

        <div className="flex w-full shrink-0 flex-col gap-3 lg:w-[19rem]">
          {approved && decision}
          <FactsRail data={workerToFactsData(worker.identity)} today={today} />
          {!approved && decision}

          {!approved && !contractAvailable && <ContractLockHint />}

          <ReviewHistory entries={buildWorkerHistory(worker)} />
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
        render={<Link href="/dashboard/worker-documents" />}
      >
        {backLabel}
      </Button>
    </div>
  );
}
