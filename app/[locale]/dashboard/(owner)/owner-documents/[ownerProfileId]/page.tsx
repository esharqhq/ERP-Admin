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
import { useUpload } from "@/hooks/use-upload";
import { newIdempotencyKey } from "@/lib/services/contract.service";
import { canAuthorContract, canDecide } from "@/lib/onboarding/status";
import { describeApiError, isPermissionDenied } from "@/lib/onboarding/errors";

export default function OwnerDocsDetailPage() {
  const params = useParams<{ ownerProfileId: string }>();
  const ownerProfileId = params.ownerProfileId;
  const locale = useLocale();
  const t = useTranslations("docsWorkspace");
  const tOnboarding = useTranslations("onboarding");

  const profile = useKycProfile(ownerProfileId, true);
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
  const terminate = useTerminateContract("owner");
  const upload = useUpload("contract-sources");

  const renewKey = useRef<string | null>(null);
  const [renewing, setRenewing] = useState(false);

  const owner = profile.data;
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
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
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
        }
      : null;
  }, [contracts.data, ownerUserId]);

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

  if (profile.isLoading) {
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

  if (profile.error || !owner) {
    return (
      <p className="text-sm text-destructive">
        {profile.error && isPermissionDenied(profile.error)
          ? tOnboarding("permissionDenied")
          : tOnboarding(
              `apiErrors.${describeApiError(profile.error)?.labelKey ?? "subjectNotFound"}`,
            )}
      </p>
    );
  }

  async function saveDraft(values: ContractFormValues, file: File | null) {
    if (!ownerUserId) return;
    const fileUrl = file ? await upload.mutateAsync(file) : "";
    const body = {
      eligibleFrom: toUtcIso(values.eligibleFrom),
      eligibleTo: toUtcIso(values.eligibleTo, true),
      fileName: file?.name ?? "",
      fileUrl,
      // Owner-only terms — these are what fill the generated PDF's clause tokens.
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
  }

  const name = owner.identity?.firstName
    ? [owner.identity.firstName, owner.identity.lastName].filter(Boolean).join(" ")
    : ownerProfileId.slice(0, 8);

  return (
    <SubjectDetail
      backHref="/dashboard/owner-documents"
      backLabel={t("backToOwnerDocs")}
      name={name}
      contact={owner.identity?.passportNumber ?? null}
      status={owner.onboardingStatus}
      step={deriveStep(owner.onboardingStatus, contract?.phase ?? null)}
      contract={
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
          <IdentityPanel
            identity={owner.identity}
            company={owner.company}
            locale={locale}
          />
          <div className="border-t border-border pt-4">
            <DocumentsPanel
              docs={owner.documents ?? []}
              isLoading={false}
              locale={locale}
              status={owner.onboardingStatus}
              canDecideAccount={canDecide(owner.onboardingStatus)}
              onApproveDoc={(docId) => approveDoc.mutate(docId)}
              onRejectDoc={(docId, reason) => rejectDoc.mutate({ docId, reason })}
              onApproveAccount={() => approveAccount.mutate(ownerProfileId)}
              onRejectAccount={(reason) =>
                rejectAccount.mutate({ ownerProfileId, reason })
              }
              docBusy={approveDoc.isPending || rejectDoc.isPending}
              accountBusy={approveAccount.isPending || rejectAccount.isPending}
              accountRejectReason={owner.onboardingRejectReason}
            />
          </div>
        </div>
      }
    />
  );
}
