"use client";

import { useTranslations } from "next-intl";
import { DocTable } from "@/components/workers/doc-table";
import {
  useApproveWorkerDoc,
  useRejectWorkerDoc,
  useWorkerDocs,
} from "@/hooks/use-worker-docs";
import { describeApiError, isPermissionDenied } from "@/lib/onboarding/errors";

interface Props {
  workerId: string;
}

/**
 * The worker mirror of `components/kyc/kyc-doc-review.tsx`: fetches one worker's
 * documents and wires the per-document approve/reject mutations into the shared
 * `DocTable`. Rendered inline under an expanded row so the worker Docs screen
 * behaves like the owner one instead of navigating away to the worker detail page.
 *
 * Interim by design — Phase 1's Docs workspace replaces both screens with a
 * dedicated detail route. Keep this thin.
 */
export function WorkerDocReview({ workerId }: Props) {
  const tOnboarding = useTranslations("onboarding");
  const { data: docs = [], isLoading, error } = useWorkerDocs(workerId);
  const approve = useApproveWorkerDoc(workerId);
  const reject = useRejectWorkerDoc(workerId);

  if (error) {
    const info = describeApiError(error);
    return (
      <div className="px-4 py-6 text-sm text-destructive">
        {isPermissionDenied(error)
          ? tOnboarding("permissionDenied")
          : tOnboarding(`apiErrors.${info?.labelKey ?? "unknown"}`)}
      </div>
    );
  }

  return (
    <div className="p-4">
      <DocTable
        docs={docs}
        isLoading={isLoading}
        onApprove={(docId) => approve.mutate(docId)}
        onReject={(docId, reason) => reject.mutate({ docId, reason })}
        isApproving={approve.isPending}
        isRejecting={reject.isPending}
      />
    </div>
  );
}
