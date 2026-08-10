"use client";

import { useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ContractPanel,
  toUtcIso,
  type ContractFormValues,
  type ContractSummary,
} from "@/components/docs-workspace/contract-panel";
import { DocumentsPanel } from "@/components/docs-workspace/documents-panel";
import { IdentityPanel } from "@/components/docs-workspace/identity-panel";
import { SubjectDetail } from "@/components/docs-workspace/subject-detail";
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
import { useUpload } from "@/hooks/use-upload";
import { newIdempotencyKey } from "@/lib/services/contract.service";
import { canAuthorContract, canDecide } from "@/lib/onboarding/status";
import { describeApiError, isPermissionDenied } from "@/lib/onboarding/errors";

export default function WorkerDocsDetailPage() {
  const params = useParams<{ workerId: string }>();
  const workerId = params.workerId;
  const locale = useLocale();
  const t = useTranslations("docsWorkspace");
  const tOnboarding = useTranslations("onboarding");

  const detail = useWorkerDetail(workerId);
  const docs = useWorkerDocs(workerId);
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
  const terminate = useTerminateContract("worker");
  const upload = useUpload("contract-sources");

  /**
   * One key per renewal attempt, reused if that attempt is retried — a fresh key
   * would make a retry author a second contract, which is what the header prevents.
   */
  const renewKey = useRef<string | null>(null);
  const [renewing, setRenewing] = useState(false);

  const worker = detail.data;

  /** This worker's newest contract. The admin list is unfiltered, so select here. */
  const contract = useMemo<ContractSummary | null>(() => {
    const mine = (contracts.data ?? [])
      .filter((c) => c.workerId === workerId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
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

  const mutationError =
    createContract.error ??
    updateDraft.error ??
    send.error ??
    recall.error ??
    renew.error ??
    terminate.error ??
    upload.error ??
    null;

  const errorMessage = mutationError
    ? isPermissionDenied(mutationError)
      ? tOnboarding("permissionDenied")
      : tOnboarding(
          `apiErrors.${describeApiError(mutationError)?.labelKey ?? "unknown"}`,
        )
    : null;

  if (detail.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-9 w-64 rounded-md" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <div className="grid gap-6 lg:grid-cols-[7fr_3fr]">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  if (detail.error || !worker) {
    return (
      <p className="text-sm text-destructive">
        {detail.error && isPermissionDenied(detail.error)
          ? tOnboarding("permissionDenied")
          : tOnboarding(
              `apiErrors.${describeApiError(detail.error)?.labelKey ?? "subjectNotFound"}`,
            )}
      </p>
    );
  }

  async function saveDraft(values: ContractFormValues, file: File | null) {
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

    // A draft that came back for revision is edited in place, not authored again.
    if (contract && contract.phase === "Draft") {
      await updateDraft.mutateAsync({ contractId: contract.id, body });
      return;
    }
    await createContract.mutateAsync({ workerId, body });
  }

  const name = worker.fullName ?? workerId.slice(0, 8);

  return (
    <SubjectDetail
      backHref="/dashboard/worker-documents"
      backLabel={t("backToWorkerDocs")}
      name={name}
      contact={worker.phoneNumber ?? worker.email ?? null}
      status={worker.onboardingStatus}
      step={deriveStep(worker.onboardingStatus, contract?.phase ?? null)}
      contract={
        <ContractPanel
          variant="worker"
          status={worker.onboardingStatus}
          subjectName={name}
          subjectContact={worker.phoneNumber ?? worker.email ?? null}
          canAuthor={canAuthorContract(worker.onboardingStatus) || renewing}
          contract={renewing ? null : contract}
          locale={locale}
          saving={
            createContract.isPending || updateDraft.isPending || renew.isPending || upload.isPending
          }
          sending={send.isPending}
          terminating={terminate.isPending}
          error={errorMessage}
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
      }
      documents={
        <div className="flex flex-col gap-6">
          <IdentityPanel identity={worker.identity} locale={locale} />
          <div className="border-t border-border pt-4">
            <DocumentsPanel
              docs={docs.data ?? []}
              isLoading={docs.isLoading}
              locale={locale}
              status={worker.onboardingStatus}
              canDecideAccount={canDecide(worker.onboardingStatus)}
              onApproveDoc={(docId) => approveDoc.mutate(docId)}
              onRejectDoc={(docId, reason) => rejectDoc.mutate({ docId, reason })}
              onApproveAccount={() => approveAccount.mutate()}
              onRejectAccount={(reason) => rejectAccount.mutate(reason)}
              docBusy={approveDoc.isPending || rejectDoc.isPending}
              accountBusy={approveAccount.isPending || rejectAccount.isPending}
              accountRejectReason={worker.onboardingRejectReason}
            />
          </div>
        </div>
      }
    />
  );
}
